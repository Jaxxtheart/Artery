import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
    <polyline points="10 9 9 9 8 9"></polyline>
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

export default function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const isAuthenticated = sessionStorage.getItem('adminAuth');
    if (!isAuthenticated) {
      navigate('/admin');
      return;
    }

    // Load applications
    loadApplications();
  }, [navigate]);

  const loadApplications = async () => {
    setLoading(true);
    setError('');

    try {
      const password = sessionStorage.getItem('adminAuth');
      const API_URL = import.meta.env.VITE_API_URL || '';

      const response = await fetch(`${API_URL}/api/applications/list`, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load applications');
      }

      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error('Error loading applications:', err);
      setError('Failed to load applications. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    navigate('/admin');
  };

  const getRatingColor = (score) => {
    if (score >= 75) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 65) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <Link to="/" className="inline-block">
            <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="250">
              <defs>
                <linearGradient id="flowGradDashboard" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#FF5A5F',stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#E34850',stopOpacity:1}} />
                </linearGradient>
              </defs>
              <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.3"/>
              <g transform="translate(40, 45)">
                <path d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
                      stroke="url(#flowGradDashboard)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Review and manage applications</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Applications</p>
            <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">High Score (75+)</p>
            <p className="text-3xl font-bold text-green-600">
              {applications.filter(a => a.scoring?.overallScore >= 75).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Good Score (65-74)</p>
            <p className="text-3xl font-bold text-blue-600">
              {applications.filter(a => a.scoring?.overallScore >= 65 && a.scoring?.overallScore < 75).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">Need Review (&lt;65)</p>
            <p className="text-3xl font-bold text-orange-600">
              {applications.filter(a => a.scoring?.overallScore < 65).length}
            </p>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Applications</h2>
                <p className="text-sm text-gray-500 mt-1">Click on any application to view detailed evaluation results</p>
              </div>
            </div>
          </div>

          {loading && (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-red-500"></div>
              <p className="mt-4 text-gray-600">Loading applications...</p>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && applications.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No applications yet</p>
              <p className="text-gray-600 mb-4">Applications will appear here once founders submit them</p>
              <Link
                to="/apply"
                className="inline-block px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Submit Test Application
              </Link>
            </div>
          )}

          {!loading && !error && applications.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Founder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/admin/application/${app.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 hover:text-red-600 transition-colors">
                          {app.applicant.company}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">{app.applicationData?.country}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{app.applicant.name}</div>
                        <div className="text-sm text-gray-500">{app.applicant.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">{app.applicationData?.industry}</div>
                        <div className="text-sm text-gray-500 capitalize">{app.applicationData?.stage}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-2xl font-bold text-gray-900">{app.scoring?.overallScore}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold ${getRatingColor(app.scoring?.overallScore)}`}>
                          {app.scoring?.rating}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium">
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
