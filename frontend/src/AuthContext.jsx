import React, { useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient';
import { AuthContext } from './authContextInstance';

export { AuthContext } from './authContextInstance';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 1 day

// Handles AuthProvider logic.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [currentDocumentTitle, setCurrentDocumentTitle] = useState(null);

  useEffect(() => {
    // Get session
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[AuthContext] Session error:', error.message);
          if (error.message?.includes('Refresh Token') || error.status === 400) {
            localStorage.removeItem('session_start');
            supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          }
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        const initialSession = data?.session ?? null;
        if (initialSession && !localStorage.getItem('session_start')) {
          localStorage.setItem('session_start', Date.now().toString());
        }
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[AuthContext] getSession failed:', err?.message || err);
        localStorage.removeItem('session_start');
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN') {
        localStorage.setItem('session_start', Date.now().toString());
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('session_start');
      }
      if (event === 'TOKEN_REFRESHED' && !newSession) {
        localStorage.removeItem('session_start');
      }
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Enforce 1-day session limit
  useEffect(() => {
    if (!session) return;

    let sessionStart = parseInt(localStorage.getItem('session_start') || '0', 10);
    
    // If we have a session but no start time (e.g., PASSWORD_RECOVERY event), set it now
    if (!sessionStart) {
      sessionStart = Date.now();
      localStorage.setItem('session_start', sessionStart.toString());
    }

    const elapsed = Date.now() - sessionStart;

    if (elapsed >= SESSION_DURATION) {
      supabase.auth.signOut();
      return;
    }

    const remaining = SESSION_DURATION - elapsed;
    const timer = setTimeout(() => supabase.auth.signOut(), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [session]);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      loading, 
      currentDocumentId, 
      setCurrentDocumentId, 
      currentDocumentTitle, 
      setCurrentDocumentTitle,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Handles useAuth logic.
export function useAuth() {
  return useContext(AuthContext);
}
