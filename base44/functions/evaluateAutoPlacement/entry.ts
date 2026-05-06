// HELPER: given an applicant, suggest a best-fit available bed.
// Returns suggestion only — placement requires human approval (per ops policy).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { applicant_id, target_property_id, gender, special_needs } = body;

    if (!applicant_id) {
      return Response.json({ error: 'applicant_id required' }, { status: 400 });
    }

    // Pull available beds (asServiceRole so internal callers always get full set)
    const beds = await base44.asServiceRole.entities.Bed.filter({ bed_status: 'available', status: 'active' });
    if (!beds || beds.length === 0) {
      return Response.json({ ok: true, suggested_bed_id: null, reason: 'no_available_beds' });
    }

    // Pull properties for gender/demographic match
    const propertyIds = Array.from(new Set(beds.map(b => b.site_id).filter(Boolean)));
    const properties = [];
    for (const pid of propertyIds) {
      try {
        const p = await base44.asServiceRole.entities.Property.get(pid);
        if (p) properties.push(p);
      } catch (_e) { /* skip */ }
    }
    const propById = Object.fromEntries(properties.map(p => [p.id, p]));

    // Score function: lower is better
    const score = (bed) => {
      let s = 0;
      const prop = propById[bed.site_id];

      // Hard preference: requested property
      if (target_property_id && bed.site_id === target_property_id) s -= 100;

      // Gender restriction match
      if (gender && prop && prop.gender_restriction) {
        const gr = String(prop.gender_restriction).toLowerCase();
        if (gr === 'none' || gr === 'any' || gr === gender.toLowerCase()) {
          s -= 10;
        } else {
          s += 1000; // disqualify hard mismatch
        }
      }

      // Special needs / restriction tags overlap
      if (special_needs && bed.restriction_tags) {
        const needs = String(special_needs).toLowerCase().split(/[,;]/).map(x => x.trim()).filter(Boolean);
        const tags = String(bed.restriction_tags).toLowerCase().split(/[,;]/).map(x => x.trim()).filter(Boolean);
        const overlap = needs.filter(n => tags.includes(n)).length;
        s -= overlap * 5;
      }

      return s;
    };

    const ranked = beds
      .map(b => ({ bed: b, score: score(b) }))
      .filter(x => x.score < 1000)
      .sort((a, b) => a.score - b.score);

    if (ranked.length === 0) {
      return Response.json({ ok: true, suggested_bed_id: null, reason: 'no_match_after_filters' });
    }

    const best = ranked[0].bed;
    return Response.json({
      ok: true,
      suggested_bed_id: best.id,
      suggested_bed_label: best.bed_label,
      suggested_property_id: best.site_id,
      suggested_property_name: best.site_name,
      score: ranked[0].score,
      candidates_considered: ranked.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
