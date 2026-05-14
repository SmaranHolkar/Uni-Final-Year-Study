import { useState, useEffect, useRef } from 'react'
import { Zap, RotateCcw, Search, BookOpen, Gift, TrendingUp, Code2, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useAuth } from '../AuthContext'
import '../App.css'
import { Reveal, DotGrid } from '../components/Reveal.jsx'

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
  const eventSourceRef = useRef(null)
  const lastFetchRef = useRef(null)

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

    const streamUrl = `${API_BASE}/api/marketplace/tools/stream?token=${encodeURIComponent(session.access_token)}`
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

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeToolModal()
      }
    }

    if (selectedTool) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [selectedTool])

  return (
    <main className="sidebar-page-shell" style={{
      minHeight: '100vh',
      background: 'var(--background)',
      color: 'var(--foreground)',
      padding: '2rem 1rem',
      position: 'relative'
    }}>
      <DotGrid />
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <Gift size={32} style={{ color: 'var(--primary)' }} />
              Marketplace
            </h1>
            <p style={{
              margin: '0.5rem 0 0 0',
              color: 'var(--muted-foreground)',
              fontSize: '0.95rem'
            }}>
              Discover and save learning tools shared by the community
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              background: isRefreshing ? 'var(--muted)' : 'var(--card)',
              color: 'var(--foreground)',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s',
              opacity: isRefreshing ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isRefreshing) {
                e.target.style.borderColor = 'var(--primary)'
                e.target.style.transform = 'scale(1.02)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.transform = 'scale(1)'
            }}
          >
            <RotateCcw size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* Search Box */}
          <div style={{
            gridColumn: '1 / -1',
            position: 'relative'
          }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted-foreground)',
              pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder="Search tools by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Category Filter */}
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            {categories.map(cat => {
              const Icon = cat.icon
              const isActive = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                    background: isActive ? 'var(--primary)' : 'var(--card)',
                    color: isActive ? '#ffffff' : 'var(--foreground)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.borderColor = 'var(--primary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.borderColor = 'var(--border)'
                    }
                  }}
                >
                  <Icon size={16} />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Live Update Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          borderRadius: '0.375rem',
          background: 'var(--muted)',
          fontSize: '0.8rem',
          color: 'var(--muted-foreground)',
          marginBottom: '1.5rem'
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isRefreshing ? 'var(--primary)' : (isLiveConnected ? 'var(--success)' : 'var(--muted-foreground)'),
            animation: isRefreshing ? 'pulse 1.5s infinite' : 'pulse 3s infinite'
          }} />
          {isRefreshing
            ? 'Updating marketplace...'
            : (isLiveConnected ? 'Live updates connected' : 'Live updates reconnecting...')}
        </div>

        {/* Tools Grid */}
        {isLoading ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--muted-foreground)'
          }}>
            <div style={{
              display: 'inline-flex',
              justifyContent: 'center',
              gap: '0.4rem',
              marginBottom: '1rem'
            }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    animation: `pulse 1.5s infinite`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            <p>Loading marketplace...</p>
          </div>
        ) : filteredTools.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--muted-foreground)'
          }}>
            <Gift size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
            <p style={{ margin: 0 }}>
              {searchTerm ? 'No tools found matching your search.' : 'No tools in marketplace yet. Be the first to share!'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}>
            {filteredTools.map(tool => (
              (() => {
                const theme = getToolTheme(tool)
                const previewImage = getToolPreviewImage(tool)
                const previewFrameHtml = getToolPreviewFrameHtml(tool)
                const previewText = getToolPreviewText(tool)
                const previewHeight = 168
                const iframeScale = 0.68

                return (
              <div
                key={tool.id}
                className="marketplace-tool-card"
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  background: `color-mix(in srgb, var(--background) 80%, ${theme.tintStrong})`,
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  position: 'relative',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: `0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 ${theme.glow}`
                }}
                onClick={() => setSelectedTool(tool)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.accent
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px ${theme.glow}, inset 0 1px 0 ${theme.glow}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = `0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 ${theme.glow}`
                }}
              >
                {/* Tool visual preview */}
                <div style={{
                  position: 'relative',
                  borderRadius: '0.6rem',
                  border: `1px solid ${theme.glow}`,
                  overflow: 'hidden',
                  minHeight: `${previewHeight}px`,
                  background: `color-mix(in srgb, var(--background) 78%, ${theme.tint})`,
                  display: 'flex',
                  alignItems: 'stretch'
                }}>
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={`${tool.title} preview`}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: `${previewHeight}px`,
                        objectFit: 'contain',
                        background: 'rgba(15, 23, 42, 0.28)',
                        display: 'block'
                      }}
                    />
                  ) : previewFrameHtml ? (
                    <div style={{
                      width: '100%',
                      height: `${previewHeight}px`,
                      overflow: 'hidden',
                      background: '#ffffff'
                    }}>
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
                    <div style={{
                      width: '100%',
                      minHeight: `${previewHeight}px`,
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        alignSelf: 'flex-start',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: 'var(--muted-foreground)',
                        background: 'color-mix(in srgb, var(--background) 72%, transparent)',
                        border: '1px solid var(--border)',
                        borderRadius: '999px',
                        padding: '0.25rem 0.55rem'
                      }}>
                        Live Preview
                      </span>
                      <p style={{
                        margin: '0.75rem 0 0 0',
                        fontSize: '0.82rem',
                        lineHeight: 1.4,
                        color: 'var(--foreground)',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 5,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {previewText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tool Badge */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{
                    display: 'inline-block',
                    background: theme.accent,
                    color: '#ffffff',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    {tool.tool_type}
                  </span>
                  {tool.forked_from_tool_id && (
                    <span style={{
                      display: 'inline-block',
                      background: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.7rem',
                      fontWeight: 500
                    }}>
                      🔗 Forked
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div style={{ position: 'relative' }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--foreground)',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {tool.title}
                  </h3>
                  {tool.description && (
                    <p style={{
                      margin: '0.4rem 0 0 0',
                      fontSize: '0.8rem',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {tool.description.length > 92
                        ? `${tool.description.slice(0, 92)}...`
                        : tool.description}
                    </p>
                  )}
                </div>

                {/* Tags & Metadata */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  gap: '0.4rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  fontSize: '0.72rem',
                  color: 'var(--muted-foreground)'
                }}>
                  {tool.tags && tool.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {tool.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: theme.tint,
                            border: `1px solid ${theme.glow}`,
                            padding: '0.2rem 0.45rem',
                            borderRadius: '0.25rem'
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                      {tool.tags.length > 2 && (
                        <span style={{ color: 'var(--muted-foreground)' }}>
                          +{tool.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Votes */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  paddingTop: '0.15rem'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVoteTool(tool, 1)
                    }}
                    disabled={votingToolId === tool.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      borderRadius: '999px',
                      border: `1px solid ${tool.my_vote === 1 ? 'var(--primary)' : 'var(--border)'}`,
                      background: tool.my_vote === 1 ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                      color: 'var(--foreground)',
                      padding: '0.32rem 0.6rem',
                      cursor: votingToolId === tool.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    <ThumbsUp size={14} />
                    {tool.upvote_count || 0}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVoteTool(tool, -1)
                    }}
                    disabled={votingToolId === tool.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      borderRadius: '999px',
                      border: `1px solid ${tool.my_vote === -1 ? 'var(--destructive)' : 'var(--border)'}`,
                      background: tool.my_vote === -1 ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                      color: 'var(--foreground)',
                      padding: '0.32rem 0.6rem',
                      cursor: votingToolId === tool.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    <ThumbsDown size={14} />
                    {tool.downvote_count || 0}
                  </button>
                  <span style={{
                    fontSize: '0.74rem',
                    color: 'var(--muted-foreground)'
                  }}>
                    Score {(tool.vote_score ?? 0)}
                  </span>
                  {tool.fork_count > 0 && (
                    <span style={{
                      fontSize: '0.74rem',
                      color: 'var(--muted-foreground)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      <TrendingUp size={12} />
                      {tool.fork_count} forks
                    </span>
                  )}
                </div>

                <div style={{
                  position: 'relative',
                  marginTop: 'auto',
                  fontSize: '0.78rem',
                  color: 'var(--muted-foreground)',
                  paddingTop: '0.45rem',
                  borderTop: `1px solid ${theme.glow}`
                }}>
                  Click to view details and fork
                </div>
              </div>
                )
              })()
            ))}
          </div>
        )}
      </div>

      {/* Tool Details Modal */}
      {selectedTool && (
        <div
          onClick={closeToolModal}
          className="marketplace-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 8, 20, 0.62)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="marketplace-modal-shell"
            style={{
              width: 'min(980px, 100%)',
              maxHeight: '88vh',
              overflow: 'hidden',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              background: 'color-mix(in srgb, var(--background) 82%, rgba(255,255,255,0.05))',
              color: 'var(--foreground)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(22px)',
              WebkitBackdropFilter: 'blur(22px)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '0.75rem',
              marginBottom: 0,
              padding: '1.1rem 1.1rem 0.95rem 1.1rem',
              borderBottom: '1px solid var(--border)',
              background: 'color-mix(in srgb, var(--background) 70%, transparent)'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.2 }}>{selectedTool.title}</h2>
                <p style={{ margin: '0.35rem 0 0 0', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>
                  {selectedTool.category || 'General'} • {selectedTool.tool_type}
                </p>
              </div>
              <button
                onClick={closeToolModal}
                style={{
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  borderRadius: '0.45rem',
                  padding: '0.35rem 0.55rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Close
              </button>
            </div>

            <div style={{ maxHeight: 'calc(88vh - 88px)', overflowY: 'auto', padding: '1.1rem' }}>
              <div className="marketplace-modal-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: '1rem', alignItems: 'start' }}>
              <div style={{
                borderRadius: '0.6rem',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                minHeight: '260px',
                background: 'color-mix(in srgb, var(--background) 85%, var(--primary))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
              }}>
                {getToolPreviewImage(selectedTool) ? (
                  <img
                    src={getToolPreviewImage(selectedTool)}
                    alt={`${selectedTool.title} preview`}
                    style={{ width: '100%', height: '320px', objectFit: 'contain', background: 'rgba(15, 23, 42, 0.28)' }}
                  />
                ) : getToolPreviewFrameHtml(selectedTool) ? (
                  <iframe
                    title={`${selectedTool.title} preview`}
                    srcDoc={getToolPreviewFrameHtml(selectedTool)}
                    sandbox="allow-scripts"
                    style={{ width: '100%', height: '320px', border: 'none', background: '#fff' }}
                  />
                ) : (
                  <div style={{ padding: '1rem', minHeight: '320px', display: 'flex', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.55, maxWidth: '56ch' }}>
                      {getToolPreviewText(selectedTool)}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  background: 'color-mix(in srgb, var(--background) 62%, transparent)',
                  padding: '0.9rem',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)'
                }}>
                  <h4 style={{ margin: 0, fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-foreground)' }}>
                    Description
                  </h4>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', lineHeight: 1.45 }}>
                    {selectedTool.description || 'No description provided.'}
                  </p>
                </div>

                {selectedTool.tags?.length > 0 && (
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    background: 'color-mix(in srgb, var(--background) 62%, transparent)',
                    padding: '0.9rem',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-foreground)' }}>
                      Tags
                    </h4>
                    <div style={{ marginTop: '0.45rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {selectedTool.tags.map((tag, idx) => (
                        <span key={idx} style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', borderRadius: '999px', padding: '0.22rem 0.55rem', fontSize: '0.76rem' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '0.6rem'
                }}>
                  {[
                    ['Upvotes', selectedTool.upvote_count || 0],
                    ['Downvotes', selectedTool.downvote_count || 0],
                    ['Score', selectedTool.vote_score ?? 0],
                    ['Forks', selectedTool.fork_count || 0],
                  ].map(([label, value]) => (
                    <div key={label} style={{
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      background: 'color-mix(in srgb, var(--background) 62%, transparent)',
                      padding: '0.8rem 0.9rem'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                      <div style={{ marginTop: '0.2rem', fontSize: '1rem', fontWeight: 700 }}>{value}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSaveTool(selectedTool)}
                  style={{
                    marginTop: 'auto',
                    padding: '0.78rem 1rem',
                    borderRadius: '0.7rem',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  🔀 Fork to My History
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .marketplace-modal-grid {
            grid-template-columns: 1fr;
          }

          .marketplace-modal-shell {
            max-height: 92vh !important;
          }
        }
      `}</style>
    </main>
  )
}

export default Marketplace
