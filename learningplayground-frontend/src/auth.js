import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jnkulydbqmvcdskncdkw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impua3VseWRicW12Y2Rza25jZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMDAzMDgsImV4cCI6MjA4NDU2MDMwOH0.TNk-GEuNLP_8vX0oo8TsV1s7v3gFTHHOW6ZLWjSKQuQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}
