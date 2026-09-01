import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ChatBubble as MessageSquare,
  Bookmark,
  ShareAndroid as Share2,
  Globe,
  Plus,
  LogOut,
  User,
  NavArrowRight as ChevronRight,
  Flash as Zap,
} from 'iconoir-react'
import { useAuth } from '../AuthContext'
import Vela from './Vela'

const NAV_ITEMS = [
  { icon: MessageSquare, label: 'Playground',    href: '/' },
  { icon: Bookmark,      label: 'Saved Tools',   href: '/tools?tab=my-tools' },
  { icon: Share2,        label: 'Shared with Me', href: '/tools?tab=shared' },
  { icon: Globe,         label: 'Marketplace',   href: '/tools?tab=marketplace' },
]

export default function AppSidebar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  const isActive = (href) => {
    const base = href.split('?')[0]
    const tab = new URLSearchParams(href.split('?')[1] || '').get('tab')
    const currentTab = new URLSearchParams(location.search).get('tab')
    if (base === '/' && location.pathname === '/') return true
    if (base === '/tools' && location.pathname === '/tools') {
      if (!tab) return true
      return tab === currentTab
    }
    return false
  }

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        flex-shrink-0 relative z-30 flex flex-col
        bg-slate-900 border-r border-slate-800
        transition-[width] duration-300 overflow-hidden
        ${hovered ? 'w-52' : 'w-[4.25rem]'}
      `}
    >
      {/* Vela logo mark */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800 flex-shrink-0">
        <Vela size={26} />
        <span className={`ml-3 text-sm font-bold text-white tracking-tight whitespace-nowrap transition-all duration-200 ${hovered ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
          Learning Playground
        </span>
      </div>

      {/* New chat shortcut */}
      <div className="px-3 py-3 border-b border-slate-800 flex-shrink-0">
        <Link
          to="/"
          className={`flex items-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2 transition-colors ${hovered ? 'px-3 gap-2' : 'justify-center px-2'}`}
          title="New chat"
        >
          <Plus className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className={`text-xs font-semibold text-white whitespace-nowrap transition-all duration-200 ${hovered ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            New Chat
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              to={href}
              title={label}
              className={`
                flex items-center rounded-lg py-2.5 transition-all
                ${hovered ? 'px-3 gap-3' : 'justify-center px-2'}
                ${active
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }
              `}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className={`text-xs font-medium whitespace-nowrap transition-all duration-200 ${hovered ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                {label}
              </span>
              {active && hovered && (
                <ChevronRight className="w-3 h-3 ml-auto text-slate-400 flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 p-3 border-t border-slate-800 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          {user?.email ? user.email.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
        </div>
        <div className={`min-w-0 flex-1 transition-all duration-200 ${hovered ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
          <p className="text-xs font-semibold text-white truncate">
            {user?.email ? user.email.split('@')[0] : 'Guest'}
          </p>
          <p className="text-[10px] text-slate-500">{user ? 'Free Plan' : 'Not signed in'}</p>
        </div>
        {hovered && user && (
          <button
            onClick={async () => { await signOut(); navigate('/auth') }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors flex-shrink-0"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  )
}
