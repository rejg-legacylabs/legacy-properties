// Generate a document by copying a Drive template, replacing merge tags, and persisting.
// Mirrors the Pathways shape so callers/contracts are symmetric.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function callDrive(req: Request, op: string, args: any) {
  const base = req.url.split('/functions/')[0];
  const res = await fetch(`${base}/functions/googleDriveService`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, args }),
  });
  if (!res.ok) throw new Error(`googleDriveService ${op} failed: ${res.status}`);
  return res.json();
}

function interpolate(map: Record<string, string>, values: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [tag, path] of Object.entries(map || {})) {
    let v: any = values;
    for (const seg of String(path).split('.')) {
      v = v ? v[seg] : undefined;
    }
    out[tag] = v == null ? '' : String(v);
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'housing_admin', 'housing_manager', 'housing_staff'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { template_id, source_entity_type, source_entity_id, extra_values } = body;
    if (!template_id || !source_entity_type || !source_entity_id) {
      return Response.json({ error: 'template_id, source_entity_type, source_entity_id required' }, { status: 400 });
    }

    const template = await base44.asServiceRole.entities.DocumentTemplate.get(template_id);
    if (!template || !template.enabled) return Response.json({ error: 'Template not found or disabled' }, { status: 404 });

    // Load source entity
    const sourceEntity = await base44.asServiceRole.entities[source_entity_type].get(source_entity_id);
    if (!sourceEntity) return Response.json({ error: 'Source entity not found' }, { status: 404 });

    // Resolve resident + property for folder pathing
    let resident: any = null, property: any = null;
    if (source_entity_type === 'HousingResident') {
      resident = sourceEntity;
      if (resident.site_id) { try { property = await base44.asServiceRole.entities.Property.get(resident.site_id); } catch (_e) { /* skip */ } }
    } else if (sourceEntity.resident_id) {
      try { resident = await base44.asServiceRole.entities.HousingResident.get(sourceEntity.resident_id); } catch (_e) { /* skip */ }
      if (resident?.site_id) { try { property = await base44.asServiceRole.entities.Property.get(resident.site_id); } catch (_e) { /* skip */ } }
    } else if (sourceEntity.property_id) {
      try { property = await base44.asServiceRole.entities.Property.get(sourceEntity.property_id); } catch (_e) { /* skip */ }
    }

    let mapping: Record<string, string> = {};
    try { mapping = JSON.parse(template.mapping_json || '{}'); } catch { mapping = {}; }

    const mergeValues = interpolate(mapping, {
      source: sourceEntity,
      resident,
      property,
      extra: extra_values || {},
      now: new Date().toISOString(),
    });

    const propertyName = property?.property_name || 'Unassigned';
    const residentName = resident ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim() : 'NA';
    const folderPath = `Housing/Properties/${propertyName}/${residentName}/${template.document_type}`;

    const folder = await callDrive(req, 'getFolder', { path: folderPath, create_if_missing: true });
    const copy = await callDrive(req, 'copyTemplate', {
      template_drive_id: template.drive_template_id,
      destination_folder_id: folder.folder_id,
      new_name: `${template.template_name} - ${residentName} - ${new Date().toISOString().split('T')[0]}`,
    });
    await callDrive(req, 'replaceMergeTags', { drive_file_id: copy.drive_file_id, replacements: mergeValues });

    const generated = await base44.asServiceRole.entities.GeneratedDocument.create({
      template_id,
      source_entity_type,
      source_entity_id,
      global_resident_id: resident?.pathways_global_resident_id || resident?.external_referral_id || '',
      generated_by: user.email,
      drive_file_id: copy.drive_file_id,
      drive_file_url: copy.drive_file_url,
      drive_folder_id: folder.folder_id,
      signature_status: 'unsigned',
      audit_chain: JSON.stringify([
        { ts: new Date().toISOString(), actor: user.email, action: 'generated', details: { template_id, drive_file_id: copy.drive_file_id } },
      ]),
    });

    await callDrive(req, 'appendAuditEntry', {
      drive_file_id: copy.drive_file_id,
      entry: { ts: new Date().toISOString(), actor: user.email, action: 'generated', generated_document_id: generated.id },
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'document_generated',
      status: 'success',
      source_function: 'generateDocumentFromTemplate',
      related_entity: 'GeneratedDocument',
      related_entity_id: generated.id,
      message: `Generated ${template.template_name} for ${residentName}`,
      details: JSON.stringify({ template_id, drive_file_id: copy.drive_file_id }),
      notified_admin: false,
    }).catch(() => {});

    return Response.json({
      ok: true,
      generated_document_id: generated.id,
      drive_file_id: copy.drive_file_id,
      drive_file_url: copy.drive_file_url,
      drive_folder_id: folder.folder_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
