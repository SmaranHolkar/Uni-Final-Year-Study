import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bookmark,
  Globe,
  Search,
  Trash as Trash2,
  X,
  Plus,
  Filter,
  Play,
  Refresh as RefreshCw,
  ArrowLeft,
  Download,
  ShareAndroid as Share2,
} from 'iconoir-react'
import { useAuth } from '../AuthContext'
import { DotGrid } from '../components/Reveal.jsx'
import AppSidebar from '../components/AppSidebar.jsx'

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : (import.meta.env.VITE_API_URL || 'http://localhost:5000')

function extractToolHtml(toolObj) {
  if (!toolObj) return ''
  if (typeof toolObj === 'string') return toolObj
  if (typeof toolObj.html === 'string' && toolObj.html.trim()) return toolObj.html
  if (typeof toolObj.app?.html === 'string' && toolObj.app.html.trim()) return toolObj.app.html
  if (toolObj.generated_tool) return extractToolHtml(toolObj.generated_tool)
  return ''
}

function extractToolMetadata(toolObj) {
  if (!toolObj) return { title: 'Interactive Learning Tool', description: '', items: [], toolType: 'tool', senderEmail: null }
  const target = toolObj.generated_tool || toolObj
  const items = Array.isArray(target.items)
    ? target.items
    : (Array.isArray(target?.data?.items) ? target.data.items : [])
  return {
    title: target.title || toolObj.title || 'Interactive Learning Tool',
    description: target.description || toolObj.description || '',
    items,
    toolType: target.toolType || target.tool_type || toolObj.tool_type || 'tool',
    senderEmail: toolObj.sender_email || null,
  }
}

const TABS = [
  { id: 'my-tools',     label: 'Saved Tools',    icon: Bookmark },
  { id: 'shared',       label: 'Shared with Me', icon: Share2 },
  { id: 'marketplace',  label: 'Marketplace',    icon: Globe },
]

const CATEGORIES = ['all', 'flashcards', 'quiz', 'feynman', 'cloze', 'scenario', 'revision-kit', 'notes', 'mindmap', 'calculator']

