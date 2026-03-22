import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Lock = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const Eye = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOff = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'artery2024') {
      setIsAuthenticated(true);
      setAuthError('');
      fetchApplications();
    } else {
      setAuthError('Invalid password');
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/applications');
      if (!response.ok) throw new Error('Failed to fetch applications');
      const data = await response.json();
      setApplications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Lock className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-semibold text-white">Admin Access</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Applications</h1>
          <Link to="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            Back to site
          </Link>
        </div>

        {loading && <p className="text-gray-400">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && !error && applications.length === 0 && (
          <p className="text-gray-500">No applications yet.</p>
        )}

        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-white font-semibold">{app.name}</h2>
                  <p className="text-gray-400 text-sm">{app.email}</p>
                </div>
                <span className="text-gray-500 text-xs">{new Date(app.created_at).toLocaleDateString()}</span>
              </div>
              {app.message && <p className="text-gray-300 text-sm mt-3">{app.message}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
