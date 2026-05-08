import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useCurrentUser from "@/lib/useCurrentUser";
import AccessDenied from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Plus, FileText, AlertCircle, CheckCircle, Clock } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import LeaseForm from "@/components/leases/LeaseForm";
import LeaseDetail from "@/components/leases/LeaseDetail";

export default function LeaseManagement() {
  const { user, isInternal } = useCurrentUser();
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { if (user) loadLeases(); }, [user]);

  async function loadLeases() {
    setLoading(true);
    const data = await base44.entities.LeaseAgreement.list("-created_date");
    setLeases(data);
    setLoading(false);
  }

  const filtered = statusFilter === "all" ? leases : leases.filter(l => l.lease_status === statusFilter);

  const stats = {
    active: leases.filter(l => l.lease_status === "active").length,
    expiring: leases.filter(l => {
      if (!l.lease_end_date) return false;
      const days = (new Date(l.lease_end_date) - new Date()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 30 && l.lease_status === "active";
    }).length,
    unsigned: leases.filter(l => !l.signed_by_resident).length,
    renewal: leases.filter(l => l.lease_status === "renewal_pending").length,
  };

  if (!isInternal) return <AccessDenied message="Lease management is restricted to internal staff." />;
  if (selected) return <LeaseDetail lease={selected} onBack={() => { setSelected(null); loadLeases(); }} />;
  if (showForm) return <LeaseForm onSave={() => { setShowForm(false); loadLeases(); }} onCancel={() => setShowForm(false)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Lease Management</h1>
          <p className="text-muted-label text-sm mt-1">Digital leases, signatures & renewals</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Lease
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Leases", value: stats.active, icon: CheckCircle, color: "green" },
          { label: "Expiring Soon", value: stats.expiring, icon: Clock, color: "amber" },
          { label: "Awaiting Signature", value: stats.unsigned, icon: AlertCircle, color: "blue" },
          { label: "Renewal Pending", value: stats.renewal, icon: FileText, color: "purple" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 flex items-center justify-center`}>
              <Icon className={`w-5 h-5 text-${color}-400`} />
            </div>
            <div><p className="text-2xl font-bold text-heading">{value}</p><p className="text-xs text-muted-label">{label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all","draft","sent","signed","active","expired","terminated","renewal_pending"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${statusFilter === s ? "bg-primary text-white" : "bg-elevated text-muted-label hover:text-heading border border-border"}`}>
            {s === "all" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-label">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No leases found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lease => (
            <div key={lease.id} onClick={() => setSelected(lease)}
              className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-heading text-sm">{lease.resident_name || "Unknown Resident"}</p>
                  <p className="text-xs text-muted-label mt-0.5">{lease.property_name} {lease.room_name ? `· ${lease.room_name}` : ""} {lease.bed_label ? `· ${lease.bed_label}` : ""}</p>
                  <div className="flex gap-4 mt-2 text-[11px] text-muted-label">
                    <span>Start: {lease.lease_start_date || "—"}</span>
                    <span>End: {lease.lease_end_date || "—"}</span>
                    {lease.monthly_rent && <span>Rent: ${lease.monthly_rent?.toLocaleString()}/mo</span>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {lease.signed_by_resident
                      ? <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">Resident Signed</span>
                      : <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">Awaiting Resident</span>}
                    {lease.signed_by_staff
                      ? <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">Staff Signed</span>
                      : <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">Awaiting Staff</span>}
                  </div>
                </div>
                <StatusBadge status={lease.lease_status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}