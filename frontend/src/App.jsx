import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuth } from "./AuthContext";

import Navbar from "./components/navbar.jsx";
import Sidebar from "./components/sidebar.jsx";

import HeroSection from "./components/Hero.jsx";
import Signup from "./pages/Signup";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/dashbaord";
import Learn from "./pages/Learningpage";

function App() {
  const { user, loading } = useAuth();

  if (loading) return null; // prevent flicker

  return (
    <Router>
      {/* ✅ Navbar ONLY when logged out */}
      {!user && <Navbar />}

      {/* ✅ Sidebar ONLY when logged in */}
      {user && <Sidebar />}

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HeroSection />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        {/* App routes (sidebar navigation) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/learningpage" element={<Learn />} />
      </Routes>
    </Router>
  );
}

export default App;
