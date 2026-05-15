import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const G = {
  navy: '#0a1628', navyMid: '#111d35', navyLight: '#1a2d4a',
  gold: '#d4af37', goldLight: '#f0d060',
  emerald: '#10b981', rose: '#f43f5e', amber: '#f59e0b',
  indigo: '#6366f1', cyan: '#06b6d4',
  border: 'rgba(212,175,55,0.18)',
  glass: 'rgba(17,29,53,0.85)',
};

const glass = (extra = {}) => ({
  background: G.glass,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${G.border}`,
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  ...extra,
});

const PARTNER_TYPES = [
  { icon: '⚖️', title: 'Courts & Pretrial', desc: 'Travis County courts, pretrial services, and magistrate offices. Fast placement for defendants with housing conditions.', color: G.indigo },
  { icon: '🏥', title: 'Treatment Programs', desc: 'Detox centers, inpatient rehab, IOP, and outpatient programs. Stable housing supports treatment success rates.', color: G.cyan },
  { icon: '🔄', title: 'Probation & Parole', desc: 'TDCJ parole officers and county probation departments. We provide the structured environment your clients need.', color: G.amber },
  { icon: '🤝', title: 'Nonprofits & Case Managers', desc: 'Social service orgs, case managers, HOH Foundation, LifeWorks, SAFE Alliance. Referral network integration available.', color: G.emerald },
  { icon: '🎖️', title: 'VA & Veteran Services', desc: 'VA HUD-VASH program, veteran service orgs, and peer support specialists. Priority placement for veterans.', color: G.gold },
  { icon: '💼', title: 'Employers & Workforce', desc: 'Employers offering returning citizen jobs and workforce development programs seeking stable housing for participants.', color: G.rose },
];

const BENEFITS = [
  { icon: '🛏', title: 'Real-Time Availability', desc: 'Check live bed availability. No guessing. Know before you refer.' },
  { icon: '📋', title: 'Streamlined Referrals', desc: 'Simple referral process. Online form, fast response, placement within 24-48 hours when beds available.' },
  { icon: '✅', title: '100% Drug & Alcohol Free', desc: 'Structured sober environment with house rules, accountability, and case management integration.' },
  { icon: '📊', title: 'Reporting & Documentation', desc: 'Compliance documentation, residency verification letters, court-ready status reports on request.' },
  { icon: '🔗', title: 'Case Coordination', desc: 'We coordinate directly with your team. MSA agreements available for ongoing partner organizations.' },
  { icon: '📞', title: 'Direct Line Access', desc: 'Partner organizations get direct phone access to our placement team. No phone trees.' },
];

const CURRENT_PARTNERS = [
  'Travis County Pretrial Services',
  'Integral Care',
  'Austin Recovery Network',
  'CommUnity Care',
  'VA HUD-VASH',
  'SAFE Alliance',
  'LifeWorks',
  'HOH Foundation',
];

export default function PartnerPortal() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ org: '', contact: '', phone: '', email: '', type: '', message: '', urgency: 'standard' });
  const [submitted, setSubmitted] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ background: G.navy, minHeight: '100vh', padding: '28px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>

      {/* HEADER */}
      <div style={{ ...glass(), padding: '40px', marginBottom: 28, background: 'linear-gradient(135deg, rgba(26,45,74,0.98) 0%, rgba(10,22,40,0.98) 60%, rgba(212,175,55,0.06) 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)' }} />
        <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${G.border}`, color: '#94a3b8', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 20 }}>← Back to Dashboard</button>
        <div style={{ fontSize: 11, fontWeight: 700, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>✦ Partnership Center</div>
        <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', margin: '0 0 12px 0', lineHeight: 1.1 }}>Partner With REJG Legacy Properties</h1>
        <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, maxWidth: 640, margin: '0 0 24px 0' }}>
          We provide <strong style={{ color: G.gold }}>100% drug and alcohol free</strong> transitional housing for justice-impacted individuals,
          homeless veterans, and turned-out foster youth across Austin, Texas. Partner with us to get
          your clients housed fast, with structure, accountability, and professional coordination.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ background: `rgba(16,185,129,0.12)`, border: `1px solid ${G.emerald}44`, color: G.emerald, padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>📞 737-999-0256</div>
          <div style={{ background: `rgba(212,175,55,0.12)`, border: `1px solid ${G.gold}44`, color: G.gold, padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>✉️ rejglegacyproperties@gmail.com</div>
          <div style={{ background: `rgba(99,102,241,0.12)`, border: `1px solid ${G.indigo}44`, color: G.indigo, padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>📍 Austin, Texas</div>
        </div>
      </div>

      {/* NAV TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[['overview','Overview'],['apply','Submit Referral'],['benefits','Partner Benefits'],['partners','Current Partners']].map(([k,l]) => (
          <button key={k} onClick={() => setActiveSection(k)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: activeSection === k ? `linear-gradient(135deg, ${G.gold}, ${G.goldLight})` : 'rgba(17,29,53,0.9)', color: activeSection === k ? '#0a1628' : '#94a3b8', transition: 'all 0.2s' }}>
            {l}
          </button>
        ))}
        <button onClick={() => navigate('/bed-search')} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${G.emerald}55`, cursor: 'pointer', fontSize: 13, fontWeight: 700, background: `rgba(16,185,129,0.1)`, color: G.emerald, marginLeft: 'auto' }}>
          🛏 Check Live Bed Availability
        </button>
      </div>

      {/* OVERVIEW */}
      {activeSection === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
            {PARTNER_TYPES.map(pt => (
              <div key={pt.title} style={{ ...glass(), padding: 24, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = pt.color; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{pt.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 8px 0' }}>{pt.title}</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{pt.desc}</p>
                <button onClick={() => setActiveSection('apply')} style={{ marginTop: 14, padding: '8px 16px', background: `${pt.color}15`, color: pt.color, border: `1px solid ${pt.color}44`, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                  Submit Referral →
                </button>
              </div>
            ))}
          </div>

          {/* HOW IT WORKS */}
          <div style={{ ...glass(), padding: 32, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>How The Referral Process Works</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { step: '01', title: 'Submit Referral', desc: 'Fill out the referral form with basic client info. No PII required initially.' },
                { step: '02', title: 'Screening Review', desc: 'We review eligibility within 24 hours and contact your team directly.' },
                { step: '03', title: 'Bed Assignment', desc: 'If a bed is available and client qualifies, we confirm placement within 48 hours.' },
                { step: '04', title: 'Move-In & Coordination', desc: 'We coordinate move-in and share status updates with your case manager.' },
              ].map(s => (
                <div key={s.step} style={{ background: 'rgba(26,45,74,0.6)', borderRadius: 12, padding: 20, border: `1px solid ${G.border}` }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: G.gold, opacity: 0.5, lineHeight: 1, marginBottom: 8 }}>{s.step}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* REFERRAL FORM */}
      {activeSection === 'apply' && (
        <div style={{ ...glass(), padding: 36, maxWidth: 680 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Submit a Referral</div>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24 }}>Do not include client PII. We'll collect that directly during screening.</p>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ color: '#fff', margin: '0 0 8px 0' }}>Referral Submitted!</h2>
              <p style={{ color: '#94a3b8', marginBottom: 24 }}>We'll contact {form.contact} at {form.org} within 24 hours to discuss placement.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => { setSubmitted(false); setForm({ org:'', contact:'', phone:'', email:'', type:'', message:'', urgency:'standard' }); }} style={{ padding: '10px 20px', background: G.glass, color: '#fff', border: `1px solid ${G.border}`, borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Submit Another</button>
                <button onClick={() => navigate('/')} style={{ padding: '10px 20px', background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, color: '#0a1628', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Back to Dashboard</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Organization Name *', key: 'org', placeholder: 'Travis County Pretrial Services', required: true },
                { label: 'Your Name & Title *', key: 'contact', placeholder: 'Jane Smith, Case Manager', required: true },
                { label: 'Phone Number *', key: 'phone', placeholder: '512-555-0100', required: true },
                { label: 'Email Address *', key: 'email', placeholder: 'jane@organization.org', required: true },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
                  <input
                    required={f.required}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', background: 'rgba(26,45,74,0.8)', border: `1px solid ${G.border}`, borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Organization Type *</label>
                <select required value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', background: 'rgba(26,45,74,0.8)', border: `1px solid ${G.border}`, borderRadius: 10, padding: '12px 16px', color: form.type ? '#fff' : '#64748b', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">Select type...</option>
                  <option>Court / Pretrial</option>
                  <option>Probation / Parole</option>
                  <option>Treatment Program</option>
                  <option>Nonprofit / Social Services</option>
                  <option>VA / Veteran Services</option>
                  <option>Workforce / Employer</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Urgency</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['standard','Standard (48hr)'],['urgent','Urgent (24hr)'],['emergency','Emergency (Same Day)']].map(([v,l]) => (
                    <button type="button" key={v} onClick={() => setForm(p => ({...p, urgency: v}))} style={{ flex: 1, padding: '10px', background: form.urgency === v ? `linear-gradient(135deg, ${G.gold}, ${G.goldLight})` : 'rgba(26,45,74,0.8)', color: form.urgency === v ? '#0a1628' : '#94a3b8', border: `1px solid ${form.urgency === v ? G.gold : G.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes (No Client PII)</label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Describe the general situation — housing conditions, program requirements, etc. Do not include client names, DOB, SSN, or case numbers."
                  style={{ width: '100%', background: 'rgba(26,45,74,0.8)', border: `1px solid ${G.border}`, borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <button type="submit" style={{ padding: '14px', background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, color: '#0a1628', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 900, fontSize: 15, letterSpacing: '0.04em', boxShadow: `0 4px 20px rgba(212,175,55,0.3)` }}>
                🤝 Submit Partner Referral
              </button>
              <p style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>Or call us directly: 737-999-0256 · rejglegacyproperties@gmail.com</p>
            </form>
          )}
        </div>
      )}

      {/* BENEFITS */}
      {activeSection === 'benefits' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {BENEFITS.map(b => (
            <div key={b.title} style={{ ...glass(), padding: 28 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{b.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 8px 0' }}>{b.title}</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* CURRENT PARTNERS */}
      {activeSection === 'partners' && (
        <div style={{ ...glass(), padding: 36 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: G.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Organizations We Work With</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            {CURRENT_PARTNERS.map(p => (
              <div key={p} style={{ background: 'rgba(212,175,55,0.08)', border: `1px solid ${G.border}`, color: G.goldLight, padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600 }}>✓ {p}</div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 24 }}>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              REJG Legacy Properties operates within a full ecosystem of housing, transportation,
              technology, and support services. Through our connection to Mission First Transport,
              REJG Legacy Labs, and Headquarters of Hope Foundation, our partners have access to a
              complete continuum of care — not just a bed.
            </p>
            <button onClick={() => setActiveSection('apply')} style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, color: '#0a1628', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>
              Become a Partner →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}