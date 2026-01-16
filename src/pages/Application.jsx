import { useState } from 'react'

function Application() {
  const [formData, setFormData] = useState({
    companyName: '',
    founderName: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    stage: '',
    fundingAmount: '',
    description: '',
    pitchDeck: ''
  })

  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Application submitted:', formData)
    setSubmitted(true)
    // Here you would typically send the data to your backend
  }

  if (submitted) {
    return (
      <div className="section">
        <div className="container">
          <div className="form" style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>
              Thank You!
            </h2>
            <p style={{ marginBottom: '2rem' }}>
              Your application has been submitted successfully. We'll review your submission and
              get back to you within 5-7 business days.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSubmitted(false)
                setFormData({
                  companyName: '',
                  founderName: '',
                  email: '',
                  phone: '',
                  website: '',
                  industry: '',
                  stage: '',
                  fundingAmount: '',
                  description: '',
                  pitchDeck: ''
                })
              }}
            >
              Submit Another Application
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="application">
      <section className="hero" style={{ padding: '3rem 2rem' }}>
        <div className="container">
          <h1>Investment Application</h1>
          <p>Tell us about your company and vision</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <form className="form" onSubmit={handleSubmit}>
            <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Company Information</h2>

            <div className="form-group">
              <label htmlFor="companyName">Company Name *</label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="founderName">Founder Name *</label>
              <input
                type="text"
                id="founderName"
                name="founderName"
                value={formData.founderName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="website">Company Website</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="industry">Industry *</label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                required
              >
                <option value="">Select an industry</option>
                <option value="fintech">Fintech</option>
                <option value="healthcare">Healthcare</option>
                <option value="saas">SaaS</option>
                <option value="ai">Artificial Intelligence</option>
                <option value="ecommerce">E-commerce</option>
                <option value="edtech">Education Technology</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="stage">Company Stage *</label>
              <select
                id="stage"
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                required
              >
                <option value="">Select a stage</option>
                <option value="idea">Idea Stage</option>
                <option value="pre-seed">Pre-Seed</option>
                <option value="seed">Seed</option>
                <option value="series-a">Series A</option>
                <option value="series-b">Series B</option>
                <option value="growth">Growth Stage</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fundingAmount">Funding Amount Sought *</label>
              <input
                type="text"
                id="fundingAmount"
                name="fundingAmount"
                value={formData.fundingAmount}
                onChange={handleChange}
                placeholder="e.g., $500,000"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Company Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Tell us about your company, what problem you're solving, and your vision..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pitchDeck">Pitch Deck URL</label>
              <input
                type="url"
                id="pitchDeck"
                name="pitchDeck"
                value={formData.pitchDeck}
                onChange={handleChange}
                placeholder="https://docsend.com/view/..."
              />
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary">
                Submit Application
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default Application
