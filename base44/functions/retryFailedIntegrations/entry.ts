// SCHEDULED: retry pending or failed-with-attempts<5 OutboundIntegrationQueue rows.
// Dead-letters after 5 attempts.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_ATTEMPTS = 5;

async function resolveBaseUrl(base44: any, app: string): Promise<string | null> {
  try {
    const cfgs = await base44.asServiceRole.entities.IntegrationConfig.filter({ app_name: app });
    if (cfgs.length > 0 && cfgs[0].enabled && cfgs[0].base_url) return cfgs[0].base_url;
  } catch (_e) { /* fall through */ }
  if (app === 'pathways') return Deno.env.get('PATHWAYS_APP_BASE_URL') || null;
  if (app === 'mrt') return Deno.env.get('MRT_APP_BASE_URL') || null;
  if (app === 'governance') return Deno.env.get('GOVERNANCE_APP_BASE_URL') || null;
  return null;
}

function headerFor(app: string): { name: string; value: string | undefined } {
  if (app === 'pathways') return { name: 'x-housing-secret', value: Deno.env.get('HOUSING_OUTBOUND_SECRET') };
  if (app === 'mrt') return { name: 'x-housing-secret', value: Deno.env.get('HOUSING_OUTBOUND_SECRET') };
  if (app === 'governance') return { name: 'x-housing-secret', value: Deno.env.get('HOUSING_OUTBOUND_SECRET') };
  return { name: 'x-housing-secret', value: Deno.env.get('HOUSING_OUTBOUND_SECRET') };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const all = await base44.asServiceRole.entities.OutboundIntegrationQueue.list();
    const candidates = all.filter((q: any) => (q.status === 'pending' || q.status === 'failed') && (q.attempts || 0) < MAX_ATTEMPTS);

    let succeeded = 0, failed = 0, deadLettered = 0;

    for (const q of candidates) {
      const baseUrl = await resolveBaseUrl(base44, q.target_app);
      const hdr = headerFor(q.target_app);
      if (!baseUrl || !hdr.value) {
        // Cannot retry — leave pending, increment last_error
        await base44.asServiceRole.entities.OutboundIntegrationQueue.update(q.id, {
          last_error: 'no base_url or secret configured for ' + q.target_app,
          last_attempt_at: new Date().toISOString(),
        }).catch(() => {});
        continue;
      }

      try {
        await base44.asServiceRole.entities.OutboundIntegrationQueue.update(q.id, { status: 'in_flight', last_attempt_at: new Date().toISOString() });
        const url = `${baseUrl.replace(/\/$/, '')}/functions/${q.endpoint_path}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [hdr.name]: hdr.value },
          body: q.payload || '{}',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        await base44.asServiceRole.entities.OutboundIntegrationQueue.update(q.id, {
          status: 'succeeded',
          succeeded_at: new Date().toISOString(),
          attempts: (q.attempts || 0) + 1,
        });
        succeeded++;
      } catch (err) {
        const newAttempts = (q.attempts || 0) + 1;
        const finalStatus = newAttempts >= MAX_ATTEMPTS ? 'dead_letter' : 'failed';
        await base44.asServiceRole.entities.OutboundIntegrationQueue.update(q.id, {
          status: finalStatus,
          attempts: newAttempts,
          last_attempt_at: new Date().toISOString(),
          last_error: err.message,
        });
        if (finalStatus === 'dead_letter') {
          deadLettered++;
          await base44.asServiceRole.entities.AuditLog.create({
            event_type: 'integration_dead_lettered',
            status: 'failure',
            source_function: 'retryFailedIntegrations',
            related_entity: 'OutboundIntegrationQueue',
            related_entity_id: q.id,
            message: `Dead-lettered after ${newAttempts} attempts: ${q.endpoint_path} -> ${q.target_app}`,
            details: JSON.stringify({ idempotency_key: q.idempotency_key, last_error: err.message }),
            notified_admin: true,
          }).catch(() => {});
        } else {
          failed++;
        }
      }
    }

    return Response.json({
      ok: true,
      considered: candidates.length,
      succeeded,
      failed,
      dead_lettered: deadLettered,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
