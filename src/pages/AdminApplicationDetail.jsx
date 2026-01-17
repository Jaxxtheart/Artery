import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

const ArrowLeft = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const Printer = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);

const Download = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const CheckCircle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

export default function AdminApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check authentication
    const isAuthenticated = sessionStorage.getItem('adminAuth');
    if (!isAuthenticated) {
      navigate('/admin');
      return;
    }

    loadApplication();
  }, [id, navigate]);

  const loadApplication = async () => {
    setLoading(true);
    setError('');

    try {
      const password = sessionStorage.getItem('adminAuth');
      const API_URL = import.meta.env.VITE_API_URL || '';

      const response = await fetch(`${API_URL}/api/applications/get?id=${id}`, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load application');
      }

      const data = await response.json();
      setApplication(data.application);
    } catch (err) {
      console.error('Error loading application:', err);
      setError('Failed to load application details. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!application) return;

    const reportData = {
      applicant: application.applicant,
      submittedAt: application.submittedAt,
      scoring: application.scoring
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${application.applicant.company.replace(/\s+/g, '-').toLowerCase()}-${application.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-red-500 mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">{error || 'Application not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const scoring = application.scoring;
  const data = application.applicationData;

  const ratingColors = {
    'Exceptional': 'bg-green-100 text-green-800 border-green-300',
    'Strong': 'bg-blue-100 text-blue-800 border-blue-300',
    'Good': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Moderate': 'bg-orange-100 text-orange-800 border-orange-300',
    'Needs Development': 'bg-red-100 text-red-800 border-red-300'
  };

  const scoreColor = scoring.overallScore >= 75 ? 'text-green-600' :
                     scoring.overallScore >= 65 ? 'text-blue-600' :
                     scoring.overallScore >= 50 ? 'text-yellow-600' : 'text-orange-600';

  return (
    <>
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 print:hidden">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>

          {/* Logo */}
          <div className="mb-8 text-center">
            <Link to="/" className="inline-block">
              <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="250">
                <defs>
                  <linearGradient id="flowGradDetail" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#FF5A5F',stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#E34850',stopOpacity:1}} />
                  </linearGradient>
                </defs>
                <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.3"/>
                <g transform="translate(40, 45)">
                  <path d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
                        stroke="url(#flowGradDetail)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M 35 15 Q 25 12, 18 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
                  <path d="M 50 15 Q 60 12, 67 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
                </g>
                <text x="160" y="85" fontFamily="'Helvetica Neue', 'Arial', sans-serif" fontSize="42" fontWeight="500" fill="#2C2C2C" letterSpacing="1">
                  Artery Capital
                </text>
                <path d="M 160 95 L 440 95" stroke="#FF5A5F" strokeWidth="1.5" opacity="0.3"/>
              </svg>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h1 className="text-4xl font-semibold mb-3 text-gray-900">Application Review</h1>
            <p className="text-lg text-gray-600">{application.applicant.company} - {application.applicant.name}</p>
            <p className="text-sm text-gray-500 mt-2">
              Submitted: {new Date(application.submittedAt).toLocaleDateString()} at {new Date(application.submittedAt).toLocaleTimeString()}
            </p>
          </div>

          {/* Print/Download Actions */}
          <div className="flex gap-4 justify-center mb-8 print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 font-medium transition"
            >
              <Printer className="w-5 h-5" />
              Print Results
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 border-2 border-red-500 text-white rounded-lg hover:bg-red-600 hover:border-red-600 font-medium transition"
            >
              <Download className="w-5 h-5" />
              Download Report
            </button>
          </div>

          {/* Applicant Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Applicant Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Company</p>
                <p className="text-lg text-gray-900">{application.applicant.company}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Founder</p>
                <p className="text-lg text-gray-900">{application.applicant.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-lg text-gray-900">{application.applicant.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Phone</p>
                <p className="text-lg text-gray-900">{application.applicant.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Country</p>
                <p className="text-lg text-gray-900 capitalize">{data.country}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Industry</p>
                <p className="text-lg text-gray-900 capitalize">{data.industry}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Stage</p>
                <p className="text-lg text-gray-900 capitalize">{data.stage}</p>
              </div>
            </div>
          </div>

          {/* Overall Score */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <div className="text-center mb-6">
              <div className={`text-7xl font-bold mb-3 ${scoreColor}`}>{scoring.overallScore}</div>
              <div className="text-2xl text-gray-500 mb-4">out of 100</div>
              <span className={`inline-block px-6 py-2 rounded-full border-2 font-semibold ${ratingColors[scoring.rating]}`}>
                {scoring.rating}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-6 mt-6">
              <p className="text-lg font-medium text-gray-900 mb-2">Recommendation</p>
              <p className="text-gray-700">{scoring.recommendation}</p>
            </div>
          </div>

          {/* Valuation */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg shadow-sm border border-red-200 p-8 mb-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Estimated Valuation</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2">Current Valuation</p>
                <p className="text-3xl font-bold text-gray-900">${(scoring.valuation.current.amount / 1000).toFixed(0)}K</p>
                <p className="text-xs text-gray-500 mt-2">Based on current metrics</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2">3-Year Projection</p>
                <p className="text-3xl font-bold text-blue-600">${(scoring.valuation.projected3Year.amount / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-gray-500 mt-2">{scoring.valuation.projected3Year.assumptions.growthMultiplier}x growth multiplier</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2">5-Year Projection</p>
                <p className="text-3xl font-bold text-green-600">${(scoring.valuation.projected5Year.amount / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-gray-500 mt-2">{scoring.valuation.projected5Year.assumptions.growthMultiplier}x growth multiplier</p>
              </div>
            </div>
          </div>

          {/* Category Scores */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Evaluation Breakdown</h2>
            <div className="space-y-4">
              {Object.entries(scoring.categoryScores).map(([category, score]) => {
                const categoryNames = {
                  founderQuality: 'Founder Quality',
                  traction: 'Traction & Metrics',
                  productMarketFit: 'Product-Market Fit',
                  marketOpportunity: 'Market Opportunity',
                  innovation: 'Innovation',
                  africanImpact: 'African Impact',
                  sustainability: 'Sustainability'
                };
                const weight = scoring.weights[category];
                const barColor = score >= 75 ? 'bg-green-500' :
                               score >= 60 ? 'bg-blue-500' :
                               score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{categoryNames[category]}</span>
                      <span className="text-sm text-gray-600">{score}/100 ({weight}% weight)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`${barColor} h-3 rounded-full transition-all`} style={{width: `${score}%`}}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Concerns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Key Strengths</h3>
              <ul className="space-y-2">
                {scoring.strengths.map((strength, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-600 flex-shrink-0">✓</span>
                    <span className="text-sm text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Areas for Improvement</h3>
              <ul className="space-y-2">
                {scoring.concerns.map((concern, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-orange-600 flex-shrink-0">•</span>
                    <span className="text-sm text-gray-700">{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">Recommended Next Steps</h3>
            {scoring.nextSteps.map((step, i) => (
              <div key={i} className="flex gap-3 mb-4 last:mb-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-red-600 font-semibold text-sm">{i + 1}</span>
                </div>
                <div>
                  <p className="text-gray-700">{step}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Print Footer */}
          <div className="hidden print:block text-center text-sm text-gray-600 mt-8 pt-6 border-t border-gray-200">
            <p>Artery Capital - Admin Application Review</p>
            <p>Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
            <p className="mt-2">Application ID: {application.id}</p>
            <p>Company: {application.applicant.company} - Founder: {application.applicant.name}</p>
          </div>
        </div>
      </div>
    </>
  );
}
