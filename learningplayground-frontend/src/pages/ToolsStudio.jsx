import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, Sparkles, Search, Trash2, Maximize2, X, Plus, Filter, Play, RefreshCw, Bookmark, ArrowLeft, Download, Check } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { DotGrid } from '../components/Reveal.jsx'

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : (import.meta.env.VITE_API_URL || 'http://localhost:5000')

// Helper to safely unwrap HTML string from tool object regardless of nesting
function extractToolHtml(toolObj) {
  if (!toolObj) return ''
  if (typeof toolObj === 'string') return toolObj
  if (typeof toolObj.html === 'string' && toolObj.html.trim()) return toolObj.html
  if (typeof toolObj.app?.html === 'string' && toolObj.app.html.trim()) return toolObj.app.html
  if (toolObj.generated_tool) return extractToolHtml(toolObj.generated_tool)
  return ''
}

// Helper to safely extract tool metadata (title, description, items, toolType)
function extractToolMetadata(toolObj) {
  if (!toolObj) return { title: 'Interactive Learning Tool', description: '', items: [], toolType: 'tool' }
  const target = toolObj.generated_tool || toolObj
  const items = Array.isArray(target.items) 
    ? target.items 
    : (Array.isArray(target?.data?.items) ? target.data.items : [])

  return {
    title: target.title || toolObj.title || 'Interactive Learning Tool',
    description: target.description || toolObj.description || '',
    items,
    toolType: target.toolType || target.tool_type || toolObj.tool_type || 'tool',
  }
}

