import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

export default function LeaseDetail({ lease, onBack }) {
  const [l, setL] = useState(lease);
  const [saving, setSaving] = useState(false);

  async function update(updates) {
    setSaving(true);
    await base44.entities.LeaseAgreement.update(l.id, updates);
    setL(prev => ({ ...prev, ...updates }));
    setSaving(false);
  }

  async function staffSign() {
    await update({ signed_by_staff: true, staff_signed_at: new Date().toISOString(), lease_status: l.signed_by_resident ? "active" : "sent" });
  }

  async function residentSign() {
    await update({ signed_by_resident: true, resident_signed_at: new Date().toISOString(), lease_status: l.signed_by_staff ? "active" : "signed" });
  }

  return (
    <div className="max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-label hover:text-heading text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Leases
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-heading">{l.resident_name}</h2>
          <p className="text-muted-label text-sm">{l.property_name} {l.room_name ? `· ${l.room_name}` : ""} {l.bed_label ? `· ${l.bed_label}` : ""}</p>
        </div>
        <StatusBadge status={l.lease_status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-label">Start Date</p>
          <p className="font-semibold text-heading text-sm mt-1">{l.lease_start_date || "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-label">End Date</p>
          <p className="font-semibold text-heading text-sm mt-1">{l.lease_end_date || "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-label">Monthly Rent</p>
          <p className="font-semibold text-heading text-sm mt-1">{l.monthly_rent ? `$${l.monthly_rent.toLocaleString()}` : "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-label">Security Deposit</p>
          <p className="font-semibold text-heading text-sm mt-1">{l.security_deposit ? `$${l.security_deposit.toLocaleString()}` : "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-label">Resident Email</p>
          <p className="font-semibold text-heading text-sm mt-1 truncate">{l.resident_email || "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-label">Renewal Deadline</p>
          <p className="font-semibold text-heading text-sm mt-1">{l.renewal_deadline || "—"}</p>
        </div>
      </div>

      {/* Signature Status */}
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
        <h3 className="text-sm font-semibold text-heading mb-4">Signatures</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between bg-elevated rounded-lg p-3">
            <div>
              <p className="text-xs text-muted-label">Resident</p>
              <p className="text-sm font-medium text-heading">{l.signed_by_resident ? `Signed ${new Date(l.resident_signed_at).toLocaleDateString()}` : "Not yet signed"}</p>
            </div>
            {l.signed_by_resident
              ? <CheckCircle className="w-5 h-5 text-green-400" />
              : <Button size="sm" onClick={residentSign} disabled={saving}>Mark Signed</Button>}
          </div>
          <div className="flex items-center justify-between bg-elevated rounded-lg p-3">
            <div>
              <p className="text-xs text-muted-label">Staff</p>
              <p className="text-sm font-medium text-heading">{l.signed_by_staff ? `Signed ${new Date(l.staff_signed_at).toLocaleDateString()}` : "Not yet signed"}</p>
            </div>
            {l.signed_by_staff
              ? <CheckCircle className="w-5 h-5 text-green-400" />
              : <Button size="sm" onClick={staffSign} disabled={saving}>Sign Now</Button>}
          </div>
        </div>
      </div>

      {/* Terms */}
      {l.terms_and_conditions && (
        <div className="bg-card border border-border rounded-lg p-5 mb-4">
          <h3 className="text-sm font-semibold text-heading mb-2">Terms & Conditions</h3>
          <p className="text-sm text-body-text whitespace-pre-wrap">{l.terms_and_conditions}</p>
        </div>
      )}

      {/* Status Actions */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-heading mb-3">Update Status</h3>
        <div className="flex gap-2 flex-wrap">
          {["draft","sent","active","renewal_pending","expired","terminated"].map(s => (
            <Button key={s} size="sm" variant={l.lease_status === s ? "default" : "outline"}
              onClick={() => update({ lease_status: s })} disabled={saving}>
              {s.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
        {l.lease_status !== "renewal_pending" && (
          <div className="mt-4 flex items-center gap-3">
            <label className="text-xs text-muted-label">Renewal Deadline:</label>
            <input type="date" value={l.renewal_deadline || ""} onChange={e => update({ renewal_deadline: e.target.value, renewal_offered: true })}
              className="bg-elevated border border-border rounded px-2 py-1 text-xs text-heading focus:outline-none focus:border-primary" />
          </div>
        )}
        {saving && <p className="text-xs text-muted-label mt-2">Saving...</p>}
      </div>
    </div>
  );
}