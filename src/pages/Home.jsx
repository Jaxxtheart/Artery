import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <h1>Welcome to Artery Capital</h1>
          <p>Empowering Innovation, Fueling Growth</p>
          <Link to="/application" className="btn">Apply Now</Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>About Us</h2>
          <p>
            Artery Capital is a forward-thinking investment firm dedicated to identifying and supporting
            exceptional entrepreneurs and innovative companies. We provide strategic capital and operational
            expertise to help businesses scale and achieve their full potential.
          </p>
        </div>
      </section>

      <section className="section" style={{ backgroundColor: 'white' }}>
        <div className="container">
          <h2>What We Offer</h2>
          <div className="features">
            <div className="feature-card">
              <h3>Strategic Capital</h3>
              <p>
                We provide flexible funding solutions tailored to your business needs, from seed funding
                to growth capital.
              </p>
            </div>
            <div className="feature-card">
              <h3>Expert Guidance</h3>
              <p>
                Our experienced team offers strategic advice and operational support to help you navigate
                challenges and capitalize on opportunities.
              </p>
            </div>
            <div className="feature-card">
              <h3>Network Access</h3>
              <p>
                Gain access to our extensive network of industry experts, potential partners, and
                fellow entrepreneurs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Investment Focus</h2>
          <p>
            We invest in technology-driven companies across various sectors including fintech, healthcare,
            SaaS, and artificial intelligence. Our ideal partners are ambitious founders with innovative
            solutions to significant market problems.
          </p>
        </div>
      </section>

      <section className="section" style={{ backgroundColor: 'white' }}>
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>
            If you're building something exceptional and looking for a partner who can help you scale,
            we'd love to hear from you.
          </p>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/application" className="btn btn-primary">Submit Your Application</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
