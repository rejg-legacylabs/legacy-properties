// INBOUND: external referral from Pathways (or partner). Idempotent.
// Auth: x-pathways-secret header must equal env PATHWAYS_INBOUND_SECRET.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  try {
    const base44 = createClientFromRequest(req);

    // ── 1. AuthN ──────────────────────────────────────────────────────────
    const expected = Deno.env.get('PATHWAYS_INBOUND_SECRET');
    const provided = req.headers.get('x-pathways-secret');
    if (!expected || !provided || expected !== provided) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.global_resident_id || !body.referral_data || !body.idempotency_key) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { global_resident_id, referral_data, idempotency_key } = body;
    const sourceApp = body.source_app || 'pathways';

    // ── 2. Idempotency check ──────────────────────────────────────────────
    const existingEvents = await base44.asServiceRole.entities.IncomingReferralEvent.filter({
      idempotency_key,
    });
    if (existingEvents.length > 0) {
      const existing = existingEvents[0];
      return Response.json({
        ok: true,
        duplicate: true,
        referral_id: existing.resulting_referral_id || null,
        message: 'Idempotent replay — returning existing referral',
      });
    }

    // ── 3. Upsert HousingApplicant by pathways_global_resident_id ─────────
    const nameParts = (referral_data.applicant_name || '').trim().split(/\s+/);
    const first_name = nameParts[0] || 'Unknown';
    const last_name = nameParts.slice(1).join(' ') || 'Unknown';

    let applicant;
    const existingApplicants = await base44.asServiceRole.entities.HousingApplicant.filter({
      pathways_global_resident_id: global_resident_id,
    });
    if (existingApplicants.length > 0) {
      applicant = await base44.asServiceRole.entities.HousingApplicant.update(existingApplicants[0].id, {
        first_name,
        last_name,
        phone: referral_data.phone || existingApplicants[0].phone,
        email: referral_data.email || existingApplicants[0].email,
        dob: referral_data.dob || existingApplicants[0].dob,
      });
    } else {
      applicant = await base44.asServiceRole.entities.HousingApplicant.create({
        first_name,
        last_name,
        phone: referral_data.phone || '',
        email: referral_data.email || '',
        dob: referral_data.dob || '',
        intake_status: 'pending',
        applicant_status: 'new',
        documents_status: 'incomplete',
        internal_notes: `Auto-created from ${sourceApp} referral. global_resident_id=${global_resident_id}`,
        pathways_global_resident_id: global_resident_id,
      });
    }

    // ── 4. Create Referral ───────────────────────────────────────────────
    const referral = await base44.asServiceRole.entities.Referral.create({
      external_referral_id: global_resident_id,
      pathways_global_resident_id: global_resident_id,
      source_app: sourceApp,
      applicant_first_name: first_name,
      applicant_last_name: last_name,
      applicant_dob: referral_data.dob || '',
      applicant_phone: referral_data.phone || '',
      applicant_email: referral_data.email || '',
      current_housing_situation: referral_data.current_status || '',
      priority_level: (referral_data.urgency === 'urgent' || referral_data.urgency === 'high') ? referral_data.urgency : 'medium',
      population_program_fit: referral_data.special_needs || '',
      requested_site: referral_data.target_property_id || '',
      partner_visible_notes: referral_data.notes || '',
      consent_status: 'obtained',
      referral_status: 'received',
      submitted_at: startedAt,
    });

    // ── 5. Suggest a bed (does NOT auto-place) ───────────────────────────
    let suggested_bed_id = null;
    let auto_placement = false;
    try {
      const evalRes = await fetch(`${req.url.split('/functions/')[0]}/functions/evaluateAutoPlacement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-call': '1',
        },
        body: JSON.stringify({
          applicant_id: applicant.id,
          target_property_id: referral_data.target_property_id || null,
          gender: referral_data.gender || null,
          special_needs: referral_data.special_needs || null,
        }),
      });
      if (evalRes.ok) {
        const ev = await evalRes.json();
        suggested_bed_id = ev.suggested_bed_id || null;
        auto_placement = !!ev.suggested_bed_id;
      }
    } catch (_e) {
      // suggestion failure is non-fatal
    }

    // ── 6. Audit + IncomingReferralEvent ─────────────────────────────────
    await base44.asServiceRole.entities.IncomingReferralEvent.create({
      source_app: sourceApp,
      external_referral_id: global_resident_id,
      payload: JSON.stringify(body),
      idempotency_key,
      status: 'processed',
      processed_at: new Date().toISOString(),
      resulting_referral_id: referral.id,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'inbound_referral_received',
      status: 'success',
      source_function: 'receiveExternalReferral',
      related_entity: 'Referral',
      related_entity_id: referral.id,
      message: `Inbound referral from ${sourceApp} for global_resident_id=${global_resident_id}`,
      details: JSON.stringify({ idempotency_key, applicant_id: applicant.id, suggested_bed_id }),
      notified_admin: false,
    });

    return Response.json({
      ok: true,
      duplicate: false,
      referral_id: referral.id,
      applicant_id: applicant.id,
      auto_placement,
      suggested_bed_id,
    });
  } catch (error) {
    // Best-effort error log; never throw past the boundary.
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'inbound_referral_error',
        status: 'failure',
        source_function: 'receiveExternalReferral',
        related_entity: 'Referral',
        related_entity_id: '',
        message: `Inbound referral failed: ${error.message}`,
        details: JSON.stringify({ error: error.message }),
        notified_admin: true,
      });
    } catch (_inner) {
      // swallow
    }
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
});
