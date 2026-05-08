import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function LeaseForm({ onSave, onCancel }) {
  const [residents, setResidents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    resident_id: "", resident_name: "", resident_email: "",
    property_id: "", property_name: "", room_name: "", bed_label: "",
    lease_start_date: "", lease_end_date: "", monthly_rent: "", security_deposit: "",
    terms_and_conditions: "Standard house rules apply. Resident agrees to maintain unit in good condition, pay rent on time, and follow all community guidelines.",
    lease_status: "draft",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.HousingResident.list(),
      base44.entities.Property.list(),
    ]).then(([r, p]) => { setResidents(r); setProperties(p); });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleResidentChange = (id) => {
    const r = residents.find(x => x.id === id);
    if (r) set("resident_id", id) || setForm(f => ({ ...f, resident_id: id, resident_name: `${r.first_name} ${r.last_name}`, resident_email: r.email || "" }));
  };

  const handlePropertyChange = (id) => {
    const p = properties.find(x => x.id === id);
    if (p) setForm(f => ({ ...f, property_id: id, property_name: p.property_name }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await base44.entities.LeaseAgreement.create({ ...form, monthly_rent: Number(form.monthly_rent), security_deposit: Number(form.security_deposit) });
    onSave();
  }

  return (
    <div className="max-w-3xl">
      <button onClick={onCancel} className="flex items-center gap-2 text-muted-label hover:text-heading text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h2 className="text-xl font-bold text-heading mb-6">Create New Lease</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Resident *</label>
            <select required value={form.resident_id} onChange={e => handleResidentChange(e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary">
              <option value="">Select resident...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Property *</label>
            <select required value={form.property_id} onChange={e => handlePropertyChange(e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary">
              <option value="">Select property...</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Room Name</label>
            <input value={form.room_name} onChange={e => set("room_name", e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Bed Label</label>
            <input value={form.bed_label} onChange={e => set("bed_label", e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Start Date *</label>
            <input type="date" required value={form.lease_start_date} onChange={e => set("lease_start_date", e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">End Date</label>
            <input type="date" value={form.lease_end_date} onChange={e => set("lease_end_date", e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Monthly Rent ($)</label>
            <input type="number" value={form.monthly_rent} onChange={e => set("monthly_rent", e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-label mb-1">Security Deposit ($)</label>
            <input type="number" value={form.security_deposit} onChange={e => set("security_deposit", e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-label mb-1">Terms & Conditions</label>
          <textarea value={form.terms_and_conditions} onChange={e => set("terms_and_conditions", e.target.value)} rows={5}
            className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-heading focus:outline-none focus:border-primary resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Lease"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}