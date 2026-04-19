// Protects routes by redirecting unauthenticated users to the login page.
import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';

// Guards child routes until auth state is loaded and a user is present.
export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mx-auto mb-5 size-12 animate-spin rounded-full border-4 border-white/10 border-t-white" />
          <p className="text-sm text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
