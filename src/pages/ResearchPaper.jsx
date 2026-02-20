import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';

const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export default function ResearchPaper() {
  const { id } = useParams();
  const location = useLocation();

  const [paper, setPaper] = useState(location.state?.paper || null);
  const [loading, setLoading] = useState(!paper);
  const [error, setError] = useState('');

  useEffect(() => {
    if (paper) return;
    const fetchPaper = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/research/list`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        const found = (data.papers || []).find((p) => p.id === id);
        if (!found) throw new Error('Paper not found');
        setPaper(found);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPaper();
  }, [id, paper]);

  return (
    <div>
      <style>{`
        body { margin: 0; padding: 0; }

        /* ── Nav ── */
        .viewer-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
          gap: 16px;
        }
        .viewer-nav a { text-decoration: none; }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #5A5A5A;
          text-decoration: none;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        .back-btn:hover { color: #FF5A5F; }
        .viewer-nav-title {
          font-size: 15px;
          font-weight: 600;
          color: #1A1A1A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          text-align: center;
        }
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
          flex-shrink: 0;
        }
        .apply-btn:hover { background: #1A1A1A; }

        /* ── Viewer wrapper ── */
        .viewer-wrap {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 64px);
          background: #F5F5F5;
        }

        /* ── Paper header strip ── */
        .paper-header {
          padding: 16px 24px;
          background: #fff;
          border-bottom: 1px solid #EAEAEA;
        }
        .paper-header h1 {
          font-size: 20px;
          font-weight: 600;
          color: #1A1A1A;
          margin: 0 0 4px;
        }
        .paper-header p {
          font-size: 14px;
          color: #6A6A6A;
          margin: 0;
        }

        /* ── PDF iframe ── */
        .pdf-frame {
          flex: 1;
          width: 100%;
          border: none;
          display: block;
        }

        /* ── State screens ── */
        .state-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 24px;
        }
        .spinner {
          display: inline-block;
          width: 40px;
          height: 40px;
          border: 4px solid #F0F0F0;
          border-top-color: #FF5A5F;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .state-center h3 { font-size: 20px; font-weight: 600; color: #2C2C2C; margin: 16px 0 8px; }
        .state-center p  { font-size: 15px; color: #6A6A6A; }

        @media (max-width: 640px) {
          .viewer-nav-title { display: none; }
        }
      `}</style>

      {/* ── Navigation ── */}
      <nav className="viewer-nav">
        <Link to="/research" className="back-btn">
          <ArrowLeft />
          All Research
        </Link>
        {paper && <span className="viewer-nav-title">{paper.title}</span>}
        <Link to="/apply" className="apply-btn">Apply Now</Link>
      </nav>

      <div className="viewer-wrap">
        {loading && (
          <div className="state-center">
            <div className="spinner" />
            <p style={{ marginTop: 16, color: '#6A6A6A' }}>Loading paper…</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-center">
            <h3>Paper not found</h3>
            <p>{error}</p>
            <Link
              to="/research"
              style={{
                marginTop: 20,
                padding: '10px 24px',
                background: '#FF5A5F',
                color: '#fff',
                borderRadius: 7,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none'
              }}
            >
              Back to Research
            </Link>
          </div>
        )}

        {!loading && !error && paper && (
          <>
            <div className="paper-header">
              <h1>{paper.title}</h1>
              {paper.description && <p>{paper.description}</p>}
            </div>
            <iframe
              className="pdf-frame"
              src={paper.file_url}
              title={paper.title}
            />
          </>
        )}
      </div>
    </div>
  );
}
