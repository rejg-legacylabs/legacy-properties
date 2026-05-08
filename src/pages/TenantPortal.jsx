import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useCurrentUser from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Home, FileText, Wrench, DollarSign, Bell, User, CheckCircle, Clock, AlertCircle, Plus } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import MaintenanceForm from "@/components/maintenance/MaintenanceForm";

const tabs = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "lease", label: "My Lease", icon: FileText },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "payments", label: "Payments", icon: DollarSign },
];

export default function TenantPortal() {
  const { user, loading: userLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [lease, setLease] = useState(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const [leases, requests, inv] = await Promise.all([
        base44.entities.LeaseAgreement.list(),
        base44.entities.MaintenanceRequest.list(),
        base44.entities.Invoice.list(),
      ]);
      // Filter to user's own data
      const myLeases = leases.filter(l => l.resident_email === user.email || l.created_by === user.email);
      setLease(myLeases[0] || null);
      setMaintenanceRequests(requests.filter(r => r.created_by === user.email));
      setInvoices(inv.filter(i => i.billed_to_email === user.email || i.created_by === user.email));
    } catch(e) {}
    setLoading(false);
  }

  if (userLoading || loading) return (
    <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
  );

  const openRequests = maintenanceRequests.filter(r => !["resolved","closed"].includes(r.status));
  const unpaidInvoices = invoices.filter(i => i.status === "sent" || i.status === "overdue");
  const totalOwed = unpaidInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);

  if (showMaintenanceForm) return (
    <div className="max-w-2xl mx-auto">
      <MaintenanceForm user={user} onSave={() => { setShowMaintenanceForm(false); loadData(); }} onCancel={() => setShowMaintenanceForm(false)} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-card to-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
            {user?.full_name?.[0] || "T"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-heading">Welcome back, {user?.full_name?.split(" ")[0] || "Resident"}</h1>
            <p className="text-sm text-muted-label">{lease?.property_name || "No property assigned"} {lease?.room_name ? `· ${lease.room_name}` : ""}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-elevated rounded-lg p-1 mb-6 border border-border">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === t.id ? "bg-primary text-white shadow" : "text-muted-label hover:text-heading"}`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${unpaidInvoices.length > 0 ? "bg-amber-500/20" : "bg-green-500/20"}`}>
                {unpaidInvoices.length > 0 ? <AlertCircle className="w-5 h-5 text-amber-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
              </div>
              <p className="text-lg font-bold text-heading">${totalOwed.toLocaleString()}</p>
              <p className="text-xs text-muted-label">Balance Due</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-2 bg-blue-500/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-lg font-bold text-heading">{openRequests.length}</p>
              <p className="text-xs text-muted-label">Open Requests</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${lease?.signed_by_resident ? "bg-green-500/20" : "bg-amber-500/20"}`}>
                <FileText className={`w-5 h-5 ${lease?.signed_by_resident ? "text-green-400" : "text-amber-400"}`} />
              </div>
              <p className="text-lg font-bold text-heading">{lease ? (lease.signed_by_resident ? "Signed" : "Pending") : "None"}</p>
              <p className="text-xs text-muted-label">Lease Status</p>
            </div>
          </div>

          {/* Alerts */}
          {unpaidInvoices.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-heading">Payment Due</p>
                <p className="text-xs text-muted-label">You have {unpaidInvoices.length} unpaid invoice(s) totaling ${totalOwed.toLocaleString()}. Contact staff to arrange payment.</p>
              </div>
            </div>
          )}

          {lease && !lease.signed_by_resident && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-heading">Lease Awaiting Your Signature</p>
                <p className="text-xs text-muted-label">Your lease agreement is ready to review and sign.</p>
              </div>
              <Button size="sm" onClick={() => setActiveTab("lease")}>Review</Button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-heading mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setShowMaintenanceForm(true)} className="gap-2 justify-start">
                <Wrench className="w-4 h-4" /> Submit Maintenance Request
              </Button>
              <Button variant="outline" onClick={() => setActiveTab("lease")} className="gap-2 justify-start">
                <FileText className="w-4 h-4" /> View Lease
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lease Tab */}
      {activeTab === "lease" && (
        <div>
          {!lease ? (
            <div className="text-center py-16 text-muted-label">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No lease on file. Contact staff for assistance.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-heading">Lease Agreement</h3>
                  <StatusBadge status={lease.lease_status} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs text-muted-label mb-1">Property</p><p className="text-heading font-medium">{lease.property_name}</p></div>
                  <div><p className="text-xs text-muted-label mb-1">Room / Bed</p><p className="text-heading font-medium">{lease.room_name || "—"} {lease.bed_label ? `· ${lease.bed_label}` : ""}</p></div>
                  <div><p className="text-xs text-muted-label mb-1">Start Date</p><p className="text-heading font-medium">{lease.lease_start_date || "—"}</p></div>
                  <div><p className="text-xs text-muted-label mb-1">End Date</p><p className="text-heading font-medium">{lease.lease_end_date || "—"}</p></div>
                  <div><p className="text-xs text-muted-label mb-1">Monthly Rent</p><p className="text-heading font-medium">{lease.monthly_rent ? `$${lease.monthly_rent.toLocaleString()}` : "—"}</p></div>
                  <div><p className="text-xs text-muted-label mb-1">Security Deposit</p><p className="text-heading font-medium">{lease.security_deposit ? `$${lease.security_deposit.toLocaleString()}` : "—"}</p></div>
                </div>
              </div>

              {/* Signature section */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-heading mb-4">Signatures</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-elevated rounded-lg p-3">
                    <div>
                      <p className="text-xs text-muted-label">Your Signature</p>
                      <p className="text-sm text-heading font-medium">{lease.signed_by_resident ? `Signed on ${new Date(lease.resident_signed_at).toLocaleDateString()}` : "Not yet signed"}</p>
                    </div>
                    {lease.signed_by_resident
                      ? <CheckCircle className="w-5 h-5 text-green-400" />
                      : (
                        <Button size="sm" onClick={async () => {
                          await base44.entities.LeaseAgreement.update(lease.id, { signed_by_resident: true, resident_signed_at: new Date().toISOString() });
                          setLease(l => ({ ...l, signed_by_resident: true, resident_signed_at: new Date().toISOString() }));
                        }}>Sign Lease</Button>
                      )}
                  </div>
                  <div className="flex items-center justify-between bg-elevated rounded-lg p-3">
                    <div>
                      <p className="text-xs text-muted-label">Staff Signature</p>
                      <p className="text-sm text-heading font-medium">{lease.signed_by_staff ? "Signed" : "Pending staff signature"}</p>
                    </div>
                    {lease.signed_by_staff ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Clock className="w-5 h-5 text-amber-400" />}
                  </div>
                </div>
              </div>

              {lease.terms_and_conditions && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-heading mb-3">Terms & Conditions</h3>
                  <p className="text-sm text-body-text whitespace-pre-wrap">{lease.terms_and_conditions}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === "maintenance" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-heading">My Requests ({maintenanceRequests.length})</h3>
            <Button size="sm" onClick={() => setShowMaintenanceForm(true)} className="gap-2">
              <Plus className="w-4 h-4" /> New Request
            </Button>
          </div>
          {maintenanceRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-label">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No maintenance requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {maintenanceRequests.map(req => (
                <div key={req.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-heading text-sm">{req.title}</p>
                      <p className="text-xs text-muted-label mt-0.5">{req.category?.replace(/_/g, " ")} · {new Date(req.created_date).toLocaleDateString()}</p>
                      {req.resolution_notes && <p className="text-xs text-body-text mt-2 bg-elevated rounded p-2">{req.resolution_notes}</p>}
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          {unpaidInvoices.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-heading mb-1">Total Balance Due: ${totalOwed.toLocaleString()}</p>
              <p className="text-xs text-muted-label">Please contact staff or your housing manager to arrange payment.</p>
            </div>
          )}
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-label">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No invoices on file</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-heading text-sm">{inv.invoice_number || `Invoice`}</p>
                      <p className="text-xs text-muted-label mt-0.5">{inv.invoice_type?.replace(/_/g, " ")} · Due: {inv.due_date || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-heading">${(inv.total_amount || 0).toLocaleString()}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}