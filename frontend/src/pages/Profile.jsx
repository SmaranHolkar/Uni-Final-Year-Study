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
  const tabClasses = (tabName) => `flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === tabName ? 'border-blue-500 text-blue-400 bg-blue-500/10 font-semibold' : 'border-transparent text-[#a1a1a6] hover:text-[#f0f0ee] hover:bg-[#18181b]/50'}`;

  const renderProfileSkeleton = () => (
    <main className="main-content min-h-screen relative bg-[#121214] text-[#f0f0ee]">
      <DotGrid />

      <header className="sticky top-0 z-20 backdrop-blur-lg border-b border-[#2e2e33] bg-[#121214]/80">
        <div className="px-8 sm:px-10 lg:px-12 py-6 flex flex-wrap gap-4 justify-between items-center" aria-hidden>
          <div className="space-y-2">
            <Skeleton style={{ height: '1.9rem', width: '11.5rem' }} />
            <Skeleton style={{ height: '0.85rem', width: '15rem' }} />
          </div>
          <Skeleton rounded="0.5rem" style={{ height: '2.2rem', width: '6.5rem' }} />
        </div>
      </header>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto" aria-hidden>
        <div className="card-standard rounded-b-none border-b-0 flex flex-col sm:flex-row items-center gap-6">
          <Skeleton rounded="999px" style={{ width: '6.5rem', height: '6.5rem' }} />
          <div className="space-y-2 w-full max-w-xs">
            <Skeleton style={{ height: '1.6rem', width: '70%' }} />
            <Skeleton style={{ height: '0.9rem', width: '92%' }} />
          </div>
        </div>

        <div className="flex border-x border-b border-[#2e2e33] bg-[#121214]">
          <Skeleton style={{ height: '2.8rem', width: '33.33%' }} />
          <Skeleton style={{ height: '2.8rem', width: '33.33%' }} />
          <Skeleton style={{ height: '2.8rem', width: '33.33%' }} />
        </div>

        <div className="card-standard rounded-t-none border-t-0 p-6 sm:p-8 min-h-[300px] space-y-6">
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
  );

  if (isAuthLoading) {
    return renderProfileSkeleton();
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121214] text-[#f0f0ee]">
        <div className="text-center card-standard max-w-sm w-full mx-4">
          <h1 className="text-xl font-semibold mb-3 text-[#f0f0ee]">
            Please log in
          </h1>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary w-full"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown';

  return (
    <main className="main-content min-h-screen relative bg-[#121214] text-[#f0f0ee]">
      <DotGrid />
      
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-lg border-b border-[#2e2e33] bg-[#121214]/80">
        <div className="px-8 sm:px-10 lg:px-12 py-6 flex flex-wrap gap-4 justify-between items-center">
          <Reveal>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#f0f0ee]">
                My Profile
              </h1>
              <p className="text-xs text-[#a1a1a6] mt-1">
                Manage your account settings and preferences
              </p>
            </div>
          </Reveal>
          <button
            onClick={handleLogout}
            className="btn-secondary flex items-center gap-2 text-xs !text-[#f87171] hover:!border-[#ef4444]/40"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-4xl mx-auto">
        
        {/* Profile Card Header */}
        <Reveal delay={0.05}>
          <div className="card-standard rounded-b-none border-b-0 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
             {/* Avatar Section */}
             <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex shrink-0 items-center justify-center font-semibold text-3xl sm:text-4xl border border-blue-500/40 bg-blue-500/10 text-blue-300 shadow-inner">
               {user.user_metadata?.full_name ? user.user_metadata.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
             </div>
             <div className="text-center sm:text-left z-10">
                <h2 className="text-xl sm:text-2xl font-semibold text-[#f0f0ee] tracking-tight">{profile.fullName || user.email.split('@')[0]}</h2>
                <p className="text-[#a1a1a6] flex items-center justify-center sm:justify-start gap-2 text-xs mt-1">
                  <Mail size={13} className="text-blue-400" /> {profile.email}
                </p>
             </div>
          </div>
        </Reveal>

        {/* Tabs */}
        <Reveal delay={0.1}>
          <div role="tablist" aria-label="Profile sections" className="flex border-x border-b border-[#2e2e33] bg-[#121214]">
            <button id="profile-tab-account" role="tab" aria-selected={activeTab === 'account'} aria-controls="profile-panel-account" onClick={() => setActiveTab('account')} className={tabClasses('account')}>
              <User size={15} /> <span>Account</span>
            </button>
            <button id="profile-tab-preferences" role="tab" aria-selected={activeTab === 'preferences'} aria-controls="profile-panel-preferences" onClick={() => setActiveTab('preferences')} className={tabClasses('preferences')}>
              <Settings size={15} /> <span>Preferences</span>
            </button>
            <button id="profile-tab-security" role="tab" aria-selected={activeTab === 'security'} aria-controls="profile-panel-security" onClick={() => setActiveTab('security')} className={tabClasses('security')}>
              <Shield size={15} /> <span>Security</span>
            </button>
          </div>
        </Reveal>

        {/* Tab Content */}
        <Reveal delay={0.15}>
          <div className="card-standard rounded-t-none border-t-0 p-6 sm:p-8 min-h-[300px]">
            
            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div id="profile-panel-account" role="tabpanel" aria-labelledby="profile-tab-account" className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#a1a1a6]">
                      <User size={13} /> Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="fullName"
                        value={profile.fullName}
                        onChange={handleInputChange}
                        className="input-standard w-full"
                        placeholder="Enter your full name"
                        autoFocus
                      />
                    ) : (
                      <div className="py-2.5 px-4 rounded-[10px] border border-[#2e2e33] bg-[#131519] text-sm text-[#f0f0ee]">
                        {profile.fullName || 'Not set'}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#a1a1a6]">
                      <Mail size={13} /> Email Address
                    </label>
                    <div className="py-2.5 px-4 rounded-[10px] border border-[#2e2e33] bg-[#131519] text-sm text-[#a1a1a6] flex justify-between items-center">
                      <span>{profile.email}</span>
                      <Lock size={13} className="text-[#a1a1a6]" />
                    </div>
                  </div>
                  
                  {/* Join Date */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#a1a1a6]">
                      <Calendar size={13} /> Member Since
                    </label>
                    <div className="py-2.5 px-4 rounded-[10px] border border-[#2e2e33] bg-[#131519] text-sm text-[#f0f0ee]">
                      {joinDate}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="btn-primary flex items-center justify-center gap-2"
                      >
                        <Save size={15} /> {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="btn-secondary flex items-center justify-center gap-2"
                      >
                        <X size={15} /> Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-secondary flex items-center justify-center gap-2 text-xs"
                    >
                      <Edit2 size={14} /> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <div id="profile-panel-preferences" role="tabpanel" aria-labelledby="profile-tab-preferences" className="space-y-6 animate-in fade-in duration-300">
                <p className="text-[#a1a1a6] text-xs">Customize your learning experience. (Note: These settings are stored locally on this device).</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-[10px] border border-[#2e2e33] bg-[#131519]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-[8px] bg-[#18181b] border border-[#2e2e33] text-[#f0f0ee]">
                        <Bell size={16} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-[#f0f0ee]">Study Reminders</h4>
                        <p className="text-xs text-[#a1a1a6]">Receive daily notifications to keep up your streak.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-10 h-5 bg-[#2e2e33] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-[10px] border border-[#2e2e33] bg-[#131519]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-[8px] bg-[#18181b] border border-[#2e2e33] text-[#f0f0ee]">
                        <Monitor size={16} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-[#f0f0ee]">Focus Mode</h4>
                        <p className="text-xs text-[#a1a1a6]">Hide sidebar and navigation while taking quizzes.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-10 h-5 bg-[#2e2e33] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div id="profile-panel-security" role="tabpanel" aria-labelledby="profile-tab-security" className="space-y-6 animate-in fade-in duration-300">
                {/* User ID */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#a1a1a6]">
                    <Key size={13} /> Unique User ID
                  </label>
                  <p className="py-2.5 px-4 rounded-[10px] font-mono text-xs break-all bg-[#131519] border border-[#2e2e33] text-[#a1a1a6]">
                    {user.id}
                  </p>
                  <p className="text-xs text-[#a1a1aa]">Required for support requests and API access.</p>
                </div>

                {/* Password Reset */}
                <div className="pt-2">
                  <button
                    onClick={handleResetPassword}
                    className="btn-secondary flex items-center gap-2 text-xs"
                  >
                    <Lock size={14} /> Send Password Reset Email
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="mt-8 pt-6 border-t border-[#2e2e33]">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#f87171] flex items-center gap-2 mb-2">
                    Danger Zone
                  </h2>
                  <p className="text-xs text-[#a1a1a6] mb-4">
                    These actions are permanent and cannot be undone. Please proceed with caution.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteData}
                      disabled={isDeletingData || isDeletingAccount}
                      className="btn-secondary flex items-center justify-center gap-2 !border-[#ef4444]/40 !text-[#f87171] hover:!bg-[#ef4444]/10 text-xs"
                    >
                      <Trash2 size={14} />
                      {isDeletingData ? 'Deleting Data...' : 'Delete Study Data'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingData || isDeletingAccount}
                      className="btn-danger flex items-center justify-center gap-2 text-xs"
                    >
                      <UserX size={14} />
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

