import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useCurrentUser from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Clock, CheckCircle, AlertTriangle, Filter } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import MaintenanceForm from "@/components/maintenance/MaintenanceForm";
import MaintenanceDetail from "@/components/maintenance/MaintenanceDetail";

const priorityColors = {
  low: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  medium: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  high: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  emergency: "bg-red-500/20 text-red-400 border border-red-500/30",
};

export default function MaintenanceRequests() {
  const { user, isInternal } = useCurrentUser();
  const isTenant = user?.role === "tenant";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { if (user) loadRequests(); }, [user]);

  async function loadRequests() {
    setLoading(true);
    const data = isTenant
      ? await base44.entities.MaintenanceRequest.filter({ created_by: user.email })
      : await base44.entities.MaintenanceRequest.list("-created_date");
    setRequests(data);
    setLoading(false);
  }

  const filtered = statusFilter === "all" ? requests : requests.filter(r => r.status === statusFilter);

  const stats = {
    open: requests.filter(r => ["submitted","acknowledged","in_progress"].includes(r.status)).length,
    emergency: requests.filter(r => r.priority === "emergency").length,
    resolved: requests.filter(r => r.status === "resolved").length,
  };

  if (selected) return <MaintenanceDetail request={selected} onBack={() => { setSelected(null); loadRequests(); }} isInternal={isInternal} />;
  if (showForm) return <MaintenanceForm user={user} onSave={() => { setShowForm(false); loadRequests(); }} onCancel={() => setShowForm(false)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Maintenance Requests</h1>
          <p className="text-muted-label text-sm mt-1">Track and manage work orders</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {isInternal && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-400" /></div>
            <div><p className="text-2xl font-bold text-heading">{stats.open}</p><p className="text-xs text-muted-label">Open</p></div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
            <div><p className="text-2xl font-bold text-heading">{stats.emergency}</p><p className="text-xs text-muted-label">Emergency</p></div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-400" /></div>
            <div><p className="text-2xl font-bold text-heading">{stats.resolved}</p><p className="text-xs text-muted-label">Resolved</p></div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all","submitted","acknowledged","in_progress","resolved","closed"].map(s => (
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
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No maintenance requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} onClick={() => setSelected(req)}
              className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-heading text-sm">{req.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priorityColors[req.priority]}`}>{req.priority}</span>
                  </div>
                  <p className="text-xs text-muted-label line-clamp-1">{req.description}</p>
                  <div className="flex gap-3 mt-2 text-[11px] text-muted-label">
                    {req.property_name && <span>{req.property_name}</span>}
                    {req.room_name && <span>· {req.room_name}</span>}
                    {req.resident_name && <span>· {req.resident_name}</span>}
                    <span>· {req.category?.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={req.status} />
                  <span className="text-[10px] text-muted-label">{new Date(req.created_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}