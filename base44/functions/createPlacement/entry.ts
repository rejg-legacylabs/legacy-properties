import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['housing_admin', 'housing_manager', 'housing_staff'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json();
    const {
      resident_id,
      resident_name,
      property_id,
      property_name,
      room_id,
      room_name,
      bed_id,
      bed_label,
      move_in_date,
      expected_move_out_date,
      placement_source,
      housing_model_type,
    } = payload;

    // Create Placement record
    const placement = await base44.entities.Placement.create({
      resident_id,
      resident_name,
      property_id,
      property_name,
      room_id,
      room_name,
      bed_id,
      bed_label,
      move_in_date,
      expected_move_out_date,
      placement_source: placement_source || 'direct',
      placement_status: 'active',
      housing_model_type,
      is_active: true,
    });

    // Update Bed status to occupied
    if (bed_id) {
      await base44.entities.Bed.update(bed_id, {
        bed_status: 'occupied',
        current_resident_id: resident_id,
      });
    }

    // Update HousingResident with assignment
    if (resident_id) {
      await base44.entities.HousingResident.update(resident_id, {
        room_id,
        room_name,
        bed_id,
        bed_label,
        site_id: property_id,
        site_name: property_name,
        move_in_date,
        expected_exit_date: expected_move_out_date,
        resident_status: 'active',
      });
    }

    // ── Pathways notification (fire-and-forget; never throws) ────────────
    (async () => {
      try {
        let global_resident_id = '';
        if (resident_id) {
          try {
            const r = await base44.asServiceRole.entities.HousingResident.get(resident_id);
            global_resident_id = r?.pathways_global_resident_id || r?.external_referral_id || '';
          } catch (_e) { /* skip */ }
        }
        const base = req.url.split('/functions/')[0];
        await fetch(`${base}/functions/notifyPathwaysOfPlacement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            global_resident_id,
            placement_id: placement.id,
            bed_id,
            property_name,
            status: 'active',
            effective_date: move_in_date,
            idempotency_key: `placement-create-${placement.id}`,
          }),
        });
      } catch (notifyErr) {
        try {
          await base44.asServiceRole.entities.AuditLog.create({
            event_type: 'pathways_notify_dispatch_failed',
            status: 'warning',
            source_function: 'createPlacement',
            related_entity: 'Placement',
            related_entity_id: placement.id,
            message: `notifyPathwaysOfPlacement dispatch failed (placement still created): ${notifyErr.message}`,
            details: JSON.stringify({ error: notifyErr.message }),
            notified_admin: false,
          });
        } catch (_inner) { /* swallow */ }
      }
    })();

    return Response.json({
      success: true,
      placement_id: placement.id,
      message: `Placement created for ${resident_name} in ${property_name}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