export default function ToolsLibrary() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'my-tools'

  const [savedTools, setSavedTools] = useState([])
  const [sharedTools, setSharedTools] = useState([])
  const [marketplaceTools, setMarketplaceTools] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeTab, setActiveTab] = useState(initialTab)
  const [activeTool, setActiveTool] = useState(null)

  useEffect(() => { fetchAll() }, [session?.access_token])

  // Keep tab in sync with URL
  useEffect(() => {
    const tab = searchParams.get('tab') || 'my-tools'
    setActiveTab(tab)
  }, [searchParams])

  const switchTab = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
    setSearchQuery('')
    setActiveCategory('all')
  }

  const fetchAll = async () => {
    setIsLoading(true)
    try {
      const headers = {}
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

      if (session?.access_token) {
        const r1 = await fetch(`${API_BASE}/api/marketplace/tools/saved`, { headers, credentials: 'include' })
        if (r1.ok) { const d = await r1.json(); setSavedTools(d.data || []) }

        const r2 = await fetch(`${API_BASE}/api/marketplace/tools/shared-with-me`, { headers, credentials: 'include' })
        if (r2.ok) { const d = await r2.json(); setSharedTools(d.data || []) }
      }

      const r3 = await fetch(`${API_BASE}/api/marketplace/tools/public?limit=60`, { headers, credentials: 'include' })
      if (r3.ok) { const d = await r3.json(); setMarketplaceTools(d.data || []) }
    } catch (err) {
      console.error('Failed to load tools library:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTool = async (toolId, e) => {
    if (e) e.stopPropagation()
    if (!session?.access_token) { alert('Please sign in.'); return }
    if (!window.confirm('Remove this tool from your saved collection?')) return
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/${toolId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setSavedTools((prev) => prev.filter((t) => t.id !== toolId))
      if (activeTool?.id === toolId) setActiveTool(null)
    } catch (err) { console.error('Delete tool error:', err); alert('Could not remove tool.') }
  }

  const handleSaveSharedTool = async (toolObj, e) => {
    if (e) e.stopPropagation()
    if (!session?.access_token) { alert('Please sign in to save tools.'); return }
    const tool = toolObj.generated_tool || toolObj
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
        body: JSON.stringify({ title: tool.title, description: tool.description, html: extractToolHtml(tool), toolType: tool.toolType || tool.tool_type || 'tool', isPublic: false }),
      })
      if (res.ok) { alert('Saved to your collection!') }
    } catch (err) { console.error('Save failed:', err) }
  }

  const handleExportAnkiCsv = (toolObj, e) => {
    if (e) e.stopPropagation()
    const meta = extractToolMetadata(toolObj)
    const items = meta.items || []
    if (!items.length) { alert('No card items available to export.'); return }
    const csvContent = items
      .map((item) => {
        const front = (item.front || item.question || item.concept || item.title || '').replace(/"/g, '""').replace(/\n/g, ' ')
        const back = (item.back || item.answer || item.explanation || item.detail || '').replace(/"/g, '""').replace(/\n/g, ' ')
        return `"${front}","${back}"`
      }).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${(extractToolMetadata(toolObj).title || 'study_tool').replace(/[^a-zA-Z0-9_-]/g, '_')}_anki.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const currentList = activeTab === 'my-tools' ? savedTools : activeTab === 'shared' ? sharedTools : marketplaceTools
  const filteredTools = currentList.filter((t) => {
    const meta = extractToolMetadata(t)
    const matchesSearch =
      meta.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meta.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      activeCategory === 'all' || meta.toolType.toLowerCase().includes(activeCategory.toLowerCase())
    return matchesSearch && matchesCategory
  })

  const activeHtml = extractToolHtml(activeTool)
  const activeMeta = extractToolMetadata(activeTool)
  const tabCounts = { 'my-tools': savedTools.length, 'shared': sharedTools.length, 'marketplace': marketplaceTools.length }

  return (
    // Outer wrapper: fills the space given by App.css (flex-1 h-0), and is a flex row
    <div className="flex flex-1 h-0 w-full overflow-hidden bg-[#131519]">
      <DotGrid />

      {/* Shared Sidebar */}
      <AppSidebar />

      {/* Scrollable main content */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-5">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-2xl p-6 border border-[#282E38]">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
                <Bookmark className="w-7 h-7 text-[#5A7D99]" />
                <span>Tools Library</span>
              </h1>
              <p className="mt-1 text-sm text-[#6E7580] max-w-xl">
                Your saved tools, tools shared with you, and the community Marketplace — all in one place.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAll}
                className="p-2.5 rounded-xl bg-[#21262E] hover:bg-[#282E38] border border-[#282E38] transition-all"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-[#5A7D99] ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                to="/"
                className="px-4 py-2.5 rounded-xl bg-[#5A7D99] hover:bg-[#3D5E7A] text-xs font-semibold text-white flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Generate New Tool
              </Link>
            </div>
          </div>

          {/* Tabs + Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-1 p-1 bg-[#1A1E24] rounded-xl border border-[#282E38]">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => switchTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === id ? 'bg-[#5A7D99] text-white shadow-sm' : 'text-[#6E7580] hover:text-[#CDD1D6]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-white/20' : 'bg-[#282E38]'}`}>
                    {tabCounts[id]}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#6E7580]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab === 'my-tools' ? 'saved' : activeTab === 'shared' ? 'shared' : 'marketplace'} tools...`}
                className="w-full bg-[#1A1E24] border border-[#282E38] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] transition-all"
              />
            </div>
          </div>

          {/* Category Pills */}
          {activeTab !== 'shared' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-[#6E7580] flex items-center gap-1 font-semibold pr-2 flex-shrink-0">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all flex-shrink-0 ${
                    activeCategory === cat
                      ? 'bg-[#21262E] text-white border border-[#5A7D99]'
                      : 'bg-[#1A1E24] text-[#6E7580] border border-[#282E38] hover:text-[#CDD1D6]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Tools Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 glass-card rounded-2xl border border-[#282E38] animate-pulse p-5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-[#21262E] rounded w-3/4" />
                    <div className="h-3 bg-[#21262E] rounded w-1/2" />
                  </div>
                  <div className="h-8 bg-[#21262E] rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="rounded-2xl bg-[#1A1E24] border border-[#282E38] p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#21262E] border border-[#282E38] flex items-center justify-center text-[#5A7D99] mx-auto mb-4">
                {activeTab === 'shared' ? <Share2 className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {activeTab === 'my-tools' ? 'No Saved Tools' : activeTab === 'shared' ? 'Nothing Shared Yet' : 'No Tools Found'}
              </h3>
              <p className="text-xs text-[#6E7580] max-w-sm mx-auto mb-5">
                {activeTab === 'my-tools'
                  ? "You haven't saved any tools yet. Head to the playground and ask Vela to generate one!"
                  : activeTab === 'shared'
                  ? "When classmates share a tool with your email address, it will appear here."
                  : "No community tools matched your search."}
              </p>
              {activeTab === 'my-tools' && (
                <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A7D99] hover:bg-[#3D5E7A] text-white text-xs font-semibold transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Go to Playground
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => {
                const meta = extractToolMetadata(tool)
                return (
                  <div
                    key={tool.id || tool.share_id}
                    onClick={() => setActiveTool(tool)}
                    className="group rounded-2xl bg-[#1A1E24] border border-[#282E38] hover:border-[#5A7D99]/50 p-5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#5A7D99]/5 rounded-bl-full pointer-events-none group-hover:bg-[#5A7D99]/10 transition-all" />
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-base text-white group-hover:text-[#5A7D99] transition-colors line-clamp-1">
                          {meta.title}
                        </h3>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#21262E] text-[#5A7D99] border border-[#282E38] flex-shrink-0">
                          {meta.toolType}
                        </span>
                      </div>
                      {activeTab === 'shared' && meta.senderEmail && (
                        <p className="text-[11px] text-[#5A7D99]/70 mb-1 flex items-center gap-1">
                          <Share2 className="w-3 h-3" /> From: {meta.senderEmail}
                        </p>
                      )}
                      <p className="text-xs text-[#6E7580] line-clamp-2 leading-relaxed mb-4">
                        {meta.description || 'Interactive revision tool for study and review.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#282E38]">
                      <span className="text-[11px] text-[#6E7580] font-mono">
                        {tool.created_at ? new Date(tool.created_at).toLocaleDateString() : 'Ready'}
                      </span>
                      <div className="flex items-center gap-2">
                        {activeTab === 'my-tools' && (
                          <button
                            onClick={(e) => handleDeleteTool(tool.id, e)}
                            className="p-1.5 rounded-lg text-[#6E7580] hover:text-red-400 hover:bg-[#21262E] transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {activeTab === 'shared' && (
                          <button
                            onClick={(e) => handleSaveSharedTool(tool, e)}
                            className="p-1.5 px-2.5 rounded-lg text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            Save
                          </button>
                        )}
                        <button
                          onClick={() => setActiveTool(tool)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#5A7D99]/20 text-[#5A7D99] group-hover:bg-[#5A7D99] group-hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" /> Launch
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Tool Player */}
      {activeTool && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col">
          <div className="h-14 bg-[#1A1E24] border-b border-[#282E38] px-6 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveTool(null)} className="flex items-center gap-1.5 text-xs text-[#6E7580] hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Library
              </button>
              <div className="h-4 w-px bg-[#282E38]" />
              <h2 className="font-semibold text-sm text-white truncate">{activeMeta.title}</h2>
            </div>
            <div className="flex items-center gap-3">
              {Array.isArray(activeMeta.items) && activeMeta.items.length > 0 && (
                <button
                  onClick={() => handleExportAnkiCsv(activeTool)}
                  className="p-1.5 px-3 rounded-lg bg-[#21262E] hover:bg-[#5A7D99] border border-[#282E38] text-xs font-semibold text-[#CDD1D6] hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export to Anki
                </button>
              )}
              <span className="text-xs text-[#5A7D99] font-mono capitalize px-2.5 py-1 rounded-md bg-[#131519] border border-[#282E38]">
                {activeMeta.toolType}
              </span>
              <button onClick={() => setActiveTool(null)} className="p-1.5 rounded-lg text-[#6E7580] hover:text-white hover:bg-[#21262E] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 bg-[#131519] overflow-y-auto flex flex-col">
            {activeHtml ? (
              <iframe
                srcDoc={activeHtml}
                title="Tool Player"
                className="w-full h-full min-h-[600px] border-none rounded-2xl bg-white flex-1 shadow-2xl"
                allow="microphone"
                sandbox="allow-scripts allow-modals allow-forms"
              />
            ) : (
              <div className="max-w-4xl w-full mx-auto glass-panel rounded-2xl p-8 border border-[#282E38] space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{activeMeta.title}</h3>
                  <p className="text-sm text-[#CDD1D6]">{activeMeta.description}</p>
                </div>
                {Array.isArray(activeMeta.items) && activeMeta.items.length > 0 ? (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {activeMeta.items.map((item, idx) => (
                      <div key={idx} className="p-5 rounded-2xl bg-[#1A1E24] border border-[#282E38]">
                        <p className="font-medium text-sm text-white mb-2">{item.question || item.title || item.concept || item.front}</p>
                        <p className="text-xs text-[#6E7580] leading-relaxed">{item.answer || item.explanation || item.detail || item.back || item.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6E7580]">This revision tool is ready for your study session.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
