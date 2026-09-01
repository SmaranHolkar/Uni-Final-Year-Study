import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, Flash as Zap, Wrench } from 'iconoir-react'
import { useAuth } from '../AuthContext'

export default function Navbar({ onOpenSessions, toolsQuota }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="flex-shrink-0 z-40 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 50" width="210" height="36" className="group-hover:opacity-90 transition-opacity">
            <defs>
              <path id="star" d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" fill="#60a5fa"/>
              <path id="small-star" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="#93c5fd"/>
            </defs>
            <g transform="translate(10, -5) scale(0.55)">
              <path d="M 30 20 L 20 80 L 65 40 L 60 55 L 70 70 L 100 65" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinejoin="round"/>
              <use href="#star" x="30" y="20"/>
              <use href="#star" x="20" y="80"/>
              <use href="#star" x="65" y="40"/>
              <use href="#small-star" x="60" y="55"/>
              <use href="#small-star" x="70" y="70"/>
              <use href="#star" x="100" y="65"/>
            </g>
            <text x="75" y="34" fontFamily="DM Serif Display, serif" fontSize="22" fontWeight="600" fill="#f8fafc">Learning Playground</text>
          </svg>
        </Link>

        {/* Right Section / Auth */}
        <div className="flex items-center gap-3">
          {toolsQuota && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>{toolsQuota.usedCount}/{toolsQuota.quotaLimit ?? '∞'} tools</span>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono text-slate-200">
                {user.email ? user.email.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <button
                onClick={async () => {
                  await signOut()
                  navigate('/auth')
                }}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
