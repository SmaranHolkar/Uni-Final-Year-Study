import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Navbar from './components/Navbar'
import Learningplayground from './pages/Learningplayground'
import ToolsLibrary from './pages/ToolsStudio'
import TermsAndConditions from './pages/TermsAndConditions'
import PrivacyPolicy from './pages/PrivacyPolicy'
import AuthPage from './pages/AuthPage'
import './App.css'

export default function App() {
  const [openSessionTrigger, setOpenSessionTrigger] = useState(0)

  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar onOpenSessions={() => setOpenSessionTrigger((prev) => prev + 1)} />
          <Routes>
            <Route path="/" element={<Learningplayground triggerDrawer={openSessionTrigger} />} />
            <Route path="/tools" element={<ToolsLibrary />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}
