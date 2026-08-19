import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Key, LogOut, Edit2, Save, X, Trash2, UserX, Settings, Shield, Bell, Monitor, Calendar, Lock } from 'lucide-react';
import { Reveal, DotGrid } from '../components/Reveal.jsx';
import { Skeleton } from '../components/Skeleton.jsx';

// Handles Profile logic.
export default function Profile() {
  const { user, session, loading: isAuthLoading } = useAuth();
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
  const [activeTab, setActiveTab] = useState('account'); // 'account', 'preferences', 'security'

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

  // Handles handleResetPassword logic.
  const handleResetPassword = async () => {
    const confirmed = window.confirm('Send a password reset email to your address?');
    if (!confirmed) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      alert('Password reset email sent! Please check your inbox.');
    } catch (error) {
      console.error('Error sending reset email:', error);
      alert('Failed to send reset email. Please try again.');
    }
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
      const response = await fetch(`${API_BASE}/api/auth/data`, {
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
      const response = await fetch(`${API_BASE}/api/auth/account`, {
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

  const solidCardBg = 'color-mix(in srgb, var(--background) 90%, var(--foreground) 10%)';
  const tabClasses = (tabName) => `flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === tabName ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--muted)]/20' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/10'}`;

  const renderProfileSkeleton = () => (
    <main className="main-content min-h-screen relative" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
      <DotGrid />

      <header
        className="sticky top-0 z-20 backdrop-blur-lg border-b"
        style={{
          background: 'color-mix(in srgb, var(--background) 80%, transparent)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="px-8 sm:px-10 lg:px-12 py-6 flex flex-wrap gap-4 justify-between items-center" aria-hidden>
          <div className="space-y-2">
            <Skeleton style={{ height: '1.9rem', width: '11.5rem' }} />
            <Skeleton style={{ height: '0.85rem', width: '15rem' }} />
          </div>
          <Skeleton rounded="0.5rem" style={{ height: '2.2rem', width: '6.5rem' }} />
        </div>
      </header>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto" aria-hidden>
        <div className="rounded-t-xl p-8 border border-b-0 flex flex-col sm:flex-row items-center gap-6" style={{ background: solidCardBg, borderColor: 'var(--border)' }}>
          <Skeleton rounded="999px" style={{ width: '6.5rem', height: '6.5rem' }} />
          <div className="space-y-2 w-full max-w-xs">
            <Skeleton style={{ height: '1.6rem', width: '70%' }} />
            <Skeleton style={{ height: '0.9rem', width: '92%' }} />
          </div>
        </div>

        <div className="flex border-x border-b overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--background)' }}>
          <Skeleton style={{ height: '2.8rem', width: '33.33%' }} />
          <Skeleton style={{ height: '2.8rem', width: '33.33%' }} />
          <Skeleton style={{ height: '2.8rem', width: '33.33%' }} />
        </div>

        <div className="rounded-b-xl border border-t-0 p-6 sm:p-8 min-h-[300px] space-y-6" style={{ background: solidCardBg, borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`profile-field-skeleton-${index}`} className="space-y-2">
                <Skeleton style={{ height: '0.75rem', width: '35%' }} />
                <Skeleton rounded="0.5rem" style={{ height: '2.7rem', width: '100%' }} />
              </div>
            ))}
          </div>
          <Skeleton rounded="0.5rem" style={{ height: '2.6rem', width: '8.5rem' }} />
        </div>
      </div>
    </main>
  )

  if (isAuthLoading) {
    return renderProfileSkeleton()
  }

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

  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown';

  return (
    <main className="main-content min-h-screen relative" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
      <DotGrid />
      
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
          <Reveal>
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                My Profile
              </h1>
              <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
                Manage your account settings and preferences
              </p>
            </div>
          </Reveal>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:opacity-80 text-sm font-medium border"
            style={{ 
              background: 'transparent',
              borderColor: 'var(--destructive)',
              color: 'var(--destructive)'
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto">
        
        {/* Profile Card Header */}
        <Reveal delay={0.05}>
          <div className="rounded-t-xl p-8 border border-b-0 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden" style={{ background: solidCardBg, borderColor: 'var(--border)' }}>
             {/* Avatar Section */}
             <div 
               className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex shrink-0 items-center justify-center shadow-lg font-bold text-4xl sm:text-5xl border-2 z-10"
               style={{ 
                 background: 'color-mix(in srgb, var(--primary) 20%, var(--background))',
                 color: 'var(--primary)',
                 borderColor: 'var(--primary)'
               }}
             >
               {user.user_metadata?.full_name ? user.user_metadata.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
             </div>
             <div className="text-center sm:text-left z-10">
                <h2 className="text-2xl sm:text-3xl font-bold mb-1">{profile.fullName || user.email.split('@')[0]}</h2>
                <p className="text-[var(--muted-foreground)] flex items-center justify-center sm:justify-start gap-2 text-sm">
                  <Mail size={14} /> {profile.email}
                </p>
             </div>
          </div>
        </Reveal>

        {/* Tabs */}
        <Reveal delay={0.1}>
          <div role="tablist" aria-label="Profile sections" className="flex border-x border-b overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--background)' }}>
            <button id="profile-tab-account" role="tab" aria-selected={activeTab === 'account'} aria-controls="profile-panel-account" onClick={() => setActiveTab('account')} className={tabClasses('account')}>
              <User size={16} /> <span className="hidden sm:inline">Account</span>
            </button>
            <button id="profile-tab-preferences" role="tab" aria-selected={activeTab === 'preferences'} aria-controls="profile-panel-preferences" onClick={() => setActiveTab('preferences')} className={tabClasses('preferences')}>
              <Settings size={16} /> <span className="hidden sm:inline">Preferences</span>
            </button>
            <button id="profile-tab-security" role="tab" aria-selected={activeTab === 'security'} aria-controls="profile-panel-security" onClick={() => setActiveTab('security')} className={tabClasses('security')}>
              <Shield size={16} /> <span className="hidden sm:inline">Security</span>
            </button>
          </div>
        </Reveal>

        {/* Tab Content */}
        <Reveal delay={0.15}>
          <div className="rounded-b-xl border border-t-0 p-6 sm:p-8 min-h-[300px]" style={{ background: solidCardBg, borderColor: 'var(--border)' }}>
            
            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div id="profile-panel-account" role="tabpanel" aria-labelledby="profile-tab-account" className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      <User size={14} /> Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="fullName"
                        value={profile.fullName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-lg outline-none transition-all focus:ring-1 focus:ring-[var(--primary)]"
                        style={{ 
                          background: 'var(--background)',
                          border: '1px solid var(--border)',
                          color: 'var(--foreground)'
                        }}
                        placeholder="Enter your full name"
                        autoFocus
                      />
                    ) : (
                      <div className="py-2.5 px-4 rounded-lg border border-transparent bg-[var(--background)]/50 font-medium">
                        {profile.fullName || 'Not set'}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      <Mail size={14} /> Email Address
                    </label>
                    <div className="py-2.5 px-4 rounded-lg bg-[var(--background)]/50 opacity-70 font-medium flex justify-between items-center">
                      <span>{profile.email}</span>
                      <Lock size={14} className="text-[var(--muted-foreground)]" />
                    </div>
                  </div>
                  
                  {/* Join Date */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      <Calendar size={14} /> Member Since
                    </label>
                    <div className="py-2.5 px-4 rounded-lg bg-[var(--background)]/50 font-medium">
                      {joinDate}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all hover:opacity-90 font-medium disabled:opacity-50"
                        style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                      >
                        <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all hover:bg-[var(--muted)]/50 font-medium border"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <X size={16} /> Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all hover:bg-[var(--muted)]/50 font-medium border"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <Edit2 size={16} /> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <div id="profile-panel-preferences" role="tabpanel" aria-labelledby="profile-tab-preferences" className="space-y-6 animate-in fade-in duration-300">
                <p className="text-[var(--muted-foreground)] text-sm mb-6">Customize your learning experience. (Note: These settings are stored locally on this device).</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-[var(--background)]/50" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                        <Bell size={18} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Study Reminders</h4>
                        <p className="text-xs text-[var(--muted-foreground)]">Receive daily notifications to keep up your streak.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-[var(--muted)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-[var(--background)]/50" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                        <Monitor size={18} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Focus Mode</h4>
                        <p className="text-xs text-[var(--muted-foreground)]">Hide sidebar and navigation while taking quizzes.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-[var(--muted)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div id="profile-panel-security" role="tabpanel" aria-labelledby="profile-tab-security" className="space-y-8 animate-in fade-in duration-300">
                {/* User ID */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <Key size={14} /> Unique User ID
                  </label>
                  <p className="py-2.5 px-4 rounded-lg font-mono text-xs break-all bg-[var(--background)]/50 border border-dashed" style={{ borderColor: 'var(--border)' }}>
                    {user.id}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">Required for support requests and API access.</p>
                </div>

                {/* Password Reset */}
                <div className="pt-2">
                  <button
                    onClick={handleResetPassword}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all hover:bg-[var(--muted)]/50 font-medium border text-sm"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <Lock size={16} /> Send Password Reset Email
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--destructive)] flex items-center gap-2 mb-4">
                    ⚠️ Danger Zone
                  </h2>
                  <p className="text-xs text-[var(--muted-foreground)] mb-4">
                    These actions are permanent and cannot be undone. Please proceed with caution.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleDeleteData}
                      disabled={isDeletingData || isDeletingAccount}
                      className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all hover:bg-[var(--destructive)]/10"
                      style={{
                        borderColor: 'var(--destructive)',
                        color: 'var(--destructive)',
                        opacity: isDeletingData || isDeletingAccount ? 0.6 : 1,
                        cursor: isDeletingData || isDeletingAccount ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                      {isDeletingData ? 'Deleting Data...' : 'Delete Study Data'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingData || isDeletingAccount}
                      className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90"
                      style={{
                        background: 'var(--destructive)',
                        color: 'var(--destructive-foreground)',
                        opacity: isDeletingData || isDeletingAccount ? 0.6 : 1,
                        cursor: isDeletingData || isDeletingAccount ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <UserX size={16} />
                      {isDeletingAccount ? 'Deleting Account...' : 'Delete Account Permanently'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </Reveal>
      </div>
    </main>
  );
}