export default function ToolsStudio() {
  const { session } = useAuth()
  const [savedTools, setSavedTools] = useState([])
  const [marketplaceTools, setMarketplaceTools] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('my-tools') // 'my-tools' | 'community'
  const [activeTool, setActiveTool] = useState(null) // Fullscreen active player tool

  useEffect(() => {
    fetchTools()
  }, [session?.access_token])

  const fetchTools = async () => {
    setIsLoading(true)
    try {
      if (session?.access_token) {
        const res = await fetch(`${API_BASE}/api/marketplace/tools/saved`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setSavedTools(data.data || [])
        }
      }

      const headers = {}
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
      const mRes = await fetch(`${API_BASE}/api/marketplace/tools/public?limit=30`, {
        headers,
        credentials: 'include',
      })
      if (mRes.ok) {
        const mData = await mRes.json()
        setMarketplaceTools(mData.data || [])
      }
    } catch (err) {
      console.error('Failed to load tools in studio:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTool = async (toolId, e) => {
    if (e) e.stopPropagation()
    if (!session?.access_token) {
      alert('Please sign in to manage your collection.')
      return
    }

    if (!window.confirm('Are you sure you want to delete this tool from your database collection?')) {
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/${toolId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Failed to delete tool')

      setSavedTools((prev) => prev.filter((t) => t.id !== toolId))
      if (activeTool?.id === toolId) setActiveTool(null)
    } catch (err) {
      console.error('Delete tool error:', err)
      alert('Could not delete tool.')
    }
  }

  const handleExportAnkiCsv = (toolObj) => {
    const meta = extractToolMetadata(toolObj)
    const items = meta.items || []
    if (!items.length) {
      alert('No card items available to export.')
      return
    }

    const csvContent = items
      .map((item) => {
        const front = (item.front || item.question || item.concept || item.title || '').replace(/"/g, '""').replace(/\n/g, ' ')
        const back = (item.back || item.answer || item.explanation || item.detail || '').replace(/"/g, '""').replace(/\n/g, ' ')
        return `"${front}","${back}"`
      })
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${(meta.title || 'study_tool').replace(/[^a-zA-Z0-9_-]/g, '_')}_anki.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const currentList = activeTab === 'my-tools' ? savedTools : marketplaceTools

  const filteredTools = currentList.filter((t) => {
    const meta = extractToolMetadata(t)
    const matchesSearch =
      meta.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meta.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      activeCategory === 'all' ||
      meta.toolType.toLowerCase().includes(activeCategory.toLowerCase())
    return matchesSearch && matchesCategory
  })

  const activeHtml = extractToolHtml(activeTool)
  const activeMeta = extractToolMetadata(activeTool)

  return (
    <div className="relative min-h-screen bg-[#131519] text-[#CDD1D6] flex flex-col font-sans">
      <DotGrid />

      {/* Hero Header */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-2xl p-6 border border-[#282E38]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
              <Wrench className="w-7 h-7 text-[#5A7D99]" />
              <span>Revision Tools Studio</span>
            </h1>
            <p className="mt-1 text-sm text-[#6E7580] max-w-xl">
              Access and use your saved revision tools directly without going through the AI chat conversation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchTools}
              className="p-2.5 rounded-xl bg-[#21262E] hover:bg-[#282E38] border border-[#282E38] text-xs font-semibold text-[#CDD1D6] hover:text-white transition-all shadow-md"
              title="Refresh tools"
            >
              <RefreshCw className={`w-4 h-4 text-[#5A7D99] ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              to="/"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5A7D99] to-[#3D6660] hover:from-[#3D5E7A] hover:to-[#4A6B52] text-xs font-semibold text-white flex items-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Generate New Tool with Vela
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex flex-col gap-6">
        
        {/* Navigation Tabs & Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Main Tabs */}
          <div className="flex gap-2 p-1 bg-[#1A1E24] rounded-xl border border-[#282E38] w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('my-tools')}
              className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'my-tools'
                  ? 'bg-[#5A7D99] text-white shadow-md'
                  : 'text-[#6E7580] hover:text-[#CDD1D6]'
              }`}
            >
              My Saved Tools ({savedTools.length})
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'community'
                  ? 'bg-[#5A7D99] text-white shadow-md'
                  : 'text-[#6E7580] hover:text-[#CDD1D6]'
              }`}
            >
              Community Marketplace ({marketplaceTools.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#6E7580]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools by title or description..."
              className="w-full bg-[#1A1E24] border border-[#282E38] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#6E7580] focus:outline-none focus:border-[#5A7D99] transition-all"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <span className="text-xs text-[#6E7580] flex items-center gap-1 font-semibold pr-2 flex-shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['all', 'flashcards', 'quiz', 'feynman', 'cloze', 'scenario', 'revision-kit', 'notes', 'mindmap', 'calculator'].map((cat) => (
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

        {/* Tools Cards Grid */}
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
          <div className="rounded-[8px] bg-[#1A1E24] border border-[#282E38] p-10 text-center my-8">
            <div className="w-12 h-12 rounded-[6px] bg-[#21262E] border border-[#282E38] flex items-center justify-center text-[#5A7D99] mx-auto mb-3">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">No Tools Found</h3>
            <p className="text-xs text-[#8E8E93] max-w-md mx-auto mb-5">
              {activeTab === 'my-tools'
                ? "You haven't saved any revision tools yet. Ask Vela in the playground to generate custom tools!"
                : "No community tools matched your search filter."}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[#5A7D99] hover:bg-[#3D5E7A] text-white text-xs font-semibold transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create a Tool</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => {
              const meta = extractToolMetadata(tool)
              return (
                <div
                  key={tool.id}
                  onClick={() => setActiveTool(tool)}
                  className="group rounded-[8px] bg-[#1A1E24] border border-[#282E38] hover:border-[#5A7D99]/60 p-5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#5A7D99]/5 rounded-bl-full pointer-events-none group-hover:bg-[#5A7D99]/15 transition-all" />

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-base text-white group-hover:text-[#5A7D99] transition-colors line-clamp-1">
                        {meta.title}
                      </h3>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#21262E] text-[#5A7D99] border border-[#282E38] flex-shrink-0">
                        {meta.toolType}
                      </span>
                    </div>

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
                          title="Delete tool"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setActiveTool(tool)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#5A7D99]/20 text-[#5A7D99] group-hover:bg-[#5A7D99] group-hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Launch Tool
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>

      {/* Fullscreen Interactive Tool Player Modal */}
      {activeTool && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col">
          
          {/* Modal Header */}
          <div className="h-14 bg-[#1A1E24] border-b border-[#282E38] px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTool(null)}
                className="flex items-center gap-1.5 text-xs text-[#6E7580] hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Tools Studio
              </button>

              <div className="h-4 w-px bg-[#282E38]" />

              <h2 className="font-semibold text-sm text-white tracking-wide truncate">
                {activeMeta.title}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {Array.isArray(activeMeta.items) && activeMeta.items.length > 0 && (
                <button
                  onClick={() => handleExportAnkiCsv(activeTool)}
                  className="p-1.5 px-3 rounded-lg bg-[#21262E] hover:bg-[#5A7D99] border border-[#282E38] text-xs font-semibold text-[#CDD1D6] hover:text-white transition-all flex items-center gap-1.5"
                  title="Export cards to Anki CSV format"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export to Anki</span>
                </button>
              )}

              <span className="text-xs text-[#5A7D99] font-mono capitalize px-2.5 py-1 rounded-md bg-[#131519] border border-[#282E38]">
                {activeMeta.toolType}
              </span>

              <button
                onClick={() => setActiveTool(null)}
                className="p-1.5 rounded-lg text-[#6E7580] hover:text-white hover:bg-[#21262E] transition-colors"
                title="Close player"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body / Sandbox Viewer */}
          <div className="flex-1 p-6 bg-[#131519] overflow-y-auto flex flex-col">
            {activeHtml ? (
              <iframe
                srcDoc={activeHtml}
                title="Interactive Tool Player"
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
                        <p className="font-medium text-sm text-white mb-2">
                          {item.question || item.title || item.concept || item.front}
                        </p>
                        <p className="text-xs text-[#6E7580] leading-relaxed">
                          {item.answer || item.explanation || item.detail || item.back || item.content}
                        </p>
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
