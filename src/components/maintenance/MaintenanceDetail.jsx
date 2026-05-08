import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

export default function MaintenanceDetail({ request, onBack, isInternal }) {
  const [req, setReq] = useState(request);
  const [saving, setSaving] = useState(false);

  async function updateField(updates) {
    setSaving(true);
    const updated = await base44.entities.MaintenanceRequest.update(req.id, updates);
    setReq(prev => ({ ...prev, ...updates }));
    setSaving(false);
  }

  return (
    <div className="max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-label hover:text-heading text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Requests
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-heading">{req.title}</h2>
          <p className="text-muted-label text-sm mt-1">{req.category?.replace(/_/g, " ")} · Submitted {new Date(req.created_date).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div className="bg-card border border-border rounded-lg p-5 mb-4">
        <h3 className="text-sm font-semibold text-heading mb-2">Description</h3>
        <p className="text-sm text-body-text">{req.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-label mb-1">Priority</p>
          <p className="text-sm font-semibold text-heading capitalize">{req.priority}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-label mb-1">Location</p>
          <p className="text-sm font-semibold text-heading">{req.property_name || "—"} {req.room_name ? `· ${req.room_name}` : ""}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-label mb-1">Resident</p>
          <p className="text-sm font-semibold text-heading">{req.resident_name || "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-label mb-1">Assigned To</p>
          <p className="text-sm font-semibold text-heading">{req.assigned_to_name || "Unassigned"}</p>
        </div>
      </div>

      {isInternal && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-heading">Staff Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-label mb-1">Update Status</label>
              <select value={req.status} onChange={e => updateField({ status: e.target.value })}
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary">
                {["submitted","acknowledged","in_progress","on_hold","resolved","closed"].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-label mb-1">Assign To</label>
              <input value={req.assigned_to_name || ""} onChange={e => updateField({ assigned_to_name: e.target.value })}
                placeholder="Staff member name"
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-label mb-1">Resolution Notes</label>
            <textarea value={req.resolution_notes || ""} onChange={e => updateField({ resolution_notes: e.target.value })} rows={3}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary resize-none" />
          </div>
          {saving && <p className="text-xs text-muted-label">Saving...</p>}
        </div>
      )}
    </div>
  );
}