// INBOUND from MRT: rider transport status update. Idempotent.
// Auth: x-mrt-secret header must equal env MRT_INBOUND_SECRET.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const expected = Deno.env.get('MRT_INBOUND_SECRET');
    const provided = req.headers.get('x-mrt-secret');
    if (!expected || !provided || expected !== provided) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.global_resident_id || !body.idempotency_key || !body.status) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { global_resident_id, trip_id, eta_minutes, status, idempotency_key } = body;

    // Idempotency via AuditLog.details (we use the unique IncomingReferralEvent table
    // for referral inbound; for MRT we key on AuditLog with a marker event_type).
    const priorLogs = await base44.asServiceRole.entities.AuditLog.filter({
      event_type: 'mrt_arrival_received',
    });
    const dup = priorLogs.find((l: any) => {
      try { return JSON.parse(l.details || '{}').idempotency_key === idempotency_key; } catch { return false; }
    });
    if (dup) return Response.json({ ok: true, duplicate: true });

    // Find resident by pathways_global_resident_id or external_referral_id
    let residents = await base44.asServiceRole.entities.HousingResident.filter({
      pathways_global_resident_id: global_resident_id,
    });
    if (residents.length === 0) {
      residents = await base44.asServiceRole.entities.HousingResident.filter({
        external_referral_id: global_resident_id,
      });
    }
    const resident = residents[0] || null;

    let bed: any = null;
    let property: any = null;
    if (resident && resident.bed_id) {
      try { bed = await base44.asServiceRole.entities.Bed.get(resident.bed_id); } catch (_e) { /* skip */ }
    }
    if (resident && resident.site_id) {
      try { property = await base44.asServiceRole.entities.Property.get(resident.site_id); } catch (_e) { /* skip */ }
    }

    // Annotate bed/placement notes
    if (bed) {
      const noteLine = `[MRT ${new Date().toISOString()}] trip=${trip_id || ''} status=${status}${eta_minutes != null ? ` ETA=${eta_minutes}m` : ''}`;
      const newNotes = `${(bed.notes || '').slice(-1500)}\n${noteLine}`.trim();
      try { await base44.asServiceRole.entities.Bed.update(bed.id, { notes: newNotes }); } catch (_e) { /* skip */ }
    }

    if (resident) {
      try {
        const placements = await base44.asServiceRole.entities.Placement.filter({ resident_id: resident.id, placement_status: 'active' });
        if (placements.length > 0) {
          const p = placements[0];
          const noteLine = `[MRT ${new Date().toISOString()}] trip=${trip_id || ''} status=${status}${eta_minutes != null ? ` ETA=${eta_minutes}m` : ''}`;
          await base44.asServiceRole.entities.Placement.update(p.id, {
            internal_notes: `${(p.internal_notes || '').slice(-1500)}\n${noteLine}`.trim(),
          });
        }
      } catch (_e) { /* skip */ }
    }

    // Email property manager if arrival imminent
    if ((status === 'en_route' && (eta_minutes != null && eta_minutes <= 15)) || status === 'arrived') {
      try {
        const recipients = new Set<string>();
        if (property?.manager_email) recipients.add(property.manager_email);
        const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'housing_manager' });
        for (const u of adminUsers) {
          if (u.email && (!property || u.site_id === property.id)) recipients.add(u.email);
        }
        for (const to of recipients) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to,
            subject: `[MRT] Resident ${status === 'arrived' ? 'arrived' : 'arriving'} at ${property?.property_name || 'property'}`,
            body: `Resident ${resident ? `${resident.first_name} ${resident.last_name}` : `(global_resident_id=${global_resident_id})`} status: ${status}${eta_minutes != null ? `, ETA ${eta_minutes} min` : ''}.\nTrip: ${trip_id || 'n/a'}\nBed: ${bed?.bed_label || 'unassigned'}`,
          });
        }
      } catch (_emailErr) { /* swallow — email is best-effort */ }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'mrt_arrival_received',
      status: 'success',
      source_function: 'receiveTransportArrivalNotice',
      related_entity: 'HousingResident',
      related_entity_id: resident?.id || '',
      message: `MRT ${status} for global_resident_id=${global_resident_id}`,
      details: JSON.stringify({ idempotency_key, trip_id, eta_minutes, status }),
      notified_admin: false,
    });

    return Response.json({ ok: true, duplicate: false, resident_id: resident?.id || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
