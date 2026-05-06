import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ALLOWED_ROLES = ['admin', 'housing_admin', 'housing_manager', 'housing_staff', 'turnkey_operator'];
    if (!ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { resident_id, property_id, room_id, bed_id, move_in_date } = body;

    if (!resident_id || !property_id || !bed_id) {
      return Response.json({ error: 'resident_id, property_id, and bed_id are required' }, { status: 400 });
    }

    // House-scope enforcement for turnkey operators
    if (user.role === 'turnkey_operator') {
      const clients = await base44.asServiceRole.entities.TurnkeyClient.list();
      const myClient = clients.find(c => {
        const emails = (c.operator_user_emails || '').split(',').map(e => e.trim().toLowerCase());
        return emails.includes(user.email.toLowerCase());
      });
      if (!myClient) return Response.json({ error: 'No turnkey client record found for your account' }, { status: 403 });

      const authorizedIds = [];
      if (myClient.property_ids) myClient.property_ids.split(',').map(s => s.trim()).filter(Boolean).forEach(id => authorizedIds.push(id));
      if (myClient.property_id) authorizedIds.push(myClient.property_id);

      if (!authorizedIds.includes(property_id)) {
        return Response.json({ error: 'You are not authorized to assign beds in this property' }, { status: 403 });
      }
    }

    const bed = await base44.asServiceRole.entities.Bed.get(bed_id);
    if (!bed) return Response.json({ error: 'Bed not found' }, { status: 404 });
    if (bed.bed_status !== 'available') {
      return Response.json({ error: `Bed is not available (status: ${bed.bed_status})` }, { status: 409 });
    }

    const resident = await base44.asServiceRole.entities.HousingResident.get(resident_id);
    if (!resident) return Response.json({ error: 'Resident not found' }, { status: 404 });

    const property = await base44.asServiceRole.entities.Property.get(property_id);
    const room = room_id ? await base44.asServiceRole.entities.Room.get(room_id) : null;
    const today = move_in_date || new Date().toISOString().split('T')[0];

    // End any existing active occupancy for this resident
    const existing = await base44.asServiceRole.entities.OccupancyRecord.filter({ housing_resident_id: resident_id, occupancy_status: 'active' });
    for (const occ of existing) {
      await base44.asServiceRole.entities.OccupancyRecord.update(occ.id, { occupancy_status: 'ended', end_date: today });
      if (occ.bed_id) {
        await base44.asServiceRole.entities.Bed.update(occ.bed_id, { bed_status: 'needs_cleaning', current_resident_id: '', cleaning_started_at: new Date().toISOString() });
      }
    }

    await base44.asServiceRole.entities.HousingResident.update(resident_id, {
      site_id: property_id,
      site_name: property?.property_name || '',
      room_id: room_id || '',
      room_name: room?.room_name || bed.room_name || '',
      bed_id,
      bed_label: bed.bed_label,
      move_in_date: today,
      resident_status: 'active',
    });

    await base44.asServiceRole.entities.Bed.update(bed_id, {
      bed_status: 'occupied',
      current_resident_id: resident_id,
    });

    await base44.asServiceRole.entities.OccupancyRecord.create({
      housing_resident_id: resident_id,
      resident_name: `${resident.first_name} ${resident.last_name}`,
      site_id: property_id,
      site_name: property?.property_name || '',
      room_id: room_id || bed.room_id || '',
      room_name: room?.room_name || bed.room_name || '',
      bed_id,
      bed_label: bed.bed_label,
      start_date: today,
      occupancy_status: 'active',
    });

    // ── Pathways Hub Webhook (legacy direct webhook) ──────────────────────────
    // Fire-and-forget: webhook failure must NEVER fail the bed assignment
    (async () => {
      const PATHWAYS_WEBHOOK_URL = 'https://api.base44.com/api/apps/69da82da88110c360468da13/functions/legacyBedAssignedWebhook';
      const LEGACY_SECRET = 'HOH-LEGACY-2026-X9mK#vPw$qR7nTz';

      try {
        const webhookPayload = {
          external_referral_id: resident.external_referral_id || null,
          house_name: property?.property_name || '',
          room_name: room?.room_name || bed.room_name || '',
          bed_label: bed.bed_label,
          move_in_date: today,
          provider_notes: 'Placement confirmed by Legacy Properties operations team',
          legacy_secret: LEGACY_SECRET,
        };

        const webhookRes = await fetch(PATHWAYS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookRes.ok) {
          const errBody = await webhookRes.text();
          throw new Error(`Webhook responded with ${webhookRes.status}: ${errBody}`);
        }

        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'pathways_webhook_fired',
          status: 'success',
          source_function: 'assignResidentToBed',
          related_entity: 'HousingResident',
          related_entity_id: resident_id,
          message: `Pathways Hub webhook delivered for ${resident.first_name} ${resident.last_name} → ${bed.bed_label}`,
          details: JSON.stringify({ webhookPayload, http_status: webhookRes.status }),
          notified_admin: false,
        });

      } catch (webhookErr) {
        const errorDetails = JSON.stringify({
          error: webhookErr.message,
          resident_id,
          bed_id,
          property_id,
          move_in_date: today,
        });

        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'pathways_webhook_failed',
          status: 'failure',
          source_function: 'assignResidentToBed',
          related_entity: 'HousingResident',
          related_entity_id: resident_id,
          message: `Pathways Hub webhook FAILED for ${resident.first_name} ${resident.last_name} → ${bed.bed_label}: ${webhookErr.message}`,
          details: errorDetails,
          notified_admin: true,
        });

        try {
          const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
          for (const admin of adminUsers) {
            if (admin.email) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: admin.email,
                subject: '[ALERT] Pathways Hub Webhook Failed — Manual Follow-Up Required',
                body: `A bed assignment succeeded but the Pathways Hub webhook notification FAILED.\n\nResident: ${resident.first_name} ${resident.last_name}\nProperty: ${property?.property_name || property_id}\nBed: ${bed.bed_label}\nMove-in Date: ${today}\n\nError: ${webhookErr.message}\n\nPlease follow up manually to confirm placement in Pathways Hub.\n\nFull details logged in AuditLog.`,
              });
            }
          }
        } catch (emailErr) {
          console.error('Admin email notification failed:', emailErr.message);
        }
      }
    })();
    // ── End Pathways Hub Webhook ──────────────────────────────────────────────

    // ── New unified outbound (queued/retry-aware) — fire-and-forget ───────────
    (async () => {
      try {
        const base = req.url.split('/functions/')[0];
        await fetch(`${base}/functions/notifyPathwaysOfPlacement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            global_resident_id: resident.pathways_global_resident_id || resident.external_referral_id || '',
            placement_id: '',
            bed_id,
            property_name: property?.property_name || '',
            status: 'active',
            effective_date: today,
            idempotency_key: `assign-${resident_id}-${bed_id}-${today}`,
          }),
        });
      } catch (_e) { /* queued by callee — never throws */ }
    })();

    return Response.json({ success: true, message: `${resident.first_name} ${resident.last_name} assigned to ${bed.bed_label}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
