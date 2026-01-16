import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Application from './pages/Application'

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              <img src="/logo.svg" alt="Artery Capital" />
              <span>Artery Capital</span>
            </Link>
            <ul className="nav-menu">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/application">Apply</Link></li>
            </ul>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/application" element={<Application />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
