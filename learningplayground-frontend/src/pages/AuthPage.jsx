import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, signUp } from '../auth'
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error } = await signUp(email, password)
        if (error) throw error
        setMessage('Registration successful! Check your email for confirmation or sign in.')
      } else {
        const { data, error } = await signIn(email, password)
        if (error) throw error
        navigate('/')
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#131519] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 50" width="230" height="42">
            <defs>
              <path id="star" d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" fill="#5A7D99"/>
              <path id="small-star" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="#5A7D99"/>
            </defs>
            <g transform="translate(10, -5) scale(0.55)">
              <path d="M 30 20 L 20 80 L 65 40 L 60 55 L 70 70 L 100 65" fill="none" stroke="#5A7D99" strokeWidth="2.5" strokeLinejoin="round"/>
              <use href="#star" x="30" y="20"/>
              <use href="#star" x="20" y="80"/>
              <use href="#star" x="65" y="40"/>
              <use href="#small-star" x="60" y="55"/>
              <use href="#small-star" x="70" y="70"/>
              <use href="#star" x="100" y="65"/>
            </g>
            <text x="75" y="34" fontFamily="DM Serif Display, serif" fontSize="22" fontWeight="600" fill="#CDD1D6">Learning Playground</text>
          </svg>
        </Link>
        <h2 className="text-xl font-semibold text-[#CDD1D6]">
          {isSignUp ? 'Create your account' : 'Sign in to your playground'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#1A1E24] py-8 px-4 shadow-2xl border border-[#282E38] sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-300 text-xs">
              {message}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#6E7580] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6E7580] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#21262E] border border-[#282E38] rounded-xl text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#6E7580] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6E7580] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#21262E] border border-[#282E38] rounded-xl text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#5A7D99] to-[#3D6660] hover:from-[#3D5E7A] hover:to-[#4A6B52] focus:outline-none transition-all shadow-md shadow-[#5A7D99]/20 disabled:opacity-50"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setMessage('')
              }}
              className="text-[#5A7D99] hover:text-white transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>

        {/* Out-of-the-way fine-print for Terms and Conditions & Privacy */}
        <div className="mt-6 text-center text-[11px] text-[#565C66] tracking-wide">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-[#9AA0A8] transition-colors">
            Terms & Conditions
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline hover:text-[#9AA0A8] transition-colors">
            Privacy Policy
          </Link>.
        </div>
      </div>
    </div>
  )
}
