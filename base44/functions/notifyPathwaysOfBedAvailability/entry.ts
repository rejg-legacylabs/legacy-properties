// OUTBOUND: send a digest of currently available beds to Pathways.
// Triggered when a bed transitions to/from available, or on a schedule.
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

    const beds = await base44.asServiceRole.entities.Bed.list();
    const available = beds.filter((b: any) => b.bed_status === 'available' && b.status === 'active');

    // Group by property
    const byProperty: Record<string, any> = {};
    for (const b of available) {
      const key = b.site_id || 'unknown';
      if (!byProperty[key]) byProperty[key] = { property_id: key, property_name: b.site_name || '', beds: [] };
      byProperty[key].beds.push({
        bed_id: b.id,
        bed_label: b.bed_label,
        room_id: b.room_id,
        room_name: b.room_name,
        bed_type: b.bed_type,
        restriction_tags: b.restriction_tags || '',
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const idem = `bed-avail-digest-${today}-${available.length}`;
    const payload = {
      generated_at: new Date().toISOString(),
      total_available: available.length,
      properties: Object.values(byProperty),
      idempotency_key: idem,
    };

    const baseUrl = await resolveBaseUrl(base44);
    const secret = Deno.env.get('HOUSING_OUTBOUND_SECRET');

    if (!baseUrl || !secret) {
      await base44.asServiceRole.entities.OutboundIntegrationQueue.create({
        target_app: 'pathways',
        endpoint_path: 'receiveBedAvailabilityDigest',
        payload: JSON.stringify(payload),
        status: 'pending',
        attempts: 0,
        idempotency_key: idem,
        created_at: new Date().toISOString(),
      }).catch(() => {});
      return Response.json({ ok: true, queued: true, total_available: available.length });
    }

    try {
      const url = `${baseUrl.replace(/\/$/, '')}/functions/receiveBedAvailabilityDigest`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-housing-secret': secret },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Pathways responded ${res.status}`);

      const stamp = new Date().toISOString();
      for (const b of available) {
        try { await base44.asServiceRole.entities.Bed.update(b.id, { last_synced_to_pathways_at: stamp, sync_status_pathways: 'synced' }); } catch (_e) { /* skip */ }
      }

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'pathways_bed_digest_success',
        status: 'success',
        source_function: 'notifyPathwaysOfBedAvailability',
        related_entity: 'Bed',
        related_entity_id: '',
        message: `Pushed ${available.length} available beds to Pathways`,
        details: JSON.stringify({ idem }),
        notified_admin: false,
      }).catch(() => {});

      return Response.json({ ok: true, queued: false, total_available: available.length });
    } catch (httpErr) {
      await base44.asServiceRole.entities.OutboundIntegrationQueue.create({
        target_app: 'pathways',
        endpoint_path: 'receiveBedAvailabilityDigest',
        payload: JSON.stringify(payload),
        status: 'pending',
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
        last_error: httpErr.message,
        idempotency_key: idem,
        created_at: new Date().toISOString(),
      }).catch(() => {});
      return Response.json({ ok: true, queued: true, error: httpErr.message });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
