import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, Zap, Wrench } from 'lucide-react'
import { useAuth } from '../AuthContext'

export default function Navbar({ onOpenSessions, toolsQuota }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="flex-shrink-0 z-40 w-full border-b border-[#282E38] bg-[#1A1E24]/90 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 50" width="210" height="36" className="group-hover:opacity-90 transition-opacity">
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

        {/* Right Section / Auth */}
        <div className="flex items-center gap-3">
          {toolsQuota && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#21262E] border border-[#282E38] text-xs font-mono text-[#5A7D99]">
              <Zap className="w-3.5 h-3.5 text-[#3D6660]" />
              <span>{toolsQuota.usedCount}/{toolsQuota.quotaLimit ?? '∞'} tools</span>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#21262E] border border-[#282E38] flex items-center justify-center text-xs font-mono text-[#5A7D99]">
                {user.email ? user.email.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <button
                onClick={async () => {
                  await signOut()
                  navigate('/auth')
                }}
                className="p-1.5 text-[#6E7580] hover:text-red-400 rounded-lg hover:bg-[#21262E] transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#5A7D99] to-[#3D6660] hover:from-[#3D5E7A] hover:to-[#4A6B52] rounded-lg transition-all shadow-md shadow-[#5A7D99]/15"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
