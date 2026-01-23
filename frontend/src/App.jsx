
import { useAuth } from './AuthContext';
import Sidebar from './components/sidebar.jsx';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from './AuthContext';
import Navbar from './components/navbar.jsx';
import HeroSection from './components/Hero.jsx';
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/dashbaord";
import Learn from "./pages/Learningpage";


function AppContent() {
  const { user, loading } = useAuth();
  if (loading) return null; // or a loading spinner
  return (
    <>
      {user ? <Sidebar /> : <Navbar />}
      <Routes>
        <Route path="/" element={<HeroSection />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/learningpage" element={<Learn />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App
