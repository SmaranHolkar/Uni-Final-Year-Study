import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [session, setSession] = useState(null);

  useEffect(() => {
    // initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { subscription } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });
    return () => subscription?.unsubscribe();
  }, []);

  async function signUp() {
    setMsg('Signing up...');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else setMsg('Check your email for confirmation .');
  }

  async function signIn() {
    setMsg('Signing in...');
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(`Signed in as ${data.user.email}`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMsg('Signed out');
  }

  // Example: call backend with Bearer token
  async function callProtected() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) {
      setMsg('No session token. Sign in first.');
      return;
    }
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const res = await fetch(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setMsg(JSON.stringify(json));
  }

  return (
    <div>
      <h2>Auth</h2>
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <div>
        <button onClick={signUp}>Sign up</button>
        <button onClick={signIn}>Sign in</button>
        <button onClick={signOut}>Sign out</button>
        <button onClick={callProtected}>Call protected endpoint</button>
      </div>
      <pre>{msg}</pre>
      <pre>Session: {session ? JSON.stringify(session) : 'none'}</pre>
    </div>
  );
}
