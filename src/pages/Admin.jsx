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
        </div>
      </div>
    </div>
  );
}
