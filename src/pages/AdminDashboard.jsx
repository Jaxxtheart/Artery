import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ── SVG icons ────────────────────────────────────────────────
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

const Upload = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 16 12 12 8 16"></polyline>
    <line x1="12" y1="12" x2="12" y2="21"></line>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
  </svg>
);

const Trash2 = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const ExternalLink = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
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
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// ── Main Component ───────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Research state
  const [papers, setPapers] = useState([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papersError, setPapersError] = useState('');
  const [uploadForm, setUploadForm] = useState({ title: '', description: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('adminAuth');
    if (!isAuthenticated) {
      navigate('/admin');
      return;
    }
    loadApplications();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'research') {
      loadPapers();
    }
  }, [activeTab]);

  // ── Applications ──────────────────────────────────────────
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

  const getRatingColor = (score) => {
    if (score >= 75) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 65) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  // ── Research Papers ───────────────────────────────────────
  const loadPapers = async () => {
    setPapersLoading(true);
    setPapersError('');
    try {
      const password = sessionStorage.getItem('adminAuth');
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/research/list`, {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (!res.ok) throw new Error('Failed to load papers');
      const data = await res.json();
      setPapers(data.papers || []);
    } catch (err) {
      setPapersError('Failed to load research papers: ' + err.message);
    } finally {
      setPapersLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are accepted.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File must be smaller than 20 MB.');
      return;
    }
    setUploadError('');
    setSelectedFile(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!uploadForm.title.trim()) {
      setUploadError('Please enter a title.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please select a PDF file.');
      return;
    }

    setUploading(true);
    try {
      const password = sessionStorage.getItem('adminAuth');
      const API_URL = import.meta.env.VITE_API_URL || '';
      const fd = new FormData();
      fd.append('pdf', selectedFile);
      fd.append('title', uploadForm.title.trim());
      fd.append('description', uploadForm.description.trim());

      const res = await fetch(`${API_URL}/api/research/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${password}` },
        body: fd
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadSuccess(`"${data.paper.title}" uploaded successfully.`);
      setUploadForm({ title: '', description: '' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadPapers();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (paperId, paperTitle) => {
    if (!window.confirm(`Delete "${paperTitle}"? This cannot be undone.`)) return;
    setDeletingId(paperId);
    try {
      const password = sessionStorage.getItem('adminAuth');
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/research/delete?id=${paperId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Logo */}
        <div className="mb-8">
          <Link to="/" className="inline-block">
            <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="250">
              <defs>
                <linearGradient id="flowGradDashboard" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#FF5A5F', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#E34850', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.3" />
              <g transform="translate(40, 45)">
                <path
                  d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
                  stroke="url(#flowGradDashboard)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"
                />
                <path d="M 35 15 Q 25 12, 18 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
                <path d="M 50 15 Q 60 12, 67 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
              </g>
              <text x="160" y="85" fontFamily="'Helvetica Neue', 'Arial', sans-serif" fontSize="42" fontWeight="500" fill="#2C2C2C" letterSpacing="1">
                Artery Capital
              </text>
              <path d="M 160 95 L 440 95" stroke="#FF5A5F" strokeWidth="1.5" opacity="0.3" />
            </svg>
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage applications and research content</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'applications'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Applications
          </button>
          <button
            onClick={() => setActiveTab('research')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'research'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Research PDFs
          </button>
        </div>

        {/* ── Applications Tab ── */}
        {activeTab === 'applications' && (
          <>
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
                <h2 className="text-2xl font-semibold text-gray-900">Applications</h2>
                <p className="text-sm text-gray-500 mt-1">Click on any application to view detailed evaluation results</p>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Founder</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                            <div className="font-medium text-gray-900 hover:text-red-600 transition-colors">{app.applicant.company}</div>
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
          </>
        )}

        {/* ── Research PDFs Tab ── */}
        {activeTab === 'research' && (
          <div className="space-y-8">

            {/* Upload Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Upload Research Paper</h2>
              <p className="text-sm text-gray-500 mb-6">PDFs are published immediately and appear on the public Research page.</p>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Africa Fintech Market Report 2025"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="A short summary of the paper (optional)"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PDF File <span className="text-red-500">*</span>
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-red-400 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500">
                      {selectedFile ? selectedFile.name : 'Click to select a PDF (max 20 MB)'}
                    </span>
                    {selectedFile && (
                      <span className="ml-auto text-xs text-gray-400">{formatFileSize(selectedFile.size)}</span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                    {uploadError}
                  </div>
                )}
                {uploadSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                    {uploadSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Paper
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Papers List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Published Papers</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {papers.length} paper{papers.length !== 1 ? 's' : ''} — visible on the{' '}
                    <Link to="/research" target="_blank" className="text-red-500 hover:underline">
                      Research page
                    </Link>
                  </p>
                </div>
                <button
                  onClick={loadPapers}
                  className="text-sm text-gray-500 hover:text-gray-700 transition"
                >
                  Refresh
                </button>
              </div>

              {papersLoading && (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-red-500"></div>
                  <p className="mt-4 text-gray-600">Loading papers…</p>
                </div>
              )}

              {papersError && (
                <div className="p-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
                    {papersError}
                  </div>
                </div>
              )}

              {!papersLoading && !papersError && papers.length === 0 && (
                <div className="p-12 text-center">
                  <FileText className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-1">No papers uploaded yet</p>
                  <p className="text-gray-500 text-sm">Use the form above to upload your first research PDF.</p>
                </div>
              )}

              {!papersLoading && !papersError && papers.length > 0 && (
                <div className="divide-y divide-gray-100">
                  {papers.map((paper) => (
                    <div key={paper.id} className="flex items-start gap-4 px-6 py-5 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{paper.title}</p>
                        {paper.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{paper.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-gray-400">{formatDate(paper.created_at)}</span>
                          {paper.file_size && (
                            <span className="text-xs text-gray-400">{formatFileSize(paper.file_size)}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${paper.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {paper.is_published ? 'Published' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={paper.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </a>
                        <button
                          onClick={() => handleDelete(paper.id, paper.title)}
                          disabled={deletingId === paper.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                        >
                          {deletingId === paper.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
