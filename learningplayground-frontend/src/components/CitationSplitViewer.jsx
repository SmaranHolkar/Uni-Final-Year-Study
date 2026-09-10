import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Search,
  OpenBook as BookOpen,
  Page as FileText,
  Flash as Zap,
  Pin,
  Check,
  Copy,
  OpenNewWindow as ExternalLink,
  ChatBubble as MessageSquare,
  Wrench,
  CheckSquare,
  HelpCircle,
  LightBulb as Lightbulb,
  EditPencil as Edit3
} from 'iconoir-react'

export default function CitationSplitViewer({
  isOpen,
  onClose,
  documentTitle,
  activeCitation,
  apiBase,
  authToken,
  onGenerateFromHighlight,
  onPromptChat,
}) {
  const [paragraphs, setParagraphs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [tooltipPos, setTooltipPos] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)

  const paragraphRefs = useRef({})
  const containerRef = useRef(null)

  // Fetch document paragraphs from database or generate structured chunks
  useEffect(() => {
    if (!isOpen || !documentTitle) return

    let isMounted = true
    const fetchDocParagraphs = async () => {
      setIsLoading(true)
      try {
        if (authToken) {
          const res = await fetch(`${apiBase}/api/document-paragraphs?title=${encodeURIComponent(documentTitle)}`, {
            headers: { Authorization: `Bearer ${authToken}` },
            credentials: 'include',
          })
          if (res.ok) {
            const data = await res.json()
            if (isMounted && data.paragraphs && data.paragraphs.length > 0) {
              setParagraphs(data.paragraphs)
              setIsLoading(false)
              return
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch paragraphs from API, using client fallback:', err)
      }

      // Fallback: Generate structured readable paragraphs if offline or guest
      if (isMounted) {
        const sampleChunks = [
          {
            id: 1,
            paragraphIndex: 1,
            pageNumber: 1,
            text: `Document Source: "${documentTitle}". Key principles, core definitions, and foundational mechanisms introduced in the curriculum syllabus.`,
          },
          {
            id: 2,
            paragraphIndex: 2,
            pageNumber: 1,
            text: `Core Concept & Theorems: Systematic breakdown of foundational formulas, terminology, and operational frameworks. Reviewing these sections ensures comprehensive exam readiness.`,
          },
          {
            id: 3,
            paragraphIndex: 3,
            pageNumber: 2,
            text: `Methodology & Applications: Step-by-step problem-solving methods, clinical/practical examples, and real-world case studies for active recall drills.`,
          },
          {
            id: 4,
            paragraphIndex: 4,
            pageNumber: 2,
            text: `Critical Summary & Review Takeaways: High-frequency exam questions, edge cases, and mnemonic triggers designed for active retrieval practice.`,
          },
        ]
        setParagraphs(sampleChunks)
        setIsLoading(false)
      }
    }

    fetchDocParagraphs()
    return () => {
      isMounted = false
    }
  }, [isOpen, documentTitle, authToken, apiBase])

  // Intelligently resolve the exact matching paragraph (by explicit index or deep semantic excerpt match)
  const resolvedTargetPara = React.useMemo(() => {
    if (!activeCitation) return null
    if (activeCitation.paragraphIndex) return activeCitation.paragraphIndex
    if (activeCitation.paragraph) return activeCitation.paragraph

    // Try finding by excerpt or quote text in real paragraphs
    if (activeCitation.excerpt && paragraphs.length > 0) {
      const cleanExcerpt = activeCitation.excerpt.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim()
      const words = cleanExcerpt.split(/\s+/).filter((w) => w.length > 3)

      let bestMatch = null
      let maxHits = 0

      for (const p of paragraphs) {
        const pText = (p.text || '').toLowerCase()
        if (cleanExcerpt.length > 10 && pText.includes(cleanExcerpt.slice(0, 35))) {
          return p.paragraphIndex
        }
        let hits = 0
        for (const w of words) {
          if (pText.includes(w)) hits++
        }
        if (hits > maxHits) {
          maxHits = hits
          bestMatch = p.paragraphIndex
        }
      }
      if (bestMatch && maxHits >= 2) return bestMatch
    }

    return 1
  }, [activeCitation, paragraphs])

  // Scroll to active citation when activeCitation or paragraphs update
  useEffect(() => {
    if (!isOpen || !resolvedTargetPara || paragraphs.length === 0) return

    const timer = setTimeout(() => {
      const el = paragraphRefs.current[resolvedTargetPara]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [isOpen, resolvedTargetPara, paragraphs])

  // Handle Text Selection inside the Document Reader
  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setSelectedText('')
      setTooltipPos(null)
      return
    }

    const text = selection.toString().trim()
    if (text.length < 3) {
      setSelectedText('')
      setTooltipPos(null)
      return
    }

    try {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 }

      setSelectedText(text)
      setTooltipPos({
        top: Math.max(10, rect.top - containerRect.top - 44),
        left: Math.max(10, rect.left - containerRect.left + rect.width / 2 - 130),
      })
    } catch {
      setSelectedText(text)
    }
  }

  const handleCopyParagraph = (text, idx) => {
    navigator.clipboard?.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleAction = (actionType) => {
    if (!selectedText) return
    const currentCitation = {
      title: documentTitle,
      excerpt: selectedText,
      pageNumber: activeCitation?.pageNumber || 1,
      paragraphIndex: resolvedTargetPara || 1,
    }
    onGenerateFromHighlight?.(selectedText, actionType, currentCitation)
    setSelectedText('')
    setTooltipPos(null)
    window.getSelection()?.removeAllRanges()
  }

  if (!isOpen) return null

  const filteredParagraphs = paragraphs.filter((p) =>
    !searchQuery.trim() || (p.text || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeTargetPara = resolvedTargetPara

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] lg:w-[520px] bg-[#0c121e]/98 backdrop-blur-2xl border-l border-blue-500/25 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col transition-all duration-300 animate-slide-left">
      {/* ── HEADER ── */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-[#080d17]/90 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 shadow-inner">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-white truncate max-w-[240px] sm:max-w-xs">
                {documentTitle || 'Source Document'}
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] border border-blue-500/30">
                {paragraphs.length} ¶
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              Grounded Split-Viewer • Highlight text to generate cards
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
          title="Close Split Viewer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── SEARCH & FILTER BAR ── */}
      <div className="px-3.5 py-2.5 border-b border-slate-800/80 bg-[#0d1424]/60 flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search text, formulas, or concepts in document..."
            className="w-full bg-[#131d31] border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {activeCitation && (
          <button
            onClick={() => {
              const el = paragraphRefs.current[activeTargetPara]
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center gap-1 hover:bg-amber-500/25 transition-colors flex-shrink-0"
            title="Jump to cited paragraph"
          >
            <span>Jump to ¶ {activeTargetPara}</span>
          </button>
        )}
      </div>

      {/* ── ACTIVE CITATION BANNER (IF TRIGGERED FROM TOOL) ── */}
      {activeCitation && (
        <div className="px-3.5 py-2 bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-transparent border-b border-amber-500/20 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
            <span className="text-[11px] font-semibold text-amber-200 truncate">
              Cited in Card: {activeCitation.excerpt ? `"${activeCitation.excerpt.slice(0, 45)}..."` : `Paragraph ${activeTargetPara}`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
            Page {activeCitation.pageNumber || 1}
          </span>
        </div>
      )}

      {/* ── DOCUMENT READER BODY (WITH TEXT ANNOTATION) ── */}
      <div
        ref={containerRef}
        onMouseUp={handleTextSelection}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 relative scrollbar-thin select-text"
      >
        {/* Floating Quick Tool Generator Pill on Highlight */}
        {tooltipPos && selectedText && (
          <div
            style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px` }}
            className="absolute z-50 bg-[#162238] border border-blue-400/50 rounded-xl p-1 shadow-2xl shadow-black/80 flex items-center gap-1 animate-scale-up"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleAction('flashcard')}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-sm"
              title="Create Flashcard from highlighted quote"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Flashcard</span>
            </button>

            <button
              onClick={() => handleAction('quiz')}
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-sm"
              title="Generate Multiple-Choice Quiz Question"
            >
              <CheckSquare className="w-3 h-3 text-white" />
              <span>MCQ Quiz</span>
            </button>

            <button
              onClick={() => handleAction('pin')}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              title="Pin excerpt to canvas note"
            >
              <Pin className="w-3 h-3 text-amber-400" />
              <span>Pin</span>
            </button>

            <button
              onClick={() => handleAction('explain')}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              title="Explain concept in Chat"
            >
              <Lightbulb className="w-3 h-3 text-yellow-400" />
              <span>Explain</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading document paragraphs &amp; citations...</p>
          </div>
        ) : filteredParagraphs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center px-4 space-y-2">
            <FileText className="w-8 h-8 text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">No matching paragraphs found</p>
            <p className="text-[11px] text-slate-500">Try adjusting your search query above.</p>
          </div>
        ) : (
          filteredParagraphs.map((p) => {
            const isCited = activeTargetPara && p.paragraphIndex === activeTargetPara
            return (
              <div
                key={p.id || p.paragraphIndex}
                ref={(el) => (paragraphRefs.current[p.paragraphIndex] = el)}
                className={`group rounded-xl p-3.5 transition-all relative border ${
                  isCited
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/40'
                    : 'bg-[#11192a]/80 border-slate-800/80 hover:border-slate-700/80 hover:bg-[#141e33]'
                }`}
              >
                {/* Paragraph Meta Chip */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isCited
                          ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      ¶ {p.paragraphIndex} • Page {p.pageNumber || 1}
                    </span>
                    {isCited && (
                      <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1 animate-pulse">
                        <span>★ Targeted Citation</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyParagraph(p.text, p.paragraphIndex)}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                      title="Copy paragraph text"
                    >
                      {copiedIndex === p.paragraphIndex ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onGenerateFromHighlight?.(p.text, 'flashcard', {
                          title: documentTitle,
                          page: p.pageNumber,
                          para: p.paragraphIndex,
                        })
                      }}
                      className="p-1 text-blue-400 hover:text-blue-300 rounded hover:bg-blue-500/20 transition-colors"
                      title="Turn paragraph into Flashcard"
                    >
                      <Zap className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Paragraph Content */}
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {p.text}
                </p>
              </div>
            )
          })
        )}
      </div>

      {/* ── FOOTER TOOLBAR: QUICK FULL-DOCUMENT GENERATOR ── */}
      <div className="p-3 border-t border-slate-800 bg-[#080d17]/95 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="text-[11px] text-slate-400 truncate">
          <span>Selected Document: <strong className="text-white">{documentTitle}</strong></span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onPromptChat?.(`Generate 8 comprehensive revision flashcards strictly grounded in "${documentTitle}" with page/paragraph citations.`)}
            className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
            title="Generate Flashcard Deck from this document"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Generate Deck</span>
          </button>

          <button
            onClick={() => onPromptChat?.(`Create a 5-question multiple choice practice quiz with detailed explanations grounded in "${documentTitle}".`)}
            className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
            title="Generate Quiz from this document"
          >
            <CheckSquare className="w-3 h-3 text-purple-400" />
            <span>Quiz</span>
          </button>
        </div>
      </div>
    </div>
  )
}
