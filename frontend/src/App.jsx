// Configures the main app router and auth-aware page layout.

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
import Learningplayground from './pages/Learningplayground.jsx';
import PublicPageBackground from './components/PublicPageBackground.jsx';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Marketplace from './pages/Marketplace';
import GroundedChatHub from './components/GroundedChatHub.jsx';
import { FullscreenSkeleton } from './components/Skeleton.jsx';

// Renders routes and switches nav/sidebar based on authentication state.
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullscreenSkeleton message="Restoring your account and workspace..." />;
  }

  return (
    <>
      {user ? <Sidebar /> : <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <HeroSection />} />
        <Route path="/signup" element={<PublicPageBackground><Signup /></PublicPageBackground>} />
        <Route path="/login" element={<PublicPageBackground><Login /></PublicPageBackground>} />
        <Route path="/forgot-password" element={<PublicPageBackground><ForgotPassword /></PublicPageBackground>} />
        <Route path="/reset-password" element={<PublicPageBackground><ResetPassword /></PublicPageBackground>} />
        <Route path="/terms" element={<PublicPageBackground><TermsAndConditions /></PublicPageBackground>} />
        <Route path="/privacy" element={<PublicPageBackground><PrivacyPolicy /></PublicPageBackground>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/learningpage" element={<PrivateRoute><Learn /></PrivateRoute>} />
        <Route path="/Learningplayground" element={<PrivateRoute><Learningplayground /></PrivateRoute>} />
        <Route path="/learningplayground" element={<PrivateRoute><Learningplayground /></PrivateRoute>} />
        <Route path="/playground" element={<PrivateRoute><Learningplayground /></PrivateRoute>} />
        <Route path="/grounded-studio" element={<Navigate to="/Learningplayground?mode=grounded" replace />} />
        <Route path="/marketplace" element={<PrivateRoute><Marketplace /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/Profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/quiz/:quizId" element={<PrivateRoute><QuizDetail /></PrivateRoute>} />
        <Route path="*" element={user ? <NotFound /> : <PublicPageBackground><NotFound /></PublicPageBackground>} />
      </Routes>
    </>
  );
}


// Wraps the app in routing and auth providers.
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
