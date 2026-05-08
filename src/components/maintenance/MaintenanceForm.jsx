import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function MaintenanceForm({ user, onSave, onCancel }) {
  const [form, setForm] = useState({ title: "", description: "", category: "plumbing", priority: "medium", room_name: "", property_name: "" });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await base44.entities.MaintenanceRequest.create({
      ...form,
      resident_name: user?.full_name || "",
      submitted_at: new Date().toISOString(),
      status: "submitted",
    });
    onSave();
  }

  return (
    <div>
      <button onClick={onCancel} className="flex items-center gap-2 text-muted-label hover:text-heading text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h2 className="text-xl font-bold text-heading mb-6">Submit Maintenance Request</h2>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-label mb-1">Title *</label>
          <input required value={form.title} onChange={e => set("title", e.target.value)}
            className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Category *</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary">
              {["plumbing","electrical","hvac","appliance","structural","pest_control","cleaning","security","other"].map(c => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Priority</label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary">
              {["low","medium","high","emergency"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Property Name</label>
            <input value={form.property_name} onChange={e => set("property_name", e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Room</label>
            <input value={form.room_name} onChange={e => set("room_name", e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-label mb-1">Description *</label>
          <textarea required value={form.description} onChange={e => set("description", e.target.value)} rows={4}
            className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit Request"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}