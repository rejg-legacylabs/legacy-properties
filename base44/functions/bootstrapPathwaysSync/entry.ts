// ADMIN UTILITY: backfill Pathways with current Beds, active Placements, and recent Discharges.
// Run once after deployment, or after extended Pathways downtime.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'housing_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toParam ? new Date(toParam) : new Date();

    const inRange = (d: any) => {
      try {
        const t = new Date(d?.updated_date || d?.created_date || 0).getTime();
        return t >= from.getTime() && t <= to.getTime();
      } catch { return false; }
    };

    const [beds, placements, residents] = await Promise.all([
      base44.asServiceRole.entities.Bed.list(),
      base44.asServiceRole.entities.Placement.list(),
      base44.asServiceRole.entities.HousingResident.list(),
    ]);

    const base = req.url.split('/functions/')[0];

    let queued = 0;

    // Bed availability snapshot
    try {
      await fetch(`${base}/functions/notifyPathwaysOfBedAvailability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'bootstrap' }),
      });
      queued++;
    } catch (_e) { /* swallow */ }

    // Active placements
    const activePlacements = placements.filter((p: any) => p.placement_status === 'active');
    for (const p of activePlacements) {
      const idem = `bootstrap-placement-${p.id}`;
      try {
        await fetch(`${base}/functions/notifyPathwaysOfPlacement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            global_resident_id: p.pathways_global_resident_id || '',
            placement_id: p.id,
            bed_id: p.bed_id,
            property_name: p.property_name,
            status: p.placement_status,
            effective_date: p.move_in_date,
            idempotency_key: idem,
          }),
        });
        queued++;
      } catch (_e) { /* swallow — will be queued by callee */ }
    }

    // Recent discharges in the date window
    const discharges = residents
      .filter((r: any) => r.resident_status === 'discharged' || r.resident_status === 'exited')
      .filter(inRange);
    for (const r of discharges) {
      const idem = `bootstrap-discharge-${r.id}`;
      try {
        await fetch(`${base}/functions/notifyPathwaysOfPlacement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            global_resident_id: r.pathways_global_resident_id || r.external_referral_id || '',
            placement_id: '',
            bed_id: r.bed_id || '',
            property_name: r.site_name || '',
            status: r.resident_status,
            effective_date: r.actual_exit_date,
            idempotency_key: idem,
          }),
        });
        queued++;
      } catch (_e) { /* swallow */ }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'bootstrap_pathways_sync',
      status: 'success',
      source_function: 'bootstrapPathwaysSync',
      related_entity: '',
      related_entity_id: '',
      message: `Bootstrap queued ${queued} outbound calls (beds=${beds.length}, active_placements=${activePlacements.length}, discharges=${discharges.length})`,
      details: JSON.stringify({ from: from.toISOString(), to: to.toISOString() }),
      notified_admin: false,
    }).catch(() => {});

    return Response.json({
      ok: true,
      queued,
      counts: {
        beds: beds.length,
        active_placements: activePlacements.length,
        discharges: discharges.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
