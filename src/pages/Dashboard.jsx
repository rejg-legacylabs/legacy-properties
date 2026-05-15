import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/lib/useCurrentUser';
import RevenueSummaryWidget from '@/components/RevenueSummaryWidget';

const G = {
  navy: '#0a1628',
  navyMid: '#111d35',
  navyLight: '#1a2d4a',
  gold: '#d4af37',
  goldLight: '#f0d060',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  border: 'rgba(212,175,55,0.18)',
  glass: 'rgba(17,29,53,0.85)',
};

const glassCard = {
  background: G.glass,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${G.border}`,
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.1)',
  transition: 'all 0.25s ease',
  cursor: 'pointer',
};

function FloatCard({ title, value, sub, color, onClick, alert }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...glassCard,
        padding: '20px',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px ${color}, inset 0 1px 0 rgba(212,175,55,0.15)`
          : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.1)',
        borderColor: hovered ? color : G.border,
      }}
    >
      {alert && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, marginBottom: 8, animation: 'pulse 2s infinite' }} />
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 36, fontWeight: 900, color: hovered ? color : '#fff', lineHeight: 1, transition: 'color 0.2s' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{sub}</div>}
      <div style={{ marginTop: 10, fontSize: 10, color: color, fontWeight: 600, opacity: hovered ? 1 : 0, transition: 'opacity 0.2s' }}>→ View Details</div>
    </div>
  );
}

function SectionCard({ children, style }) {
  return (
    <div style={{ ...glassCard, padding: 24, cursor: 'default', ...style }}>
      {children}
    </div>
  );
}

