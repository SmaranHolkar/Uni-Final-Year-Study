import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from './AuthContext'
import Navbar from './components/navbar.jsx'
import HeroSection from './components/Hero.jsx'
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/dashbaord";
import Learn from "./pages/Learningpage";
// import InteractiveMindMap from './components/slides/InteractiveMindMap.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<HeroSection />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learningpage" element={<Learn />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
