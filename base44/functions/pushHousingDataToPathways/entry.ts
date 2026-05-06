// OUTBOUND: nightly delta push of bed availability, placements, discharges to Pathways.
// Idempotent by (date, entity_id). Replaces / extends exportHousingData for cross-app sync.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function resolveBaseUrl(base44: any): Promise<string | null> {
  try {
    const cfgs = await base44.asServiceRole.entities.IntegrationConfig.filter({ app_name: 'pathways' });
    if (cfgs.length > 0 && cfgs[0].enabled && cfgs[0].base_url) return cfgs[0].base_url;
  } catch (_e) { /* fall through */ }
  return Deno.env.get('PATHWAYS_APP_BASE_URL') || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split('T')[0];
    const sinceParam = new URL(req.url).searchParams.get('since');
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [beds, placements, residents] = await Promise.all([
      base44.asServiceRole.entities.Bed.list(),
      base44.asServiceRole.entities.Placement.list(),
      base44.asServiceRole.entities.HousingResident.list(),
    ]);

    const recent = (d: any) => {
      try { return d?.updated_date && new Date(d.updated_date) >= since; } catch { return false; }
    };

    const bedsDelta = beds.filter(recent).map((b: any) => ({
      bed_id: b.id,
      property_id: b.site_id,
      bed_label: b.bed_label,
      bed_status: b.bed_status,
      restriction_tags: b.restriction_tags,
    }));

    const placementsDelta = placements.filter(recent).map((p: any) => ({
      placement_id: p.id,
      pathways_global_resident_id: p.pathways_global_resident_id,
      property_id: p.property_id,
      bed_id: p.bed_id,
      placement_status: p.placement_status,
      move_in_date: p.move_in_date,
      actual_move_out_date: p.actual_move_out_date,
    }));

    const dischargesDelta = residents
      .filter((r: any) => r.resident_status === 'discharged' || r.resident_status === 'exited')
      .filter(recent)
      .map((r: any) => ({
        resident_id: r.id,
        pathways_global_resident_id: r.pathways_global_resident_id,
        actual_exit_date: r.actual_exit_date,
        resident_status: r.resident_status,
      }));

    const idem = `housing-delta-${today}-${bedsDelta.length}-${placementsDelta.length}-${dischargesDelta.length}`;
    const payload = {
      generated_at: new Date().toISOString(),
      since: since.toISOString(),
      beds: bedsDelta,
      placements: placementsDelta,
      discharges: dischargesDelta,
      idempotency_key: idem,
    };

    const baseUrl = await resolveBaseUrl(base44);
    const secret = Deno.env.get('HOUSING_OUTBOUND_SECRET');

    if (!baseUrl || !secret) {
      await base44.asServiceRole.entities.OutboundIntegrationQueue.create({
        target_app: 'pathways',
        endpoint_path: 'receiveHousingDelta',
        payload: JSON.stringify(payload),
        status: 'pending',
        attempts: 0,
        idempotency_key: idem,
        created_at: new Date().toISOString(),
      }).catch(() => {});
      return Response.json({ ok: true, queued: true, counts: { beds: bedsDelta.length, placements: placementsDelta.length, discharges: dischargesDelta.length } });
    }

    try {
      const url = `${baseUrl.replace(/\/$/, '')}/functions/receiveHousingDelta`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-housing-secret': secret },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Pathways responded ${res.status}`);

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'pathways_delta_push_success',
        status: 'success',
        source_function: 'pushHousingDataToPathways',
        related_entity: '',
        related_entity_id: '',
        message: `Pushed delta to Pathways (b=${bedsDelta.length} p=${placementsDelta.length} d=${dischargesDelta.length})`,
        details: JSON.stringify({ idem }),
        notified_admin: false,
      }).catch(() => {});
      return Response.json({ ok: true, queued: false });
    } catch (httpErr) {
      await base44.asServiceRole.entities.OutboundIntegrationQueue.create({
        target_app: 'pathways',
        endpoint_path: 'receiveHousingDelta',
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