function PartnerCTA({ navigate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...glassCard,
        padding: '40px',
        cursor: 'default',
        background: hovered
          ? 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(6,182,212,0.1) 100%)'
          : 'linear-gradient(135deg, rgba(17,29,53,0.95) 0%, rgba(26,45,74,0.95) 100%)',
        borderColor: hovered ? G.gold : G.border,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
            ✦ Partnership Opportunities
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 12px 0', lineHeight: 1.2 }}>
            Partner With REJG Legacy Properties
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px 0' }}>
            Courts, probation offices, treatment centers, nonprofits, and social service agencies —
            connect with our 100% drug & alcohol free housing network across Austin, Texas.
            Fast placement, professional case coordination, real-time bed availability.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['Travis County Courts', 'Integral Care', 'Probation & Parole', 'Treatment Programs', 'VA Services', 'Nonprofits'].map(tag => (
              <span key={tag} style={{ background: 'rgba(212,175,55,0.1)', border: `1px solid rgba(212,175,55,0.3)`, color: G.goldLight, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{tag}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => navigate('/partner-portal')}
            style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, color: '#0a1628', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14, letterSpacing: '0.04em', boxShadow: `0 4px 20px rgba(212,175,55,0.4)` }}
          >
            🤝 Become a Partner
          </button>
          <button
            onClick={() => navigate('/bed-search')}
            style={{ padding: '14px 28px', background: 'transparent', color: G.gold, border: `1px solid ${G.gold}`, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
          >
            🛏 Check Bed Availability
          </button>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>
            📞 737-999-0256
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isInternal } = useCurrentUser();
  const [properties, setProperties] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [moveRequests, setMoveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (isInternal) {
          const [propsRes, refsRes, occRes, roomsRes, moveRes, bedsRes] = await Promise.all([
            base44.entities.Property.list(),
            base44.entities.HousingApplication.list(),
            base44.entities.OccupancyRecord.list(),
            base44.entities.Room.list(),
            base44.entities.MoveRequest.list(),
            base44.entities.Bed.list(),
          ]);
          setProperties(propsRes || []);
          setReferrals(refsRes || []);
          setOccupancy(occRes || []);
          setRooms(roomsRes || []);
          setMoveRequests(moveRes || []);
          setBeds(bedsRes || []);
        }
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user, isInternal]);

  const totalBeds = properties.reduce((s, p) => s + (p.total_bed_count || 0), 0);
  const occupiedBeds = occupancy.filter(o => o.occupancy_status === 'active').length;
  const availableBeds = totalBeds - occupiedBeds;
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const perBedProps = properties.filter(p => p.housing_model === 'per_bed');
  const turnkeyProps = properties.filter(p => p.housing_model === 'turnkey_house');
  const pendingReferrals = referrals.filter(r => r.application_status === 'under_review' || r.application_status === 'pending_documents').length;
  const totalRooms = rooms.filter(r => r.status === 'active').length;
  const pendingMoves = moveRequests.filter(r => ['submitted','under_review','approved'].includes(r.request_status)).length;
  const needsCleaning = beds.filter(b => b.bed_status === 'needs_cleaning').length;
  const fullHouses = properties.filter(p => {
    const occ = occupancy.filter(o => o.property_id === p.id && o.occupancy_status === 'active').length;
    return p.total_bed_count && occ >= p.total_bed_count;
  }).length;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ background: G.navy, minHeight: '100vh', padding: '28px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>

      {/* HERO HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(26,45,74,0.95) 0%, rgba(10,22,40,0.98) 60%, rgba(212,175,55,0.08) 100%)',
        border: `1px solid ${G.border}`,
        borderRadius: 20,
        padding: '36px 40px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.2)`,
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 120, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
              ✦ RE Jones Global LLC — Housing Division
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 8px 0', lineHeight: 1.1 }}>
              REJG Legacy Properties
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 4px 0' }}>{today}</p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
              {[
                { label: `${properties.length} Properties`, color: G.indigo },
                { label: `${totalBeds} Beds`, color: G.emerald },
                { label: '100% Drug & Alcohol Free', color: G.gold },
                { label: 'Austin, Texas', color: G.cyan },
              ].map(t => (
                <span key={t.label} style={{ background: `rgba(${t.color === G.gold ? '212,175,55' : t.color === G.emerald ? '16,185,129' : t.color === G.indigo ? '99,102,241' : '6,182,212'},0.12)`, border: `1px solid ${t.color}33`, color: t.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/diagnostics')} style={{ padding: '10px 18px', background: 'rgba(99,102,241,0.15)', color: G.indigo, border: `1px solid ${G.indigo}55`, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              🔍 Run Diagnostics
            </button>
            <button onClick={() => navigate('/partner-portal')} style={{ padding: '10px 18px', background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, color: '#0a1628', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
              🤝 Partner Portal
            </button>
          </div>
        </div>
      </div>

      {isInternal ? (
        <>
          {/* TOP METRICS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
            <FloatCard title="Total Properties" value={loading ? '…' : properties.length} sub="Click to manage" color={G.indigo} onClick={() => navigate('/properties')} />
            <FloatCard title="Total Beds" value={loading ? '…' : totalBeds} sub="All beds configured" color={G.cyan} onClick={() => navigate('/beds')} />
            <FloatCard title="Available Beds" value={loading ? '…' : availableBeds} sub="Ready for placement" color={G.emerald} onClick={() => navigate('/beds')} />
            <FloatCard title="Occupied Beds" value={loading ? '…' : occupiedBeds} sub="Active residents" color={G.indigo} onClick={() => navigate('/occupancy')} />
            <FloatCard title="Occupancy Rate" value={loading ? '…' : `${occupancyPct}%`} sub="Current utilization" color={occupancyPct >= 90 ? G.rose : occupancyPct >= 70 ? G.amber : G.emerald} onClick={() => navigate('/occupancy')} />
            <FloatCard title="Total Rooms" value={loading ? '…' : totalRooms} sub="Active rooms" color={G.cyan} onClick={() => navigate('/rooms')} />
          </div>

          {/* ALERTS ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
            <FloatCard title="⚠ At Capacity" value={loading ? '…' : fullHouses} sub="100% occupied houses" color={G.rose} alert={fullHouses > 0} onClick={() => navigate('/properties')} />
            <FloatCard title="⚠ Needs Cleaning" value={loading ? '…' : needsCleaning} sub="Beds pending turnover" color={G.amber} alert={needsCleaning > 0} onClick={() => navigate('/beds')} />
            <FloatCard title="⚠ Pending Referrals" value={loading ? '…' : pendingReferrals} sub="Awaiting action" color={G.amber} alert={pendingReferrals > 0} onClick={() => navigate('/referrals')} />
            <FloatCard title="⚠ Move Requests" value={loading ? '…' : pendingMoves} sub="Pending action" color={pendingMoves > 0 ? G.rose : G.emerald} alert={pendingMoves > 0} onClick={() => navigate('/move-requests')} />
            <FloatCard title="Per-Bed Houses" value={loading ? '…' : perBedProps.length} sub={`${perBedProps.reduce((s,p)=>s+(p.total_bed_count||0),0)} beds`} color={G.indigo} onClick={() => navigate('/properties')} />
            <FloatCard title="Turnkey Houses" value={loading ? '…' : turnkeyProps.length} sub="Whole-house leases" color={G.amber} onClick={() => navigate('/turnkey')} />
          </div>

          {/* QUICK ACTIONS */}
          <SectionCard style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>⚡ Quick Actions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: '🏠 All Properties', path: '/properties', color: G.indigo },
                { label: '🛏 Bed Search', path: '/bed-search', color: G.emerald },
                { label: '📋 Referrals', path: '/referrals', color: G.cyan },
                { label: '👥 Residents', path: '/residents', color: G.amber },
                { label: '📝 Leases', path: '/leases', color: G.gold },
                { label: '💰 Billing', path: '/billing', color: G.emerald },
                { label: '🔧 Maintenance', path: '/maintenance', color: G.rose },
                { label: '📊 Reporting', path: '/reporting', color: G.indigo },
                { label: '🏢 CRM Pipeline', path: '/crm', color: G.cyan },
                { label: '📅 Showings', path: '/showings', color: G.amber },
                { label: '📈 P&L Dashboard', path: '/pl-dashboard', color: G.gold },
                { label: '✅ Compliance', path: '/compliance', color: G.emerald },
                { label: '⚙️ Settings', path: '/settings', color: '#64748b' },
                { label: '🔍 Diagnostics', path: '/diagnostics', color: G.indigo },
              ].map(a => (
                <button
                  key={a.path}
                  onClick={() => navigate(a.path)}
                  style={{ padding: '8px 16px', background: `${a.color}18`, color: a.color, border: `1px solid ${a.color}44`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.target.style.background = `${a.color}30`; e.target.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.target.style.background = `${a.color}18`; e.target.style.transform = 'translateY(0)'; }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* REVENUE WIDGET */}
          <div style={{ marginBottom: 28 }}>
            <RevenueSummaryWidget />
          </div>

          {/* ALL HOMES - clickable grid */}
          <SectionCard style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🏠 REJG Legacy Properties — All Homes</div>
              <button onClick={() => navigate('/properties')} style={{ padding: '6px 14px', background: 'transparent', color: G.gold, border: `1px solid ${G.gold}44`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>View All →</button>
            </div>
            {properties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                {loading ? 'Loading properties...' : 'No properties configured yet. Add your first property to get started.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {properties.map(p => {
                  const occ = occupancy.filter(o => o.property_id === p.id && o.occupancy_status === 'active').length;
                  const total = p.total_bed_count || 0;
                  const pct = total > 0 ? Math.round((occ / total) * 100) : 0;
                  const statusColor = pct >= 100 ? G.rose : pct >= 80 ? G.amber : G.emerald;
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/property/${p.id}`)}
                      style={{ background: 'rgba(26,45,74,0.6)', border: `1px solid ${statusColor}33`, borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = statusColor; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${statusColor}33`; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{p.property_name || p.address || 'Property'}</div>
                        <span style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}44`, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                          {pct}% full
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                        <span>{occ}/{total} beds occupied</span>
                        <span style={{ color: statusColor }}>{total - occ} available</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${statusColor}, ${statusColor}88)`, borderRadius: 2, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>
                        {p.housing_model === 'turnkey_house' ? '🔑 Turnkey' : '🛏 Per-Bed'} · Click to manage
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        <SectionCard style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏠</div>
          <h2 style={{ color: '#fff', margin: '0 0 8px 0' }}>REJG Legacy Properties</h2>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>100% Drug & Alcohol Free Transitional Housing · Austin, Texas</p>
          <button onClick={() => navigate('/partner-portal')} style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, color: '#0a1628', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>
            Partner With Us
          </button>
        </SectionCard>
      )}

      {/* PARTNER CTA — visible to all */}
      <PartnerCTA navigate={navigate} />
    </div>
  );
}