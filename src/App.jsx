import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Application from './pages/Application'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/apply" element={<Application />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
