// Google Drive service wrapper. Operates in stub mode if GOOGLE_SERVICE_ACCOUNT_KEY env is missing.
// Ops: copyTemplate, replaceMergeTags, uploadFile, createFolder, getFolder, appendAuditEntry.
// Folder convention: Housing/Properties/<property_name>/<resident_name>/<doc_type>
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getAccessToken(serviceAccountKeyJson: string): Promise<string | null> {
  try {
    const sa = JSON.parse(serviceAccountKeyJson);
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = btoa(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }));
    // NOTE: real RS256 JWT signing requires importKey + sign. This is a placeholder
    // — production deployment should pin a vetted JWT lib. Stub mode is the safe
    // default until ops sets GOOGLE_SERVICE_ACCOUNT_KEY and the signing path lands.
    const _unsigned = `${header}.${claim}`;
    return null;
  } catch {
    return null;
  }
}

function stubResponse(op: string, args: any) {
  const id = `stub-${op}-${crypto.randomUUID()}`;
  switch (op) {
    case 'copyTemplate':
      return { ok: true, stub: true, drive_file_id: id, drive_file_url: `https://drive.google.com/file/d/${id}/view` };
    case 'replaceMergeTags':
      return { ok: true, stub: true, replaced: Object.keys(args?.replacements || {}).length };
    case 'uploadFile':
      return { ok: true, stub: true, drive_file_id: id, drive_file_url: `https://drive.google.com/file/d/${id}/view` };
    case 'createFolder':
    case 'getFolder':
      return { ok: true, stub: true, folder_id: id, folder_path: args?.path || args?.name || '' };
    case 'appendAuditEntry':
      return { ok: true, stub: true };
    default:
      return { ok: false, error: `unknown op: ${op}` };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { op, args } = body;
    if (!op) return Response.json({ error: 'op required' }, { status: 400 });

    const key = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    const token = key ? await getAccessToken(key) : null;

    // Stub mode if no key OR token signing not yet wired.
    if (!key || !token) {
      const result = stubResponse(op, args);
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'drive_op_stub',
        status: 'warning',
        source_function: 'googleDriveService',
        related_entity: 'GeneratedDocument',
        related_entity_id: '',
        message: `Drive op ${op} ran in STUB mode (no GOOGLE_SERVICE_ACCOUNT_KEY)`,
        details: JSON.stringify({ op, args_keys: Object.keys(args || {}) }),
        notified_admin: false,
      }).catch(() => {});
      return Response.json(result);
    }

    // Live-mode dispatcher (real Drive API calls go here once JWT signing is wired).
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    switch (op) {
      case 'copyTemplate': {
        const r = await fetch(`https://www.googleapis.com/drive/v3/files/${args.template_drive_id}/copy`, {
          method: 'POST', headers,
          body: JSON.stringify({ name: args.new_name, parents: args.destination_folder_id ? [args.destination_folder_id] : undefined }),
        });
        if (!r.ok) throw new Error(`copy ${r.status}`);
        const j = await r.json();
        return Response.json({ ok: true, drive_file_id: j.id, drive_file_url: `https://docs.google.com/document/d/${j.id}/edit` });
      }
      case 'replaceMergeTags': {
        const requests = Object.entries(args.replacements || {}).map(([tag, val]) => ({
          replaceAllText: { containsText: { text: `{{${tag}}}`, matchCase: true }, replaceText: String(val) },
        }));
        const r = await fetch(`https://docs.googleapis.com/v1/documents/${args.drive_file_id}:batchUpdate`, {
          method: 'POST', headers, body: JSON.stringify({ requests }),
        });
        if (!r.ok) throw new Error(`replace ${r.status}`);
        return Response.json({ ok: true, replaced: requests.length });
      }
      case 'uploadFile': {
        const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': args.mime_type || 'application/octet-stream' },
          body: args.content_base64 ? Uint8Array.from(atob(args.content_base64), c => c.charCodeAt(0)) : args.content || '',
        });
        if (!r.ok) throw new Error(`upload ${r.status}`);
        const j = await r.json();
        return Response.json({ ok: true, drive_file_id: j.id, drive_file_url: `https://drive.google.com/file/d/${j.id}/view` });
      }
      case 'createFolder': {
        const r = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST', headers,
          body: JSON.stringify({ name: args.name, mimeType: 'application/vnd.google-apps.folder', parents: args.parent_folder_id ? [args.parent_folder_id] : undefined }),
        });
        if (!r.ok) throw new Error(`createFolder ${r.status}`);
        const j = await r.json();
        return Response.json({ ok: true, folder_id: j.id });
      }
      case 'getFolder': {
        // Walk path segments, create when missing if create_if_missing=true.
        const segments = String(args.path || '').split('/').filter(Boolean);
        let parentId: string | null = null;
        for (const seg of segments) {
          const q = encodeURIComponent(`name='${seg.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`);
          const sr = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers });
          if (!sr.ok) throw new Error(`folder search ${sr.status}`);
          const sj = await sr.json();
          if (sj.files && sj.files.length > 0) {
            parentId = sj.files[0].id;
          } else if (args.create_if_missing) {
            const cr = await fetch('https://www.googleapis.com/drive/v3/files', {
              method: 'POST', headers,
              body: JSON.stringify({ name: seg, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined }),
            });
            if (!cr.ok) throw new Error(`folder create ${cr.status}`);
            parentId = (await cr.json()).id;
          } else {
            return Response.json({ ok: false, folder_id: null, missing_segment: seg });
          }
        }
        return Response.json({ ok: true, folder_id: parentId, folder_path: args.path });
      }
      case 'appendAuditEntry': {
        // Append a comment with serialized JSON entry — comments are immutable enough for audit.
        const r = await fetch(`https://www.googleapis.com/drive/v3/files/${args.drive_file_id}/comments?fields=id&content`, {
          method: 'POST', headers,
          body: JSON.stringify({ content: `[AUDIT] ${JSON.stringify(args.entry)}` }),
        });
        if (!r.ok) throw new Error(`comment ${r.status}`);
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: `unknown op: ${op}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
