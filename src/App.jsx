import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Application from './pages/Application'
import Admin from './pages/Admin'
import AdminDashboard from './pages/AdminDashboard'
import AdminApplicationDetail from './pages/AdminApplicationDetail'
import Trading from './pages/Trading'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/apply" element={<Application />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/application/:id" element={<AdminApplicationDetail />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
