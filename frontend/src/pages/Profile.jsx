import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Key, LogOut, Edit2, Save, X, Trash2, UserX } from 'lucide-react';

// Handles Profile logic.
export default function Profile() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    avatar: null,
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
        avatar: user.user_metadata?.avatar_url || null,
      });
    }
  }, [user]);

  // Handles handleInputChange logic.
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handles handleSaveProfile logic.
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.fullName,
        },
      });

      if (error) throw error;
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again');
    } finally {
      setLoading(false);
    }
  };

  // Handles handleLogout logic.
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Handles handleDeleteData logic.
  const handleDeleteData = async () => {
    const confirmed = window.confirm('Delete all your study data? This cannot be undone.');
    if (!confirmed) return;

    try {
      setIsDeletingData(true);
      const token = session?.access_token;
      if (!token) {
        alert('Unable to complete this action. Please log in again.');
        return;
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE}/api/auth/data?token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success !== true) {
        alert('Unable to delete data right now. Please try again.');
        return;
      }

      // Clear cached quiz details so history/detail views do not show stale data.
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('quiz_')) {
          sessionStorage.removeItem(key);
        }
      });

      // Notify other screens to refresh local state.
      localStorage.setItem('user_data_cleared_at', String(Date.now()));
      window.dispatchEvent(new Event('user-data-cleared'));

      alert('Your study data has been deleted.');
    } catch (error) {
      console.error('Delete data error:', error);
      alert('Unable to delete data right now. Please try again.');
    } finally {
      setIsDeletingData(false);
    }
  };

  // Handles handleDeleteAccount logic.
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Delete your account permanently? This cannot be undone.');
    if (!confirmed) return;

    try {
      setIsDeletingAccount(true);
      const token = session?.access_token;
      if (!token) {
        alert('Unable to complete this action. Please log in again.');
        return;
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE}/api/auth/account?token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success !== true) {
        alert('Unable to delete account right now. Please try again later.');
        return;
      }

      await supabase.auth.signOut();
      alert('Your account has been deleted.');
      navigate('/signup');
    } catch (error) {
      console.error('Delete account error:', error);
      alert('Unable to delete account right now. Please try again later.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Please log in
          </h1>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 rounded-lg transition-all hover:opacity-90 font-medium"
            style={{ 
              background: 'var(--primary)',
              color: 'var(--primary-foreground)'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="main-content min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-20 backdrop-blur-lg border-b"
        style={{ 
          background: 'color-mix(in srgb, var(--background) 80%, transparent)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="px-8 sm:px-10 lg:px-12 py-6 flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
              My Profile
            </h1>
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Manage your account settings and preferences
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:opacity-80 text-sm font-medium"
            style={{ 
              background: 'var(--destructive)',
              color: 'var(--destructive-foreground)'
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Profile Card */}
        <div className="rounded-xl shadow-lg p-8" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {/* Avatar Section */}
          <div className="flex justify-center mb-8">
            <div 
              className="w-28 h-28 rounded-full flex items-center justify-center ring-4 shadow-lg"
              style={{ 
                ringColor: 'var(--border)'
              }}
            >
              <span className="text-5xl font-bold text-white">
                {user.user_metadata?.full_name ? user.user_metadata.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
              </span>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                <User size={16} />
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg outline-none transition-all"
                  style={{ 
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="Enter your full name"
                />
              ) : (
                <p className="py-2.5 px-4 rounded-lg" style={{ 
                  color: 'var(--muted-foreground)',
                  background: 'var(--muted)',
                }}>
                  {profile.fullName || 'Not set'}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                <Mail size={16} />
                Email Address
              </label>
              <p className="py-2.5 px-4 rounded-lg" style={{ 
                color: 'var(--muted-foreground)',
                background: 'var(--muted)',
              }}>
                {profile.email}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Email cannot be changed
              </p>
            </div>

            {/* User ID */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                <Key size={16} />
                User ID
              </label>
              <p className="py-2.5 px-4 rounded-lg font-mono text-sm break-all" style={{ 
                color: 'var(--muted-foreground)',
                background: 'var(--muted)',
              }}>
                {user.id}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)'
                  }}
                >
                  <Save size={18} />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-90 font-medium"
                  style={{ 
                    background: 'var(--muted)',
                    color: 'var(--foreground)'
                  }}
                >
                  <X size={18} />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-90 font-medium"
                style={{ 
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)'
                }}
              >
                <Edit2 size={18} />
                Edit Profile
              </button>
            )}
          </div>
        </div>
        <div
          className="mt-8 rounded-xl p-5"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Danger Zone
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            These actions are sensitive and should be used carefully.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleDeleteData}
              disabled={isDeletingData || isDeletingAccount}
              className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
              style={{
                borderColor: 'var(--destructive)',
                color: 'var(--destructive)',
                background: 'var(--background)',
                opacity: isDeletingData || isDeletingAccount ? 0.6 : 1,
                cursor: isDeletingData || isDeletingAccount ? 'not-allowed' : 'pointer'
              }}
            >
              <Trash2 size={16} />
              {isDeletingData ? 'Deleting Data...' : 'Delete Data'}
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeletingData || isDeletingAccount}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
              style={{
                background: 'var(--destructive)',
                color: 'var(--destructive-foreground)',
                opacity: isDeletingData || isDeletingAccount ? 0.6 : 1,
                cursor: isDeletingData || isDeletingAccount ? 'not-allowed' : 'pointer'
              }}
            >
              <UserX size={16} />
              {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
