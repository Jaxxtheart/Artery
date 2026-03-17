import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Admin() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/applications');
      if (!response.ok) throw new Error('Failed to fetch applications');
      const data = await response.json();
      setApplications(data);
    } catch (err) {
      setError(err.message);
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Lock = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

export default function Admin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated
    const isAuthenticated = sessionStorage.getItem('adminAuth');
    if (isAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simple password check
      // In production, this should be a proper API call
      const adminPassword = 'admin123'; // This should match ADMIN_PASSWORD env var

      if (password === adminPassword) {
        sessionStorage.setItem('adminAuth', password);
        navigate('/admin/dashboard');
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const updateDecision = async (id, decision) => {
    try {
      const response = await fetch(`http://localhost:3001/api/applications/${id}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      if (!response.ok) throw new Error('Failed to update decision');
      fetchApplications();
    } catch (err) {
      alert('Error updating decision: ' + err.message);
    }
  };

  return (
    <div>
      <style>{`
        body { margin: 0; padding: 0; background: #F8F8F6; font-family: 'Helvetica Neue', Arial, sans-serif; }
        .admin-container { max-width: 1400px; margin: 0 auto; padding: 40px 20px; }
        .admin-header { margin-bottom: 40px; display: flex; justify-content: space-between; align-items: center; }
        .admin-header h1 { font-size: 36px; font-weight: 600; color: #1A1A1A; margin: 0; }
        .back-link { color: #FF5A5F; text-decoration: none; font-weight: 500; }
        .back-link:hover { text-decoration: underline; }
        .applications-grid { display: grid; gap: 24px; }
        .application-card { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .application-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; }
        .application-info h3 { font-size: 20px; font-weight: 600; color: #1A1A1A; margin: 0 0 8px 0; }
        .application-info p { font-size: 14px; color: #6A6A6A; margin: 4px 0; }
        .score-badge { display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #FF5A5F 0%, #E34850 100%); color: white; border-radius: 20px; font-weight: 600; font-size: 18px; }
        .score-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 20px 0; }
        .score-item { padding: 12px; background: #F8F8F6; border-radius: 6px; }
        .score-item-label { font-size: 12px; color: #6A6A6A; margin-bottom: 4px; }
        .score-item-value { font-size: 16px; font-weight: 600; color: #1A1A1A; }
        .valuation { margin: 20px 0; padding: 16px; background: #F0FFF4; border-left: 4px solid #48BB78; border-radius: 4px; }
        .valuation h4 { margin: 0 0 8px 0; color: #2F855A; font-size: 14px; font-weight: 600; }
        .valuation-amounts { display: flex; gap: 24px; }
        .valuation-amount { }
        .valuation-amount-label { font-size: 12px; color: #6A6A6A; }
        .valuation-amount-value { font-size: 18px; font-weight: 600; color: #2F855A; }
        .decision-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #E0E0DE; }
        .decision-buttons { display: flex; gap: 12px; }
        .decision-button { padding: 10px 20px; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .decision-button.accept { background: #48BB78; color: white; }
        .decision-button.accept:hover { background: #38A169; }
        .decision-button.reject { background: #F56565; color: white; }
        .decision-button.reject:hover { background: #E53E3E; }
        .decision-button.pending { background: #EDF2F7; color: #4A5568; }
        .decision-button.pending:hover { background: #E2E8F0; }
        .decision-status { display: inline-block; padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: 500; }
        .decision-status.accepted { background: #C6F6D5; color: #2F855A; }
        .decision-status.rejected { background: #FED7D7; color: #C53030; }
        .decision-status.pending { background: #EDF2F7; color: #4A5568; }
        .loading { text-align: center; padding: 60px 20px; font-size: 18px; color: #6A6A6A; }
        .error { text-align: center; padding: 60px 20px; font-size: 18px; color: #F56565; }
        .timestamp { font-size: 12px; color: #8A8A8A; margin-top: 8px; }
      `}</style>

      <div className="admin-container">
        <div className="admin-header">
          <h1>Investment Applications Dashboard</h1>
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>

        {loading && <div className="loading">Loading applications...</div>}
        {error && <div className="error">Error: {error}</div>}

        {!loading && !error && applications.length === 0 && (
          <div className="loading">No applications yet</div>
        )}

        <div className="applications-grid">
          {applications.map((app) => (
            <div key={app.id} className="application-card">
              <div className="application-header">
                <div className="application-info">
                  <h3>{app.startupName}</h3>
                  <p><strong>Founder:</strong> {app.founderName}</p>
                  <p><strong>Email:</strong> {app.email}</p>
                  <p><strong>Website:</strong> {app.website || 'N/A'}</p>
                  <p className="timestamp">
                    Submitted: {new Date(app.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="score-badge">
                  {app.evaluation?.totalScore || 0}/100
                </div>
              </div>

              {app.evaluation && (
                <>
                  <div className="score-details">
                    <div className="score-item">
                      <div className="score-item-label">Founder Quality</div>
                      <div className="score-item-value">{app.evaluation.scores.founderQuality}/100</div>
                    </div>
                    <div className="score-item">
                      <div className="score-item-label">Traction</div>
                      <div className="score-item-value">{app.evaluation.scores.traction}/100</div>
                    </div>
                    <div className="score-item">
                      <div className="score-item-label">Product-Market Fit</div>
                      <div className="score-item-value">{app.evaluation.scores.productMarketFit}/100</div>
                    </div>
                    <div className="score-item">
                      <div className="score-item-label">Market Opportunity</div>
                      <div className="score-item-value">{app.evaluation.scores.marketOpportunity}/100</div>
                    </div>
                    <div className="score-item">
                      <div className="score-item-label">Innovation</div>
                      <div className="score-item-value">{app.evaluation.scores.innovation}/100</div>
                    </div>
                    <div className="score-item">
                      <div className="score-item-label">African Impact</div>
                      <div className="score-item-value">{app.evaluation.scores.africanImpact}/100</div>
                    </div>
                    <div className="score-item">
                      <div className="score-item-label">Sustainability</div>
                      <div className="score-item-value">{app.evaluation.scores.sustainability}/100</div>
                    </div>
                  </div>

                  {app.evaluation.valuation && (
                    <div className="valuation">
                      <h4>Estimated Valuation</h4>
                      <div className="valuation-amounts">
                        <div className="valuation-amount">
                          <div className="valuation-amount-label">Current</div>
                          <div className="valuation-amount-value">
                            ${app.evaluation.valuation.currentValuation.toLocaleString()}
                          </div>
                        </div>
                        <div className="valuation-amount">
                          <div className="valuation-amount-label">Projected (3-5 years)</div>
                          <div className="valuation-amount-value">
                            ${app.evaluation.valuation.projectedValuation.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="decision-section">
                {app.decision ? (
                  <div>
                    <span className={`decision-status ${app.decision.toLowerCase()}`}>
                      {app.decision.toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="decision-buttons">
                    <button
                      className="decision-button accept"
                      onClick={() => updateDecision(app.id, 'Accepted')}
                    >
                      Accept
                    </button>
                    <button
                      className="decision-button reject"
                      onClick={() => updateDecision(app.id, 'Rejected')}
                    >
                      Reject
                    </button>
                    <button
                      className="decision-button pending"
                      onClick={() => updateDecision(app.id, 'Pending')}
                    >
                      Mark as Pending
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Link to="/" className="inline-block mb-8">
          <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="250">
            <defs>
              <linearGradient id="flowGradAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#FF5A5F',stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:'#E34850',stopOpacity:1}} />
              </linearGradient>
            </defs>
            <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.3"/>
            <g transform="translate(40, 45)">
              <path d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
                    stroke="url(#flowGradAdmin)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M 35 15 Q 25 12, 18 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
              <path d="M 50 15 Q 60 12, 67 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
            </g>
            <text x="160" y="85" fontFamily="'Helvetica Neue', 'Arial', sans-serif" fontSize="42" fontWeight="500" fill="#FFFFFF" letterSpacing="1">
              Artery Capital
            </text>
            <path d="M 160 95 L 440 95" stroke="#FF5A5F" strokeWidth="1.5" opacity="0.3"/>
          </svg>
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Admin Login</h1>
            <p className="text-gray-600">Access the application dashboard</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter admin password"
                required
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              For demo purposes, the password is: <code className="bg-gray-100 px-2 py-1 rounded">admin123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
