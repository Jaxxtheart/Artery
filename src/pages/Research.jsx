import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// ── SVG icons ────────────────────────────────────────────────
const FileText = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const Download = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ExternalLink = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ── Helpers ──────────────────────────────────────────────────
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// ── Component ────────────────────────────────────────────────
export default function Research() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    setLoading(true);
    setError('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/research/list`);
      if (!res.ok) throw new Error('Failed to load research papers');
      const data = await res.json();
      setPapers(data.papers || []);
    } catch (err) {
      setError('Unable to load research papers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <style>{`
        body { margin: 0; padding: 0; }

        /* ── Nav ── */
        .research-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }
        .research-nav a { text-decoration: none; }
        .nav-link {
          font-size: 14px;
          font-weight: 500;
          color: #5A5A5A;
          text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #FF5A5F; }
        .apply-btn {
          display: inline-block;
          padding: 8px 20px;
          background: #2C2C2C;
          color: #fff;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.2s;
        }
        .apply-btn:hover { background: #1A1A1A; }

        /* ── Hero ── */
        .research-hero {
          background: linear-gradient(160deg, #fff 0%, #FFF5F5 60%, #FFF0E8 100%);
          padding: 100px 24px 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .research-hero::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(255,90,95,0.06) 0%, transparent 70%);
          border-radius: 50%;
        }
        .research-hero h1 {
          font-size: 56px;
          font-weight: 600;
          letter-spacing: -1.2px;
          color: #1A1A1A;
          margin: 0 0 16px;
        }
        .research-hero h1 span { color: #FF5A5F; }
        .research-hero p {
          font-size: 20px;
          color: #6A6A6A;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.7;
        }
        .hero-divider {
          width: 48px;
          height: 3px;
          background: linear-gradient(90deg, #FF5A5F, transparent);
          margin: 32px auto 0;
          border-radius: 2px;
        }

        /* ── Papers Grid ── */
        .papers-section {
          max-width: 1100px;
          margin: 0 auto;
          padding: 80px 24px 120px;
        }
        .papers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 28px;
          margin-top: 48px;
        }

        /* ── Paper Card ── */
        .paper-card {
          background: #fff;
          border: 1px solid #EAEAEA;
          border-radius: 12px;
          padding: 28px;
          transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
        }
        .paper-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          transform: translateY(-3px);
          border-color: #FF5A5F;
        }
        .paper-icon-wrap {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, #FFF0F0, #FFE4E4);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          flex-shrink: 0;
        }
        .paper-card h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1A1A1A;
          margin: 0 0 10px;
          line-height: 1.4;
        }
        .paper-card p {
          font-size: 14px;
          color: #6A6A6A;
          line-height: 1.6;
          margin: 0 0 20px;
          flex: 1;
        }
        .paper-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid #F0F0F0;
        }
        .paper-date {
          font-size: 12px;
          color: #9A9A9A;
        }
        .paper-size {
          font-size: 12px;
          color: #9A9A9A;
        }
        .paper-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }
        .btn-read {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          background: #FF5A5F;
          color: #fff;
          border-radius: 7px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.2s;
        }
        .btn-read:hover { background: #E34850; }
        .btn-download {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 14px;
          background: #F5F5F5;
          color: #2C2C2C;
          border-radius: 7px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.2s;
        }
        .btn-download:hover { background: #EAEAEA; }

        /* ── Empty / Loading states ── */
        .state-center {
          text-align: center;
          padding: 80px 0;
        }
        .state-center h3 {
          font-size: 22px;
          font-weight: 600;
          color: #2C2C2C;
          margin: 16px 0 8px;
        }
        .state-center p {
          font-size: 16px;
          color: #6A6A6A;
        }
        .spinner {
          display: inline-block;
          width: 48px;
          height: 48px;
          border: 4px solid #F0F0F0;
          border-top-color: #FF5A5F;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Footer ── */
        .research-footer {
          padding: 40px 24px;
          background: #1A1A1A;
          color: #8A8A8A;
          text-align: center;
          font-size: 13px;
        }

        @media (max-width: 640px) {
          .research-hero h1 { font-size: 36px; }
          .research-hero p { font-size: 17px; }
          .papers-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Navigation ── */}
      <nav className="research-nav">
        <Link to="/">
          <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="180">
            <defs>
              <linearGradient id="flowGradResearch" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#FF5A5F', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#E34850', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.3" />
            <g transform="translate(40, 45)">
              <path
                d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
                stroke="url(#flowGradResearch)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"
              />
            </g>
            <text x="160" y="85" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="42" fontWeight="500" fill="#2C2C2C" letterSpacing="1">
              Artery Capital
            </text>
            <path d="M 160 95 L 440 95" stroke="#FF5A5F" strokeWidth="1.5" opacity="0.3" />
          </svg>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/research" className="nav-link" style={{ color: '#FF5A5F' }}>Research</Link>
          <Link to="/apply" className="apply-btn">Apply Now</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="research-hero">
        <h1>Research &amp; <span>Insights</span></h1>
        <p>
          Curated research, market analyses, and thought leadership on African innovation,
          venture capital, and the startup ecosystem.
        </p>
        <div className="hero-divider" />
      </section>

      {/* ── Papers ── */}
      <section className="papers-section">
        {loading && (
          <div className="state-center">
            <div className="spinner" />
            <p style={{ marginTop: 16, color: '#6A6A6A' }}>Loading research papers…</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-center">
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button
              onClick={loadPapers}
              style={{
                marginTop: 20,
                padding: '10px 24px',
                background: '#FF5A5F',
                color: '#fff',
                border: 'none',
                borderRadius: 7,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && papers.length === 0 && (
          <div className="state-center">
            <FileText className="w-16 h-16" style={{ width: 56, height: 56, color: '#D0D0D0', margin: '0 auto' }} />
            <h3>No research published yet</h3>
            <p>Check back soon — we are working on our first publications.</p>
          </div>
        )}

        {!loading && !error && papers.length > 0 && (
          <div className="papers-grid">
            {papers.map((paper) => (
              <div key={paper.id} className="paper-card">
                <div className="paper-icon-wrap">
                  <FileText style={{ width: 26, height: 26, color: '#FF5A5F' }} />
                </div>

                <h3>{paper.title}</h3>
                {paper.description && <p>{paper.description}</p>}

                <div className="paper-actions">
                  <a
                    href={paper.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-read"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink style={{ width: 14, height: 14 }} />
                    Read
                  </a>
                  <a
                    href={paper.file_url}
                    download={paper.file_name}
                    className="btn-download"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download style={{ width: 14, height: 14 }} />
                    Download
                  </a>
                </div>

                <div className="paper-meta">
                  <span className="paper-date">{formatDate(paper.created_at)}</span>
                  {paper.file_size && (
                    <span className="paper-size">{formatFileSize(paper.file_size)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="research-footer">
        © {new Date().getFullYear()} Artery Capital. All rights reserved.
      </footer>
    </div>
  );
}
