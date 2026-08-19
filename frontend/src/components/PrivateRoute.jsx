// Protects routes by redirecting unauthenticated users to the login page.
import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';
import { FullscreenSkeleton } from './Skeleton.jsx';

// Guards child routes until auth state is loaded and a user is present.
export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
// Show a loading spinner while auth state is being determined.
  if (loading) {
    return <FullscreenSkeleton message="Checking access permissions..." />;
  }

  //IF user is authenticated, render the child routes. Otherwise, redirect to login.
  return user ? children : <Navigate to="/login" replace />;
}
