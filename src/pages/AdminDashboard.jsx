import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/* ── Inline SVG icons ── */
const LogOut = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);
const FileText = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
  </svg>
);
const ChevronRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);
const Eye = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const TrendingUp = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
    <polyline points="16 7 22 7 22 13"></polyline>
  </svg>
);

/* ── Shared Artery logo mark (SVG) ── */
function ArteryLogo({ width = 260, textColor = '#2C2C2C', gradId = 'flowGradDash' }) {
  return (
    <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width={width}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FF5A5F', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#E34850', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.3" />
      <g transform="translate(40, 45)">
        <path
          d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
          stroke={`url(#${gradId})`} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M 35 15 Q 25 12, 18 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M 50 15 Q 60 12, 67 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
        <circle cx="45" cy="28" r="2" fill="#FF5A5F">
          <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
      <text x="160" y="85" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="42" fontWeight="500" fill={textColor} letterSpacing="1">
        Artery Capital
      </text>
      <path d="M 160 95 L 440 95" stroke="#FF5A5F" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}

const getRatingColor = (score) => {
  if (score >= 75) return 'bg-green-50 text-green-800 border-green-200';
  if (score >= 65) return 'bg-blue-50 text-blue-800 border-blue-200';
  if (score >= 50) return 'bg-yellow-50 text-yellow-800 border-yellow-200';
  return 'bg-red-50 text-red-700 border-red-200';
};

export default function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('adminAuth');
    if (!isAuthenticated) { navigate('/admin'); return; }
    loadApplications();
  }, [navigate]);

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const password = sessionStorage.getItem('adminAuth');
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/applications/list`, {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (!response.ok) throw new Error('Failed to load applications');
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err) {
      setError('Failed to load applications. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    navigate('/admin');
  };

  const total = applications.length;
  const highScore = applications.filter(a => a.scoring?.overallScore >= 75).length;
  const goodScore = applications.filter(a => a.scoring?.overallScore >= 65 && a.scoring?.overallScore < 75).length;
  const needReview = applications.filter(a => a.scoring?.overallScore < 65).length;

  return (
    <div style={{ margin: 0, padding: 0, background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F8F6 100%)', minHeight: '100vh', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>

      {/* ── Top navigation bar ── */}
      <header style={{ background: '#fff', borderBottom: '1px solid #EBEBEA', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            <ArteryLogo width={180} textColor="#2C2C2C" gradId="flowGradNav" />
          </Link>

          {/* Right nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/trading"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', background: '#2C2C2C', color: '#fff',
                textDecoration: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
                letterSpacing: '0.2px', transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1A1A1A'}
              onMouseLeave={e => e.currentTarget.style.background = '#2C2C2C'}
            >
              <TrendingUp className={undefined} style={{ width: 14, height: 14 }} />
              Artery Wealth Builder
              <span style={{
                display: 'inline-block', background: '#FF5A5F', color: '#fff',
                fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                padding: '2px 6px', borderRadius: 20, marginLeft: 2,
              }}>Live</span>
            </Link>

            <div style={{ width: 1, height: 24, background: '#EBEBEA' }} />

            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: 'transparent', color: '#6A6A6A',
                border: '1px solid #E0E0DE', borderRadius: 6, fontSize: 13,
                fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F5'; e.currentTarget.style.color = '#2C2C2C'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6A6A6A'; }}
            >
              <LogOut style={{ width: 14, height: 14 }} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 32px' }}>

        {/* Page heading */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 36, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.5px', margin: 0 }}>
              Admin Dashboard
            </h1>
            <span style={{ display: 'inline-block', width: 6, height: 6, background: '#FF5A5F', borderRadius: '50%' }} />
          </div>
          <p style={{ color: '#8A8A8A', fontSize: 16, margin: 0 }}>Review and manage funding applications</p>
          <div style={{ marginTop: 16, width: 48, height: 2, background: 'linear-gradient(90deg, #FF5A5F 0%, transparent 100%)' }} />
        </div>

        {/* ── Artery Wealth Builder feature card ── */}
        <div style={{
          background: '#1A1A1A',
          borderRadius: 12,
          padding: '28px 32px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle background glow */}
          <div style={{
            position: 'absolute', top: '-60px', right: '-40px',
            width: 220, height: 220,
            background: 'radial-gradient(circle, rgba(255,90,95,0.12) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
            {/* Mini logo mark */}
            <div style={{
              width: 48, height: 48, background: 'rgba(255,90,95,0.12)',
              border: '1px solid rgba(255,90,95,0.25)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg viewBox="0 0 46 70" width="20" height="26">
                <path d="M 0 55 C 0 40, 5 25, 15 15 C 20 8, 25 8, 30 15 C 35 22, 37 30, 35 40 L 30 52 M 10 52 C 12 35, 18 28, 25 28 C 32 28, 38 35, 40 52 M 10 52 C 10 58, 12 62, 15 65 C 20 70, 30 70, 35 65 C 38 62, 40 58, 40 52"
                  stroke="#FF5A5F" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px' }}>
                  Artery Wealth Builder
                </span>
                <span style={{
                  background: '#FF5A5F', color: '#fff', fontSize: 9, fontWeight: 700,
                  letterSpacing: '1.2px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20,
                }}>Live</span>
              </div>
              <p style={{ color: '#8A8A8A', fontSize: 14, margin: 0 }}>
                Algorithmic trading dashboard — Coinbase · Auto signals · Daily reports
              </p>
            </div>
          </div>

          <Link
            to="/trading"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 24px', background: '#FF5A5F', color: '#fff',
              textDecoration: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500,
              letterSpacing: '0.2px', transition: 'background 0.2s', position: 'relative', zIndex: 1,
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#E34850'}
            onMouseLeave={e => e.currentTarget.style.background = '#FF5A5F'}
          >
            Open Dashboard
            <ChevronRight style={{ width: 16, height: 16 }} />
          </Link>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Applications', value: total, color: '#2C2C2C' },
            { label: 'High Score (75+)', value: highScore, color: '#16A34A' },
            { label: 'Good Score (65–74)', value: goodScore, color: '#2563EB' },
            { label: 'Need Review (<65)', value: needReview, color: '#EA580C' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#fff', border: '1px solid #EBEBEA', borderRadius: 10,
              padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#8A8A8A', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8, margin: 0 }}>
                {label}
              </p>
              <p style={{ fontSize: 32, fontWeight: 700, color, margin: '8px 0 0' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Applications table ── */}
        <div style={{ background: '#fff', border: '1px solid #EBEBEA', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #EBEBEA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', margin: 0, letterSpacing: '-0.3px' }}>Applications</h2>
              <p style={{ fontSize: 13, color: '#8A8A8A', margin: '4px 0 0' }}>Click any row to view the full evaluation</p>
            </div>
            <button
              onClick={loadApplications}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                background: 'transparent', color: '#6A6A6A', border: '1px solid #E0E0DE',
                borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>

          {loading && (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: 36, height: 36, border: '3px solid #EBEBEA', borderTopColor: '#FF5A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ marginTop: 16, color: '#8A8A8A', fontSize: 14 }}>Loading applications…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {error && (
            <div style={{ padding: '16px 28px' }}>
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px' }}>
                <p style={{ color: '#DC2626', fontSize: 14, margin: 0 }}>{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && applications.length === 0 && (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <FileText style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, fontWeight: 500, color: '#1A1A1A', margin: '0 0 8px' }}>No applications yet</p>
              <p style={{ color: '#8A8A8A', fontSize: 14, margin: '0 0 24px' }}>Applications will appear here once founders submit them</p>
              <Link
                to="/apply"
                style={{ display: 'inline-block', padding: '10px 24px', background: '#FF5A5F', color: '#fff', textDecoration: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500 }}
              >
                Submit Test Application
              </Link>
            </div>
          )}

          {!loading && !error && applications.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFAF9', borderBottom: '1px solid #EBEBEA' }}>
                    {['Company', 'Founder', 'Industry', 'Score', 'Rating', 'Submitted', ''].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8A8A8A', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, i) => (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/admin/application/${app.id}`)}
                      style={{
                        cursor: 'pointer', borderBottom: i < applications.length - 1 ? '1px solid #F5F5F4' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFAF9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 500, color: '#1A1A1A', fontSize: 14 }}>{app.applicant.company}</div>
                        <div style={{ fontSize: 12, color: '#8A8A8A', marginTop: 2, textTransform: 'capitalize' }}>{app.applicationData?.country}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: 14, color: '#2C2C2C' }}>{app.applicant.name}</div>
                        <div style={{ fontSize: 12, color: '#8A8A8A', marginTop: 2 }}>{app.applicant.email}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: 14, color: '#2C2C2C', textTransform: 'capitalize' }}>{app.applicationData?.industry}</div>
                        <div style={{ fontSize: 12, color: '#8A8A8A', marginTop: 2, textTransform: 'capitalize' }}>{app.applicationData?.stage}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A' }}>{app.scoring?.overallScore}</span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px',
                          border: '1px solid', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          ...(() => {
                            const s = app.scoring?.overallScore;
                            if (s >= 75) return { background: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0' };
                            if (s >= 65) return { background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' };
                            if (s >= 50) return { background: '#FFFBEB', color: '#B45309', borderColor: '#FDE68A' };
                            return { background: '#FEF2F2', color: '#B91C1C', borderColor: '#FECACA' };
                          })()
                        }}>
                          {app.scoring?.rating}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#8A8A8A' }}>
                        {new Date(app.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#FF5A5F', fontSize: 13, fontWeight: 500 }}>
                          <Eye style={{ width: 14, height: 14 }} />
                          View
                          <ChevronRight style={{ width: 14, height: 14 }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, textAlign: 'center', paddingTop: 24, borderTop: '1px solid #EBEBEA' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <ArteryLogo width={140} textColor="#C0C0C0" gradId="flowGradFooter" />
          </Link>
          <p style={{ color: '#C0C0C0', fontSize: 12, marginTop: 8 }}>© 2026 Artery Capital · Admin</p>
        </div>
      </main>
    </div>
  );
}
