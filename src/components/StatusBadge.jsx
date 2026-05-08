const statusColors = {
  // Bed status
  available: 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30',
  occupied: 'bg-accent-rose/20 text-accent-rose border border-accent-rose/30',
  needs_cleaning: 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30',
  reserved: 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30',
  out_of_service: 'bg-accent-slate/20 text-accent-slate border border-accent-slate/30',
  // General
  active: 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30',
  inactive: 'bg-accent-slate/20 text-accent-slate border border-accent-slate/30',
  under_maintenance: 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30',
  pending_approval: 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30',
  // Referral
  draft: 'bg-accent-slate/20 text-accent-slate border border-accent-slate/30',
  submitted: 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30',
  received: 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30',
  under_review: 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30',
  more_information_requested: 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30',
  approved: 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30',
  denied: 'bg-accent-rose/20 text-accent-rose border border-accent-rose/30',
  waitlisted: 'bg-primary/20 text-primary border border-primary/30',
  withdrawn: 'bg-accent-slate/20 text-accent-slate border border-accent-slate/30',
  admitted: 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30',
  closed: 'bg-accent-slate/20 text-accent-slate border border-accent-slate/30',
  // Applicant
  new: 'bg-blue-100 text-blue-700',
  screening: 'bg-amber-100 text-amber-700',
  eligible: 'bg-green-100 text-green-700',
  ineligible: 'bg-red-100 text-red-700',
  ready_for_placement: 'bg-emerald-100 text-emerald-700',
  placed: 'bg-green-100 text-green-700',
  // Resident
  pending_move_in: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  exited: 'bg-gray-100 text-gray-700',
  discharged: 'bg-rose-100 text-rose-700',
  // Intake
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
  // Docs
  incomplete: 'bg-yellow-100 text-yellow-700',
  pending_review: 'bg-amber-100 text-amber-700',
  complete: 'bg-green-100 text-green-700',
  issues: 'bg-red-100 text-red-700',
  // Verification
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-700',
  // Fee
  due: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  waived: 'bg-slate-100 text-slate-700',
  overdue: 'bg-red-100 text-red-700',
  // Compliance
  pass: 'bg-green-100 text-green-700',
  fail: 'bg-red-100 text-red-700',
  needs_attention: 'bg-orange-100 text-orange-700',
  not_applicable: 'bg-gray-100 text-gray-700',
  // Incident followup
  none_needed: 'bg-gray-100 text-gray-700',
  // Severity
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
  urgent: 'bg-red-100 text-red-700',
  // Lease
  sent: 'bg-blue-100 text-blue-700',
  signed: 'bg-emerald-100 text-emerald-700',
  renewal_pending: 'bg-purple-100 text-purple-700',
  terminated: 'bg-red-100 text-red-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  acknowledged: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  resolved: 'bg-green-100 text-green-700',
  // Waitlist
  offered: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-gray-100 text-gray-700',
  removed: 'bg-gray-100 text-gray-700',
  // Occupancy
  ended: 'bg-gray-100 text-gray-700',
  transferred: 'bg-purple-100 text-purple-700',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const colors = statusColors[status] || 'bg-gray-100 text-gray-700';
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-semibold capitalize ${colors}`}>
      {label}
    </span>
  );
}