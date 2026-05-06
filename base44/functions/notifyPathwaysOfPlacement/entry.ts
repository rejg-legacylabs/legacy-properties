// OUTBOUND: notify Pathways that a placement was created/updated, or a bed status changed.
// Resilient: failure NEVER throws — falls back to OutboundIntegrationQueue for retry.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function resolveBaseUrl(base44: any): Promise<string | null> {
  try {
    const cfgs = await base44.asServiceRole.entities.IntegrationConfig.filter({ app_name: 'pathways' });
    if (cfgs.length > 0 && cfgs[0].enabled && cfgs[0].base_url) return cfgs[0].base_url;
  } catch (_e) { /* fall through */ }
  return Deno.env.get('PATHWAYS_APP_BASE_URL') || null;
}

Deno.serve(async (req) => {
  let base44: any;
  try {
    base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      global_resident_id,
      placement_id,
      bed_id,
      property_name,
      status,
      effective_date,
      idempotency_key,
    } = body;

    const idem = idempotency_key || `placement-${placement_id || bed_id}-${status}-${effective_date || new Date().toISOString().split('T')[0]}`;

    const baseUrl = await resolveBaseUrl(base44);
    const secret = Deno.env.get('HOUSING_OUTBOUND_SECRET');

    const payload = {
      global_resident_id,
      placement_id,
      bed_id,
      property_name,
      status,
      effective_date,
      idempotency_key: idem,
    };

    // If we have no peer URL configured, queue it and return success.
    if (!baseUrl || !secret) {
      await base44.asServiceRole.entities.OutboundIntegrationQueue.create({
        target_app: 'pathways',
        endpoint_path: 'receiveHousingPlacementUpdate',
        payload: JSON.stringify(payload),
        status: 'pending',
        attempts: 0,
        idempotency_key: idem,
        global_resident_id: global_resident_id || '',
        created_at: new Date().toISOString(),
      }).catch(() => {});
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'pathways_notify_queued_no_config',
        status: 'warning',
        source_function: 'notifyPathwaysOfPlacement',
        related_entity: 'Placement',
        related_entity_id: placement_id || '',
        message: 'Pathways base_url or secret not configured — placement queued for retry',
        details: JSON.stringify({ idem }),
        notified_admin: false,
      }).catch(() => {});
      return Response.json({ ok: true, queued: true });
    }

    try {
      const url = `${baseUrl.replace(/\/$/, '')}/functions/receiveHousingPlacementUpdate`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-housing-secret': secret,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Pathways responded ${res.status}: ${await res.text().catch(() => '')}`);
      }

      const respJson = await res.json().catch(() => ({}));

      // Stamp Placement with sync timestamp + pathways id (if returned)
      if (placement_id) {
        try {
          await base44.asServiceRole.entities.Placement.update(placement_id, {
            last_synced_to_pathways_at: new Date().toISOString(),
            pathways_global_resident_id: global_resident_id || undefined,
            pathways_placement_id: respJson.pathways_placement_id || undefined,
          });
        } catch (_e) { /* non-fatal */ }
      }

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'pathways_notify_success',
        status: 'success',
        source_function: 'notifyPathwaysOfPlacement',
        related_entity: 'Placement',
        related_entity_id: placement_id || '',
        message: `Pathways notified of placement (${status})`,
        details: JSON.stringify({ idem }),
        notified_admin: false,
      }).catch(() => {});

      return Response.json({ ok: true, queued: false });
    } catch (httpErr) {
      // Queue for retry
      await base44.asServiceRole.entities.OutboundIntegrationQueue.create({
        target_app: 'pathways',
        endpoint_path: 'receiveHousingPlacementUpdate',
        payload: JSON.stringify(payload),
        status: 'pending',
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
        last_error: httpErr.message,
        idempotency_key: idem,
        global_resident_id: global_resident_id || '',
        created_at: new Date().toISOString(),
      }).catch(() => {});
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'pathways_notify_failed_queued',
        status: 'warning',
        source_function: 'notifyPathwaysOfPlacement',
        related_entity: 'Placement',
        related_entity_id: placement_id || '',
        message: `Pathways notify failed; queued for retry: ${httpErr.message}`,
        details: JSON.stringify({ idem, error: httpErr.message }),
        notified_admin: false,
      }).catch(() => {});
      return Response.json({ ok: true, queued: true, error: httpErr.message });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
