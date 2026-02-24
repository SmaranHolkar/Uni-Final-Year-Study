
import { useAuth } from './AuthContext';
import Sidebar from './components/sidebar.jsx';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './AuthContext';
import Navbar from './components/navbar.jsx';
import HeroSection from './components/Hero.jsx';
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/dashbaord";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Learn from "./pages/Learningpage";
import NotFound from "./pages/NotFound/NotFound";
import History from "./pages/History";
import QuizDetail from "./pages/QuizDetail";
import Profile from "./pages/Profile";
import ResetPassword from './pages/ResetPassword';

function AppContent() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#0a0a0a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTop: '4px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#fff', fontSize: '14px' }}>Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {user ? <Sidebar /> : <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <HeroSection />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/learningpage" element={<PrivateRoute><Learn /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/Profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/quiz/:quizId" element={<PrivateRoute><QuizDetail /></PrivateRoute>} />
        <Route path="*" element={<NotFound />} />
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
