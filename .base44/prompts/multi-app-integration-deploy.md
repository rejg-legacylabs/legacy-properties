# Multi-App Integration Deploy — Housing (Legacy Properties)

This branch wires Housing to Pathways (bidirectional), MRT (inbound), and Google Drive (document generation). Housing keeps working perfectly when any peer is offline — every outbound call is wrapped and queued.

## 1. Required environment variables

Set these in Base44 → App Settings → Environment for the Housing app before publishing:

| Var | Required | Purpose |
|---|---|---|
| `PATHWAYS_INBOUND_SECRET` | yes | Validates `x-pathways-secret` on inbound calls from Pathways. |
| `MRT_INBOUND_SECRET` | yes | Validates `x-mrt-secret` on inbound calls from MRT. |
| `HOUSING_OUTBOUND_SECRET` | yes | Sent as `x-housing-secret` on every outbound call. Pathways/MRT must accept this. |
| `PATHWAYS_APP_BASE_URL` | recommended | Fallback peer URL when no `IntegrationConfig` row exists. e.g. `https://api.base44.com/api/apps/<pathways_app_id>` |
| `MRT_APP_BASE_URL` | optional | Fallback peer URL for MRT outbound (currently inbound-only). |
| `GOVERNANCE_APP_BASE_URL` | optional | Fallback peer URL for governance outbound. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | optional | Drive service account JSON. If absent, `googleDriveService` runs in stub mode (no real Drive calls — every op returns a fake id and writes a `drive_op_stub` audit log). |

Rotate secrets via Base44 env without redeploying.

## 2. Configure peers in `IntegrationConfig`

Once per environment (run in Base44 → Data → IntegrationConfig):

```json
{ "app_name": "pathways", "base_url": "https://api.base44.com/api/apps/<pathways_app_id>", "shared_secret_env_var_name": "HOUSING_OUTBOUND_SECRET", "enabled": true }
{ "app_name": "drive",    "base_url": "",                                                          "shared_secret_env_var_name": "GOOGLE_SERVICE_ACCOUNT_KEY", "enabled": true }
{ "app_name": "mrt",      "base_url": "https://api.base44.com/api/apps/<mrt_app_id>",              "shared_secret_env_var_name": "HOUSING_OUTBOUND_SECRET", "enabled": true }
```

IntegrationConfig.base_url overrides the env fallback so ops can rotate URLs without a redeploy.

## 3. Deploy steps

1. Merge `feature/pathways-bidirectional-integration` into `main`.
2. Base44 will auto-publish entities + functions. Confirm new entities appear: `OutboundIntegrationQueue`, `IntegrationConfig`, `DocumentTemplate`, `GeneratedDocument`, `IncomingReferralEvent`.
3. Set the env vars in Section 1.
4. Insert the `IntegrationConfig` rows in Section 2.
5. Have Pathways register Housing's inbound URLs:
   - `POST <housing_base>/functions/receiveExternalReferral` with header `x-pathways-secret`.
6. Have MRT register `POST <housing_base>/functions/receiveTransportArrivalNotice` with header `x-mrt-secret`.
7. Schedule `retryFailedIntegrations` to run every 5 minutes.
8. Schedule `pushHousingDataToPathways` to run nightly at 02:00 local.
9. Schedule `notifyPathwaysOfBedAvailability` to run every 15 minutes (and as event reaction on bed status change).
10. Run `bootstrapPathwaysSync` once as housing_admin to backfill: `POST <housing_base>/functions/bootstrapPathwaysSync?from=2025-11-01`.

## 4. Smoke test

```
# Inbound referral from Pathways (idempotent — run twice, second is no-op)
curl -X POST <housing_base>/functions/receiveExternalReferral \
  -H 'Content-Type: application/json' \
  -H "x-pathways-secret: $PATHWAYS_INBOUND_SECRET" \
  -d '{"global_resident_id":"P-TEST-001","idempotency_key":"smoke-1","referral_data":{"applicant_name":"Test User","phone":"5555550100","current_status":"sheltered","urgency":"medium"}}'

# Outbound bed availability digest (queues if Pathways down — never fails)
curl -X POST <housing_base>/functions/notifyPathwaysOfBedAvailability

# MRT arrival
curl -X POST <housing_base>/functions/receiveTransportArrivalNotice \
  -H 'Content-Type: application/json' \
  -H "x-mrt-secret: $MRT_INBOUND_SECRET" \
  -d '{"global_resident_id":"P-TEST-001","trip_id":"T-1","eta_minutes":12,"status":"en_route","idempotency_key":"mrt-smoke-1"}'
```

Verify in Base44:
- `IncomingReferralEvent` row created (status=processed) for each unique idempotency_key.
- `OutboundIntegrationQueue` row appears as `pending` if Pathways URL is unreachable, then flips to `succeeded` when `retryFailedIntegrations` runs.
- `AuditLog` shows one `inbound_referral_received` per inbound and one `pathways_notify_*` per outbound.

## 5. Failure semantics

- Pathways down → outbound queued, every call returns 200 to caller with `queued:true`. `retryFailedIntegrations` retries up to 5x then dead-letters with `notified_admin:true`.
- MRT down → no impact (we are receive-only).
- Drive down or no service account → `googleDriveService` returns stub responses, generation continues with placeholder file ids and a `drive_op_stub` warning.
- Auth failure on inbound → 401 returned, no entity writes, no queue entry.
- Idempotency replay → 200 with `duplicate:true` and original `referral_id`.

## 6. Rollback

Revert the merge commit. New entities are additive; the only mutated existing entities (`Referral`, `HousingResident`, `Bed`, `Placement`, `Document`) gain optional fields, so old function code keeps working. The wiring changes in `createPlacement`, `assignResidentToBed`, and `transferResident` are wrapped in try/catch — reverting them removes the new outbound but leaves the original behavior intact.
