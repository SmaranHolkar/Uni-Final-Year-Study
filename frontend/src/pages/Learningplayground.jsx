import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Lightbulb, TrendingUp, AlertCircle } from 'lucide-react'
import { useAuth } from '../AuthContext'
import '../App.css'

const defaultSuggestions = [
  {
    id: 1,
    icon: Lightbulb,
    title: 'Create a study plan',
    prompt: 'Help me create a study plan for my upcoming exams.',
    color: 'hsl(142, 70%, 50%)',
  },
  {
    id: 2,
    icon: TrendingUp,
    title: 'Practice questions',
    prompt: 'Generate practice questions on topics I recently studied.',
    color: 'hsl(195, 85%, 55%)',
  },
  {
    id: 3,
    icon: AlertCircle,
    title: 'Explain a concept',
    prompt: 'Explain a complex concept in simple terms.',
    color: 'hsl(280, 70%, 60%)',
  },
]

// Handles Learningplayground logic.
function Learningplayground() {
  const { user, session } = useAuth()
  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState(defaultSuggestions)
  const [generatedTool, setGeneratedTool] = useState(null)
  const [generationStage, setGenerationStage] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Handles toText logic.
  const toText = (value) => {
    if (typeof value === 'string') return value.trim()
    if (value == null) return ''
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  // Handles normalizeToolPayload logic.
  const normalizeToolPayload = (tool) => {
    if (!tool || typeof tool !== 'object') return null

    const toolType = toText(tool.toolType).toLowerCase() || 'notes'
    const render = toText(tool.render).toLowerCase() || 'native'
    const rawItems = Array.isArray(tool?.data?.items) ? tool.data.items : []

    // If iframe mode, preserve the HTML app directly
    if (render === 'iframe' && tool?.app?.html) {
      return {
        toolType,
        title: toText(tool.title) || 'Generated Learning Tool',
        description: toText(tool.description) || 'Generated from your request',
        render: 'iframe',
        app: {
          html: String(tool.app.html),
        },
        data: { items: [] },
      }
    }

    // Otherwise, normalize items for native rendering
    const normalizedItems = rawItems.map((item, index) => {
      const title = toText(item?.title) || `Item ${index + 1}`
      const question = toText(item?.question)
      const answer = toText(item?.answer)
      const content = toText(item?.content)
      const front = toText(item?.front)
      const back = toText(item?.back)

      if (toolType === 'flashcards' || toolType === 'card-deck') {
        const resolvedFront = front || question || title || `Card ${index + 1}`
        const resolvedBack = back || answer || content || `Key idea: ${resolvedFront}`
        return { ...item, title: resolvedFront, front: resolvedFront, back: resolvedBack }
      }

      return {
        ...item,
        title,
        question: question || title,
        answer,
        content: content || answer || question || title,
      }
    })

    return {
      toolType,
      title: toText(tool.title) || 'Generated Learning Tool',
      description: toText(tool.description) || 'Generated from your request',
      render: render === 'iframe' ? 'iframe' : 'native',
      ui: toText(tool.ui) || 'cards',
      data: { items: normalizedItems },
    }
  }

  // Handles scrollToBottom logic.
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [inputValue])

  useEffect(() => {
    if (!user?.id || !session?.access_token) {
      setSuggestions(defaultSuggestions)
      return
    }

    // Handles fetchSuggestions logic.
    const fetchSuggestions = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
        const res = await fetch(
          `${API_BASE}/api/suggestions?token=${encodeURIComponent(session.access_token)}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            credentials: 'include',
          }
        )

        if (!res.ok) {
          setSuggestions([])
          return
        }

        const data = await res.json()
        const list = []

        const urgentAreas = data?.suggestions?.urgentAreas || data?.analysisData?.lowestScoringAreas || []
        const studyPlan = data?.suggestions?.studyPlan || []
        const encouragement = data?.suggestions?.encouragement

        // Create a suggestion card for EACH weak area the student has
        urgentAreas.forEach((area, idx) => {
          if (area && String(area).trim()) {
            list.push({
              id: idx + 1,
              icon: AlertCircle,
              title: `Study ${area}`,
              prompt: `Create a detailed study guide for ${area}. I need help with this topic.`,
              color: ['hsl(0, 70%, 60%)', 'hsl(280, 70%, 60%)', 'hsl(195, 85%, 55%)'][idx % 3],
            })
          }
        })

        // If no weak areas, still show the study plan tip
        if (list.length < 3 && (studyPlan[0] || encouragement)) {
          list.push({
            id: 3,
            icon: Lightbulb,
            title: 'AI Study Suggestion',
            prompt: studyPlan[0] || encouragement || 'Create a personalized study plan for me.',
            color: 'hsl(142, 70%, 50%)',
          })
        }

        if (list.length === 0) {
          setSuggestions(defaultSuggestions)
          return
        }

        setSuggestions(list.slice(0, 3))
      } catch (err) {
        console.error('Failed to fetch suggestions:', err)
        setSuggestions(defaultSuggestions)
      }
    }

    fetchSuggestions()
  }, [user?.id, session?.access_token])

  // Handles handleSuggestionClick logic.
  const handleSuggestionClick = (prompt) => {
    setInputValue(prompt)
    textareaRef.current?.focus()
  }

  // Handles renderGeneratedTool logic.
  const renderGeneratedTool = () => {
    if (!generatedTool && !generationStage) return null

    // Show generation progress while loading
    if (generationStage && !generatedTool) {
      return (
        <div
          style={{
            border: '2px solid var(--primary)',
            background: 'var(--card)',
            borderRadius: '1rem',
            padding: '2rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <Sparkles size={32} style={{ margin: '0 auto', color: 'var(--primary)' }} />
          </div>
          <h3 style={{ margin: '0.5rem 0', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
            {generationStage}
          </h3>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: '0.4rem', height: '0.4rem', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite' }} />
            <span style={{ display: 'inline-block', width: '0.4rem', height: '0.4rem', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite 0.3s' }} />
            <span style={{ display: 'inline-block', width: '0.4rem', height: '0.4rem', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite 0.6s' }} />
          </div>
        </div>
      )
    }

    if (!generatedTool) return null

    // ALL tools are iframes - render the interactive app
    if (generatedTool.app?.html) {
      return (
        <div
          style={{
            border: '2px solid var(--primary)',
            background: 'var(--card)',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
                {generatedTool.title}
              </h3>
              <p style={{ margin: '0.35rem 0 0 0', color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
                {generatedTool.description}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                {generatedTool.toolType}
              </p>
            </div>
            <button
              onClick={() => {
                setGeneratedTool(null)
                setGenerationStage(null)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted-foreground)',
                cursor: 'pointer',
                fontSize: '1.5rem',
                padding: 0,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <iframe
            sandbox="allow-scripts allow-same-origin"
            srcDoc={generatedTool.app.html}
            style={{
              width: '100%',
              minHeight: '500px',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              background: '#fff',
              display: 'block',
            }}
            title={generatedTool.title}
          />
        </div>
      )
    }

    // If HTML generation failed, show error
    return (
      <div
        style={{
          border: '2px solid #ff6b6b',
          background: 'var(--card)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#ff6b6b', fontWeight: 600, margin: 0 }}>
          Tool failed to generate.
        </p>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          The system couldn't generate an interactive app. Try refining your request.
        </p>
      </div>
    )
  }

  // Handles handleSubmit logic.
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setGenerationStage('Analyzing your learning patterns...')

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      
      setGenerationStage('Building study structure...')
      
      const response = await fetch(`${API_BASE}/api/chat-tools?token=${encodeURIComponent(session?.access_token || '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        credentials: 'include',
        body: JSON.stringify({ prompt: userMessage.content }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to generate tool')
      }

      const data = await response.json()

      if (data?.tool) {
        setGenerationStage('Finalizing your learning tool...')
        const normalizedTool = normalizeToolPayload(data.tool)
        
        // Debug: Log the AI tool output
        console.log('AI GENERATED TOOL:', {
          type: normalizedTool?.toolType,
          render: normalizedTool?.render,
          hasHTML: !!normalizedTool?.app?.html,
          title: normalizedTool?.title,
          itemCount: normalizedTool?.data?.items?.length || 0,
          fullTool: normalizedTool,
        })
        
        setGeneratedTool(normalizedTool)
      }

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data?.tool
          ? `Created ${data.tool.toolType} tool: ${data.tool.title}`
          : 'I generated a response, but no tool payload was returned.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
      setGenerationStage(null)
    } catch (error) {
      console.error('Error getting AI response:', error)
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setGenerationStage(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Handles handleKeyDown logic.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <main
      className="main-content min-h-screen"
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {renderGeneratedTool()}

        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '2rem',
              padding: '2rem',
              maxWidth: '900px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
              <Sparkles size={48} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: 'var(--foreground)',
                }}
              >
                Learning Playground
              </h2>
              <p style={{ fontSize: '0.95rem' }}>
                Build your own learning tools, explore ideas, or get help with any topic
              </p>
            </div>

            {suggestions.length > 0 && (
              <div style={{ width: '100%' }}>
                <h3
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--muted-foreground)',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Suggestions for you
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {suggestions.map((suggestion) => {
                    const Icon = suggestion.icon
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion.prompt)}
                        style={{
                          padding: '1.25rem',
                          borderRadius: '0.75rem',
                          border: '1px solid var(--border)',
                          background: 'var(--card)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = suggestion.color
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                          }}
                        >
                          <Icon
                            size={20}
                            style={{ color: suggestion.color, flexShrink: 0, marginTop: '2px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <h4
                              style={{
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                marginBottom: '0.25rem',
                                color: 'var(--foreground)',
                              }}
                            >
                              {suggestion.title}
                            </h4>
                            <p
                              style={{
                                fontSize: '0.85rem',
                                color: 'var(--muted-foreground)',
                                lineHeight: '1.4',
                              }}
                            >
                              {suggestion.prompt.length > 80
                                ? `${suggestion.prompt.substring(0, 80)}...`
                                : suggestion.prompt}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '1rem 1.25rem',
                  borderRadius: '1rem',
                  background: message.role === 'user' ? 'var(--primary)' : 'var(--card)',
                  border: message.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  color: message.role === 'user' ? '#ffffff' : 'var(--foreground)',
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.7 }}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                background: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={isLoading}
              rows={1}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.95rem',
                resize: 'none',
                maxHeight: '150px',
                overflowY: 'auto',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            style={{
              padding: '0.875rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: inputValue.trim() && !isLoading ? 'var(--primary)' : 'var(--muted)',
              color: '#ffffff',
              cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500',
              fontSize: '0.95rem',
              transition: 'all 0.2s',
              opacity: inputValue.trim() && !isLoading ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (inputValue.trim() && !isLoading) {
                e.target.style.transform = 'translateY(-1px)'
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = 'none'
            }}
          >
            <Send size={18} />
            Send
          </button>
        </form>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--muted-foreground)',
            marginTop: '0.75rem',
            textAlign: 'center',
          }}
        >
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>

      <style>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--muted-foreground);
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%,
          60%,
          100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-4px);
          }
        }
      `}</style>
    </main>
  )
}

export default Learningplayground
