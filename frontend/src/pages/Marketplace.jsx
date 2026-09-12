import { useState, useEffect, useRef } from 'react'
import { Zap, RotateCcw, Search, BookOpen, Gift, TrendingUp, Code2, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useAuth } from '../AuthContext'
import '../App.css'
import { Reveal, DotGrid } from '../components/Reveal.jsx'
import { Skeleton } from '../components/Skeleton.jsx'

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : (import.meta.env.VITE_API_URL || 'http://localhost:5000')

function Marketplace() {
  const { session } = useAuth()
  const [tools, setTools] = useState([])
  const [filteredTools, setFilteredTools] = useState([])
  const [selectedTool, setSelectedTool] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [votingToolId, setVotingToolId] = useState(null)
  const [brokenPreviewImages, setBrokenPreviewImages] = useState(() => new Set())
  const eventSourceRef = useRef(null)
  const lastFetchRef = useRef(null)
  const modalShellRef = useRef(null)

  const categories = [
    { id: 'all', label: 'All Tools', icon: Zap },
    { id: 'study-guide', label: 'Study Guides', icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', icon: TrendingUp },
    { id: 'interactive', label: 'Interactive', icon: Code2 },
  ]

  const getToolTheme = (tool) => {
    const type = String(tool?.tool_type || '').toLowerCase()
    const cat = String(tool?.category || '').toLowerCase()

    // Priority 1: Interactive/Visual tools
    if (type.includes('interactive') || type.includes('match') || type.includes('diagram') || 
        cat.includes('interactive') || cat.includes('match') || cat.includes('diagram')) {
      return {
        accent: 'var(--chart-4)', // Nebula pink/violet
        tint: 'rgba(217, 70, 239, 0.08)',
        tintStrong: 'rgba(217, 70, 239, 0.12)',
        glow: 'rgba(217, 70, 239, 0.18)',
      }
    }

    // Priority 2: Study Guides
    if (type.includes('study-guide') || cat.includes('study-guide')) {
      return {
        accent: 'var(--chart-5)', // Deep space blue
        tint: 'rgba(59, 130, 246, 0.08)',
        tintStrong: 'rgba(59, 130, 246, 0.12)',
        glow: 'rgba(59, 130, 246, 0.18)',
      }
    }

    // Priority 3: Flashcards
    if (type.includes('flashcard') || cat.includes('flashcard')) {
      return {
        accent: 'var(--chart-2)', // Nebula purple
        tint: 'rgba(168, 85, 247, 0.08)',
        tintStrong: 'rgba(168, 85, 247, 0.12)',
        glow: 'rgba(168, 85, 247, 0.18)',
      }
    }

    // Default: Branded Cyan
    return {
      accent: 'var(--chart-1)', // Electric cyan
      tint: 'rgba(0, 229, 255, 0.08)',
      tintStrong: 'rgba(0, 229, 255, 0.12)',
      glow: 'rgba(0, 229, 255, 0.18)',
    }
  }

  // Fetch public marketplace tools
  const fetchMarketplaceTools = async () => {
    if (!session?.access_token) return
    
    try {
      let url = `${API_BASE}/api/marketplace/tools/public?limit=100`
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`
      }
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm)}`
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        setTools(data.data || [])
        lastFetchRef.current = Date.now()
      }
    } catch (err) {
      console.error('Failed to fetch marketplace tools:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Filter tools by search term
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = tools.filter(
        tool =>
          tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tool.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredTools(filtered)
    } else {
      setFilteredTools(tools)
    }
  }, [searchTerm, tools])

  // Initial fetch
  useEffect(() => {
    setIsLoading(true)
    fetchMarketplaceTools()
  }, [session?.access_token, selectedCategory])

  // Live updates via SSE stream
  useEffect(() => {
    if (!session?.access_token) return

    const streamUrl = `${API_BASE}/api/marketplace/tools/stream`
    const source = new EventSource(streamUrl)
    eventSourceRef.current = source

    source.addEventListener('connected', () => {
      setIsLiveConnected(true)
    })

    source.addEventListener('marketplace-updated', () => {
      setIsRefreshing(true)
      fetchMarketplaceTools()
    })

    source.onerror = () => {
      setIsLiveConnected(false)
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [session?.access_token, selectedCategory, searchTerm])

  // Fork/save tool to collection
  const handleSaveTool = async (tool) => {
    if (!session?.access_token) return

    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: tool.title,
          description: tool.description,
          tool_type: tool.tool_type,
          category: tool.category,
          tags: tool.tags || [],
          generated_tool: tool.generated_tool,
          latest_prompt: tool.latest_prompt,
          forked_from_tool_id: tool.id,
          visibility: 'private',
        }),
      })

      if (res.ok) {
        alert(`✅ Forked "${tool.title}" into your history!`)
        return
      }

      let payload = null
      try {
        payload = await res.json()
      } catch {
        payload = null
      }

      if (res.status === 409) {
        alert(`ℹ️ ${payload?.error || 'This tool is already in your saved collection.'}`)
        return
      }

      if (res.status === 403) {
        alert(`ℹ️ ${payload?.error || 'You cannot fork this tool.'}`)
        return
      } else {
        alert(`❌ ${payload?.error || 'Something went wrong. Please try again.'}`)
      }
    } catch (err) {
      console.error('Failed to save tool:', err)
      alert('❌ Something went wrong. Please try again.')
    }
  }

  // Vote on a marketplace tool
  const handleVoteTool = async (tool, voteValue) => {
    if (!session?.access_token || votingToolId === tool.id) return

    if (tool.owner_user_id && session?.user?.id && tool.owner_user_id === session.user.id) {
      alert('You cannot vote on your own tool.')
      return
    }

    setVotingToolId(tool.id)

    // Optimistic update for snappy vote reactions.
    const previousTools = tools
    setTools(prevTools => prevTools.map(item => {
      if (item.id !== tool.id) return item

      const currentMyVote = Number(item.my_vote || 0)
      const nextMyVote = voteValue
      const upvoteDelta = (nextMyVote === 1 ? 1 : 0) - (currentMyVote === 1 ? 1 : 0)
      const downvoteDelta = (nextMyVote === -1 ? 1 : 0) - (currentMyVote === -1 ? 1 : 0)

      return {
        ...item,
        my_vote: nextMyVote,
        upvote_count: Math.max(0, Number(item.upvote_count || 0) + upvoteDelta),
        downvote_count: Math.max(0, Number(item.downvote_count || 0) + downvoteDelta),
        vote_score: Number(item.vote_score || 0) + (nextMyVote - currentMyVote),
      }
    }))

    try {
      const res = await fetch(`${API_BASE}/api/marketplace/tools/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          tool_id: tool.id,
          vote_value: voteValue,
        }),
      })

      if (res.ok) {
        const payload = await res.json()
        const serverVote = payload?.data

        if (serverVote) {
          setTools(prevTools => prevTools.map(item => (
            item.id === tool.id
              ? {
                  ...item,
                  my_vote: Number(serverVote.my_vote || 0),
                  upvote_count: Number(serverVote.upvote_count || 0),
                  downvote_count: Number(serverVote.downvote_count || 0),
                  vote_score: Number(serverVote.vote_score || 0),
                }
              : item
          )))
        }
      } else {
        setTools(previousTools)
        alert(`❌ Something went wrong. Please try again.`)
      }
    } catch (err) {
      console.error('Failed to vote on tool:', err)
      setTools(previousTools)
      alert('❌ Something went wrong. Please try again.')
    } finally {
      setVotingToolId(null)
    }
  }

  // Manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await fetchMarketplaceTools()
  }

  const getToolPreviewImage = (tool) => {
    const generated = tool?.generated_tool
    if (!generated || typeof generated !== 'object') return ''

    const data = generated?.data || {}
    return (
      String(data.localImageUrl || '').trim() ||
      String(data.imageDataUrl || '').trim() ||
      String(data.imageUrl || '').trim() ||
      String(generated.previewImageUrl || '').trim()
    )
  }

  const getToolPreviewText = (tool) => {
    const generated = tool?.generated_tool
    const items = Array.isArray(generated?.data?.items) ? generated.data.items : []
    if (!items.length) return 'Preview not available for this tool yet.'

    const firstItem = items[0] || {}
    return String(
      firstItem.front ||
      firstItem.question ||
      firstItem.title ||
      firstItem.content ||
      firstItem.answer ||
      ''
    ).trim() || 'Preview not available for this tool yet.'
  }

  const getToolPreviewFrameHtml = (tool) => {
    const generated = tool?.generated_tool
    if (!generated || typeof generated !== 'object') return ''
    if (String(generated.render || '').toLowerCase() !== 'iframe') return ''
    return String(generated?.app?.html || '').trim()
  }

  const closeToolModal = () => setSelectedTool(null)

  const markPreviewImageBroken = (url) => {
    const normalized = String(url || '').trim()
    if (!normalized) return
    setBrokenPreviewImages(prev => {
      if (prev.has(normalized)) return prev
      const next = new Set(prev)
      next.add(normalized)
      return next
    })
  }

  const renderMarketplaceSkeleton = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.5rem'
      }}
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`marketplace-skeleton-${index}`}
          style={{
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            background: 'color-mix(in srgb, var(--background) 82%, var(--muted) 18%)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <Skeleton rounded="0.6rem" style={{ minHeight: '168px', width: '100%' }} />
          <div className="flex items-center justify-between gap-3">
            <Skeleton rounded="999px" style={{ height: '1.3rem', width: '5.8rem' }} />
            <Skeleton rounded="999px" style={{ height: '1.3rem', width: '4.6rem' }} />
          </div>
          <Skeleton style={{ height: '0.9rem', width: '78%' }} />
          <Skeleton style={{ height: '0.75rem', width: '92%' }} />
          <div className="flex gap-2 mt-1">
            <Skeleton rounded="0.45rem" style={{ height: '2rem', width: '100%' }} />
            <Skeleton rounded="0.45rem" style={{ height: '2rem', width: '100%' }} />
          </div>
        </div>
      ))}
    </div>
  )

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeToolModal()
      }
    }

    if (selectedTool) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      setTimeout(() => modalShellRef.current?.focus(), 0)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [selectedTool])

  return (
    <main className="main-content min-h-screen relative bg-[#121214] text-[#f0f0ee] p-4 sm:p-8 font-sans">
      <DotGrid />
      <div className="max-w-6xl mx-auto relative z-10 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center gap-4 flex-wrap pb-4 border-b border-[#2e2e33]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#f0f0ee] flex items-center gap-2.5">
              <Gift size={26} className="text-[#f0f0ee]" />
              Marketplace
            </h1>
            <p className="text-xs text-[#a1a1a6] mt-1">
              Discover and save study tools, diagrams, and flashcards generated by the community
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="btn-secondary flex items-center gap-2 text-xs font-medium"
          >
            <RotateCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1a6] pointer-events-none" />
            <input
              type="text"
              placeholder="Search tools by title, topic, or concept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-standard w-full pl-10 text-xs"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={isActive}
                  aria-label={`Filter by ${cat.label}`}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#f0f0ee] text-[#121214] shadow-sm'
                      : 'bg-[#18181b] border border-[#2e2e33] text-[#a1a1a6] hover:text-[#f0f0ee] hover:border-[#404047]'
                  }`}
                >
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tools Grid */}
        {isLoading ? (
          renderMarketplaceSkeleton()
        ) : filteredTools.length === 0 ? (
          <div className="card-standard text-center py-16 space-y-2">
            <Gift size={36} className="text-[#a1a1a6] mx-auto opacity-40" />
            <p className="text-xs text-[#a1a1a6]">
              {searchTerm ? 'No tools found matching your search.' : 'No tools in marketplace yet. Be the first to share!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTools.map(tool => (
              (() => {
                const resolvedPreviewImage = getToolPreviewImage(tool);
                const previewImage = resolvedPreviewImage && !brokenPreviewImages.has(resolvedPreviewImage)
                  ? resolvedPreviewImage
                  : '';
                const previewFrameHtml = getToolPreviewFrameHtml(tool);
                const previewText = getToolPreviewText(tool);
                const hasMeaningfulPreviewText = previewText && previewText !== 'Preview not available for this tool yet.';
                const showPreviewPanel = Boolean(previewImage || previewFrameHtml || hasMeaningfulPreviewText);
                const previewHeight = 150;
                const iframeScale = 0.65;

                return (
                  <div
                    key={tool.id}
                    className="card-standard p-4 flex flex-col justify-between cursor-pointer transition-all hover:border-[#f0f0ee]/40 group"
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${tool.title}`}
                    onClick={() => setSelectedTool(tool)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedTool(tool);
                      }
                    }}
                  >
                    <div className="space-y-3">
                      {/* Tool visual preview */}
                      {showPreviewPanel && (
                        <div className="relative rounded-[8px] border border-[#2e2e33] bg-[#131519] overflow-hidden min-h-[140px] flex items-stretch">
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt={`${tool.title} preview`}
                              loading="lazy"
                              onError={() => markPreviewImageBroken(previewImage)}
                              className="w-full h-[140px] object-contain block"
                            />
                          ) : previewFrameHtml ? (
                            <div className="w-full h-[140px] overflow-hidden bg-white">
                              <iframe
                                title={`${tool.title} preview`}
                                srcDoc={previewFrameHtml}
                                sandbox="allow-scripts"
                                style={{
                                  width: `${100 / iframeScale}%`,
                                  height: `${previewHeight / iframeScale}px`,
                                  border: 'none',
                                  pointerEvents: 'none',
                                  transform: `scale(${iframeScale})`,
                                  transformOrigin: 'top left',
                                  background: '#fff'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="p-3 w-full flex flex-col justify-between">
                              <span className="badge-standard self-start text-xs">
                                Preview
                              </span>
                              <p className="text-xs text-[#a1a1aa] line-clamp-3 mt-2 leading-relaxed">
                                {previewText}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tool Badge */}
                      <div className="flex gap-2 items-center justify-between">
                        <span className="badge-standard text-xs">
                          {tool.tool_type}
                        </span>
                        {tool.forked_from_tool_id && (
                          <span className="text-xs text-[#a1a1aa]">
                            🔗 Forked
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="font-semibold text-sm text-[#f0f0ee] group-hover:text-white line-clamp-1">
                          {tool.title}
                        </h3>
                        {tool.description && (
                          <p className="text-xs text-[#a1a1aa] mt-1 line-clamp-2 leading-relaxed">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Votes & Footer */}
                    <div className="pt-3 mt-3 border-t border-[#2e2e33] flex items-center justify-between text-xs text-[#a1a1aa]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVoteTool(tool, 1);
                          }}
                          aria-label={`Upvote ${tool.title}`}
                          disabled={votingToolId === tool.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] border text-xs font-mono transition-all ${
                            tool.my_vote === 1
                              ? 'bg-[#f0f0ee] text-[#121214] border-[#f0f0ee]'
                              : 'border-[#2e2e33] hover:border-[#404047] text-[#a1a1aa]'
                          }`}
                        >
                          <ThumbsUp size={12} />
                          {tool.upvote_count || 0}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVoteTool(tool, -1);
                          }}
                          aria-label={`Downvote ${tool.title}`}
                          disabled={votingToolId === tool.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] border text-xs font-mono transition-all ${
                            tool.my_vote === -1
                              ? 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/40'
                              : 'border-[#2e2e33] hover:border-[#404047] text-[#a1a1aa]'
                          }`}
                        >
                          <ThumbsDown size={12} />
                          {tool.downvote_count || 0}
                        </button>
                      </div>

                      <span className="text-xs font-mono text-[#d4d4d8]">
                        Score {tool.vote_score ?? 0}
                      </span>
                    </div>
                  </div>
                );
              })()
            ))}
          </div>
        )}
      </div>

      {/* Tool Details Modal */}
      {selectedTool && (
        <div
          onClick={closeToolModal}
          className="fixed inset-0 z-50 bg-[#121214]/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="marketplace-tool-modal-title"
            className="card-standard max-w-3xl w-full max-h-[85vh] overflow-hidden p-0 flex flex-col shadow-2xl"
            tabIndex={-1}
            ref={modalShellRef}
          >
            <div className="flex items-start justify-between p-5 border-b border-[#2e2e33] bg-[#18181b]">
              <div>
                <h2 id="marketplace-tool-modal-title" className="text-base font-semibold text-[#f0f0ee]">{selectedTool.title}</h2>
                <p className="text-xs text-[#a1a1a6] mt-0.5">
                  {selectedTool.category || 'General'} • {selectedTool.tool_type}
                </p>
              </div>
              <button
                onClick={closeToolModal}
                aria-label="Close tool details"
                className="btn-ghost p-1"
              >
                <X className="w-4 h-4 text-[#a1a1a6]" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div className="rounded-[10px] border border-[#2e2e33] bg-[#131519] overflow-hidden min-h-[220px]">
                  {getToolPreviewImage(selectedTool) ? (
                    <img
                      src={getToolPreviewImage(selectedTool)}
                      alt={`${selectedTool.title} preview`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="w-full h-[240px] object-contain"
                    />
                  ) : getToolPreviewFrameHtml(selectedTool) ? (
                    <iframe
                      title={`${selectedTool.title} preview`}
                      srcDoc={getToolPreviewFrameHtml(selectedTool)}
                      sandbox="allow-scripts"
                      className="w-full h-[240px] border-none bg-white"
                    />
                  ) : (
                    <div className="p-4 min-h-[240px] flex items-center">
                      <p className="text-xs text-[#a1a1a6] leading-relaxed">
                        {getToolPreviewText(selectedTool)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-[10px] bg-[#131519] border border-[#2e2e33]">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1a6] mb-1.5">
                      Description
                    </h4>
                    <p className="text-xs text-[#f0f0ee] leading-relaxed">
                      {selectedTool.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Upvotes', selectedTool.upvote_count || 0],
                      ['Downvotes', selectedTool.downvote_count || 0],
                      ['Score', selectedTool.vote_score ?? 0],
                      ['Forks', selectedTool.fork_count || 0],
                    ].map(([label, value]) => (
                      <div key={label} className="p-3 rounded-[10px] bg-[#131519] border border-[#2e2e33]">
                        <div className="text-xs uppercase font-medium text-[#a1a1aa]">{label}</div>
                        <div className="mt-1 font-mono font-semibold text-sm text-[#f0f0ee]">{value}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSaveTool(selectedTool)}
                    className="btn-primary w-full py-2.5 text-xs font-medium"
                  >
                    🔀 Fork to My Studio &amp; History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Marketplace;
