import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Icon components
const CheckCircle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const ArrowRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const Upload = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const Users = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const Briefcase = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
  </svg>
);

const Target = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const Globe = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const DollarSign = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
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

// Helper function to normalize data for API
const normalizeData = (data) => {
  // Map stage values from UI to API format
  const stageMap = {
    'Idea Stage': 'idea',
    'Prototype': 'prototype',
    'MVP': 'mvp',
    'Early Traction': 'revenue',
    'Growing': 'revenue',
    'Scaling': 'scaling'
  };

  // Map industry values from UI to API format
  const industryMap = {
    'Fintech': 'fintech',
    'Healthcare': 'healthtech',
    'Education': 'edtech',
    'Agriculture': 'agritech',
    'E-commerce': 'e-commerce',
    'Logistics': 'logistics',
    'Energy': 'cleantech',
    'SaaS': 'saas',
    'Other': 'other'
  };

  return {
    ...data,
    stage: stageMap[data.stage] || data.stage.toLowerCase(),
    industry: industryMap[data.industry] || data.industry.toLowerCase(),
    country: data.country.toLowerCase()
  };
};

export default function Application() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    founderName: '', email: '', phone: '', linkedin: '',
    companyName: '', country: '', industry: '', stage: '',
    problem: '', solution: '', impact: '',
    revenue: '', users: '', growth: '', team: '',
    fundingAmount: '', useOfFunds: '', runway: '', pitchDeck: null
  });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(null);
  const [apiError, setApiError] = useState(null);

  const steps = [
    { n: 1, t: 'About You', Icon: Users },
    { n: 2, t: 'Company', Icon: Briefcase },
    { n: 3, t: 'Vision', Icon: Target },
    { n: 4, t: 'Traction', Icon: Globe },
    { n: 5, t: 'Funding', Icon: DollarSign }
  ];

  const upd = (k, v) => {
    setData(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
  };

  const val = (s) => {
    const e = {};
    if (s === 1) {
      if (!data.founderName) e.founderName = 'Required';
      if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) e.email = 'Invalid email';
      if (!data.phone) e.phone = 'Required';
    }
    if (s === 2) {
      if (!data.companyName) e.companyName = 'Required';
      if (!data.country) e.country = 'Required';
      if (!data.industry) e.industry = 'Required';
      if (!data.stage) e.stage = 'Required';
    }
    if (s === 3) {
      if (!data.problem || data.problem.length < 50) e.problem = 'Min 50 chars';
      if (!data.solution || data.solution.length < 50) e.solution = 'Min 50 chars';
      if (!data.impact || data.impact.length < 50) e.impact = 'Min 50 chars';
    }
    if (s === 4 && !data.team) e.team = 'Required';
    if (s === 5) {
      if (!data.fundingAmount) e.fundingAmount = 'Required';
      if (!data.useOfFunds || data.useOfFunds.length < 50) e.useOfFunds = 'Min 50 chars';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => val(step) && setStep(p => Math.min(p + 1, 5));
  const prev = () => setStep(p => Math.max(p - 1, 1));

  const submit = async () => {
    if (!val(5)) return;

    setLoading(true);
    setApiError(null);

    try {
      // Normalize data before sending to API
      const normalizedData = normalizeData(data);

      // Create FormData for file upload support
      const formData = new FormData();
      Object.keys(normalizedData).forEach(key => {
        if (normalizedData[key] !== null && normalizedData[key] !== '') {
          formData.append(key, normalizedData[key]);
        }
      });

      // Call backend API - use empty string for production (relative URL)
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/applications/submit`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setScoring(result.scoring);
        setDone(true);
      } else {
        setApiError(result.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setApiError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f && f.size > 10 * 1024 * 1024) {
      setErrors(p => ({ ...p, pitchDeck: 'Max 10MB' }));
    } else if (f) {
      upd('pitchDeck', f);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const reportData = {
      applicant: {
        name: data.founderName,
        email: data.email,
        company: data.companyName
      },
      submittedAt: new Date().toISOString(),
      scoring: {
        overallScore: scoring.overallScore,
        rating: scoring.rating,
        recommendation: scoring.recommendation,
        categoryScores: scoring.categoryScores,
        weights: scoring.weights,
        strengths: scoring.strengths,
        concerns: scoring.concerns,
        nextSteps: scoring.nextSteps
      },
      valuation: {
        current: scoring.valuation.current,
        projected3Year: scoring.valuation.projected3Year,
        projected5Year: scoring.valuation.projected5Year
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `artery-capital-results-${data.companyName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="inline-block mb-8">
            <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="250">
              <defs>
                <linearGradient id="flowGradSuccess" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#FF5A5F',stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#E34850',stopOpacity:1}} />
                </linearGradient>
              </defs>
              <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.3"/>
              <g transform="translate(40, 45)">
                <path d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
                      stroke="url(#flowGradSuccess)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M 35 15 Q 25 12, 18 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
                <path d="M 50 15 Q 60 12, 67 18" stroke="#FF5A5F" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
              </g>
              <text x="160" y="85" fontFamily="'Helvetica Neue', 'Arial', sans-serif" fontSize="42" fontWeight="500" fill="#2C2C2C" letterSpacing="1">
                Artery Capital
              </text>
              <path d="M 160 95 L 440 95" stroke="#FF5A5F" strokeWidth="1.5" opacity="0.3"/>
            </svg>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h1 className="text-4xl font-semibold mb-3 text-gray-900">Application Submitted!</h1>
            <p className="text-lg text-gray-600">Thank you for applying to Artery Capital</p>
          </div>

          {/* Confirmation Message */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <div className="prose max-w-none">
              <p className="text-gray-700 mb-4">
                Your application has been successfully received and is currently under review by our team.
              </p>
              <p className="text-gray-700 mb-4">
                We carefully evaluate each application using our comprehensive scoring system that combines
                Y Combinator principles, Silicon Valley criteria, and Harambeans evaluation methods.
              </p>
              <div className="bg-gray-50 rounded-lg p-6 my-6">
                <h3 className="font-semibold text-lg mb-3 text-gray-900">What Happens Next?</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-red-600 flex-shrink-0">1.</span>
                    <span className="text-gray-700">Our investment team will review your application within 5-7 business days</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-600 flex-shrink-0">2.</span>
                    <span className="text-gray-700">Qualified applicants will be invited for a video interview</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-600 flex-shrink-0">3.</span>
                    <span className="text-gray-700">Selected startups will receive funding and join our accelerator program</span>
                  </li>
                </ul>
              </div>
              <p className="text-gray-700">
                We'll be in touch at <strong>{data.email}</strong> with updates on your application status.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link to="/" className="inline-block px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-8">
            <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" width="300" className="mx-auto">
              <defs>
                <linearGradient id="flowGradApp" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#FF5A5F',stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#E34850',stopOpacity:1}} />
                </linearGradient>
              </defs>
              <circle cx="85" cy="80" r="55" fill="none" stroke="#FF5A5F" strokeWidth="2" opacity="0.3"/>
              <g transform="translate(40, 45)">
                <path d="M 20 55 C 20 40, 25 25, 35 15 C 40 8, 45 8, 50 15 C 55 22, 57 30, 55 40 L 50 52 M 30 52 C 32 35, 38 28, 45 28 C 52 28, 58 35, 60 52 M 30 52 C 30 58, 32 62, 35 65 C 40 70, 50 70, 55 65 C 58 62, 60 58, 60 52"
                      stroke="url(#flowGradApp)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold mb-3 text-gray-900">Start Your Journey</h1>
          <p className="text-lg text-gray-600">Apply for $15,000 funding + strategic partnership</p>
        </div>

        <div className="mb-12 flex items-center justify-between">
          {steps.map((s, i) => {
            const Icon = s.Icon;
            const isDone = step > s.n;
            const curr = step === s.n;
            return (
              <React.Fragment key={s.n}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isDone ? 'bg-green-500' : curr ? 'bg-red-500' : 'bg-gray-200'
                  }`}>
                    {isDone ? <CheckCircle className="w-6 h-6 text-white" /> :
                      <Icon className={`w-6 h-6 ${curr ? 'text-white' : 'text-gray-400'}`} />}
                  </div>
                  <span className={`text-sm font-medium ${curr ? 'text-gray-900' : 'text-gray-500'}`}>{s.t}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-1 mx-2 rounded ${isDone ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">Tell us about yourself</h2>
              {[
                { k: 'founderName', l: 'Full Name *', p: 'Jane Doe', t: 'text' },
                { k: 'email', l: 'Email *', p: 'jane@startup.com', t: 'email' },
                { k: 'phone', l: 'Phone *', p: '+27 XX XXX XXXX', t: 'tel' },
                { k: 'linkedin', l: 'LinkedIn', p: 'linkedin.com/in/janedoe', t: 'url' }
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{f.l}</label>
                  <input
                    type={f.t}
                    value={data[f.k]}
                    onChange={(e) => upd(f.k, e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition ${errors[f.k] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder={f.p}
                  />
                  {errors[f.k] && <p className="text-red-500 text-sm mt-1">{errors[f.k]}</p>}
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">About your company</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                <input
                  value={data.companyName}
                  onChange={(e) => upd('companyName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none ${errors.companyName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Startup Inc."
                />
                {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
              </div>
              {[
                { k: 'country', l: 'Country *', opts: ['', 'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt', 'Rwanda', 'Other'] },
                { k: 'industry', l: 'Industry *', opts: ['', 'Fintech', 'Healthcare', 'Education', 'Agriculture', 'E-commerce', 'Logistics', 'Energy', 'SaaS', 'Other'] },
                { k: 'stage', l: 'Stage *', opts: ['', 'Idea Stage', 'Prototype', 'MVP', 'Early Traction', 'Growing', 'Scaling'] }
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{f.l}</label>
                  <select
                    value={data[f.k]}
                    onChange={(e) => upd(f.k, e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none ${errors[f.k] ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    {f.opts.map(o => <option key={o} value={o}>{o || 'Select'}</option>)}
                  </select>
                  {errors[f.k] && <p className="text-red-500 text-sm mt-1">{errors[f.k]}</p>}
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">The vision</h2>
              {[
                { k: 'problem', l: 'What problem are you solving? *', p: 'Describe the problem...' },
                { k: 'solution', l: "What's your solution? *", p: 'Explain your solution...' },
                { k: 'impact', l: 'Why does this matter for Africa? *', p: 'Describe the impact...' }
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{f.l}</label>
                  <textarea
                    value={data[f.k]}
                    onChange={(e) => upd(f.k, e.target.value)}
                    rows={4}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none ${errors[f.k] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder={f.p}
                  />
                  <div className="flex justify-between mt-1">
                    {errors[f.k] && <p className="text-red-500 text-sm">{errors[f.k]}</p>}
                    <p className="text-sm text-gray-500 ml-auto">{data[f.k].length} / 50 min</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">Show us your traction</h2>
              {[
                { k: 'revenue', l: 'Current Revenue (Optional)', p: 'R50k/month or Pre-revenue' },
                { k: 'users', l: 'Users/Customers (Optional)', p: '1,000 users, 50 customers' },
                { k: 'growth', l: 'Growth Rate (Optional)', p: '20% month-over-month' }
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{f.l}</label>
                  <input
                    value={data[f.k]}
                    onChange={(e) => upd(f.k, e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder={f.p}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Team Size *</label>
                <select
                  value={data.team}
                  onChange={(e) => upd('team', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none ${errors.team ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {['', 'Solo Founder', '2-3', '4-7', '8-15', '15+'].map(o => <option key={o} value={o}>{o || 'Select'}</option>)}
                </select>
                {errors.team && <p className="text-red-500 text-sm mt-1">{errors.team}</p>}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">Let's talk funding</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Funding Amount *</label>
                <select
                  value={data.fundingAmount}
                  onChange={(e) => upd('fundingAmount', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none ${errors.fundingAmount ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {['', '$15,000 (Standard)', 'Less than $15,000', 'More than $15,000'].map(o => <option key={o} value={o}>{o || 'Select'}</option>)}
                </select>
                {errors.fundingAmount && <p className="text-red-500 text-sm mt-1">{errors.fundingAmount}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How will you use the funds? *</label>
                <textarea
                  value={data.useOfFunds}
                  onChange={(e) => upd('useOfFunds', e.target.value)}
                  rows={5}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none ${errors.useOfFunds ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Product development, marketing, team expansion..."
                />
                <div className="flex justify-between mt-1">
                  {errors.useOfFunds && <p className="text-red-500 text-sm">{errors.useOfFunds}</p>}
                  <p className="text-sm text-gray-500 ml-auto">{data.useOfFunds.length} / 50 min</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Runway (Optional)</label>
                <input
                  value={data.runway}
                  onChange={(e) => upd('runway', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="e.g., 3 months, 6 months"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pitch Deck (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition">
                  <input type="file" id="deck" accept=".pdf,.ppt,.pptx" onChange={handleFile} className="hidden" />
                  <label htmlFor="deck" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">{data.pitchDeck ? data.pitchDeck.name : 'Click to upload PDF or PowerPoint'}</p>
                    <p className="text-xs text-gray-500 mt-1">Max 10MB</p>
                  </label>
                </div>
                {errors.pitchDeck && <p className="text-red-500 text-sm mt-1">{errors.pitchDeck}</p>}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {step > 1 ? (
              <button onClick={prev} className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition">
                ← Back
              </button>
            ) : <div />}
            {step < 5 ? (
              <button onClick={next} className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition flex items-center gap-2">
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading}
                className={`px-8 py-3 bg-red-500 text-white rounded-lg font-medium transition ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'
                }`}
              >
                {loading ? 'Evaluating Application...' : 'Submit Application'}
              </button>
            )}
          </div>

          {/* API Error Message */}
          {apiError && step === 5 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                <strong>Error:</strong> {apiError}
              </p>
              <p className="text-red-600 text-xs mt-2">
                Please check your internet connection or try again later. If the problem persists, contact support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
