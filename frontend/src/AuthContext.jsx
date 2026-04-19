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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !localStorage.getItem('session_start')) {
        localStorage.setItem('session_start', Date.now().toString());
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN') {
        localStorage.setItem('session_start', Date.now().toString());
      }
      if (_event === 'SIGNED_OUT') {
        localStorage.removeItem('session_start');
      }
      setSession(session);
      setUser(session?.user ?? null);
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
