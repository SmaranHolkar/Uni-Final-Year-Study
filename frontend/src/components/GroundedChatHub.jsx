import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Sparkles, Send, Globe, Upload, Trash2, CheckSquare, Square, 
  ShieldCheck, Zap, Volume2, ArrowRight, ExternalLink, X, HelpCircle, 
  Check, FileText, ChevronRight, Layers, CornerDownRight, Copy, Share2
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import DeepResearchModal from './DeepResearchModal';
import '../App.css';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

export default function GroundedChatHub() {
  const { session } = useAuth();
  const navigate = useNavigate();

  // State
  const [documents, setDocuments] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [groundingMode, setGroundingMode] = useState('strict'); // 'strict' or 'enrich'
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [latestConfidence, setLatestConfidence] = useState(null);

  // Inspector Drawer state
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectedDocTitle, setInspectedDocTitle] = useState('');
  const [inspectedTargetPara, setInspectedTargetPara] = useState(null);
  const [inspectedParagraphs, setInspectedParagraphs] = useState([]);
  const [isLoadingParagraphs, setIsLoadingParagraphs] = useState(false);

  // Audio Speech state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Deep Research Modal state
  const [showResearchModal, setShowResearchModal] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const paragraphRefs = useRef({});

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingChat]);

  // Fetch User Documents on Mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDocuments(data.documents || []);
        // Select all by default if none selected yet
        if (selectedTitles.length === 0) {
          setSelectedTitles((data.documents || []).map(d => d.title));
        }
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // Handle Quick Document Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const res = await fetch(`${API_BASE}/api/upload-document`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchDocuments();
        setSelectedTitles(prev => [...prev, data.document.title]);
      } else {
        alert(data.message || data.error || 'Upload failed');
      }
    } catch (err) {
      alert('File upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle Document Selection
  const toggleDocSelection = (title) => {
    setSelectedTitles(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTitles.length === documents.length) {
      setSelectedTitles([]);
    } else {
      setSelectedTitles(documents.map(d => d.title));
    }
  };

  // Delete Document
  const handleDeleteDoc = async (title, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete document "${title}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/document/${encodeURIComponent(title)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` }
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.title !== title));
        setSelectedTitles(prev => prev.filter(t => t !== title));
      }
    } catch (err) {
      console.error('Failed to delete doc:', err);
    }
  };

  const [activeSessionId, setActiveSessionId] = useState(null);

  const saveGroundedSession = async (nextMessages) => {
    if (!session?.access_token || nextMessages.length === 0) return;
    try {
      const firstUserMsg = nextMessages.find(m => m.role === 'user')?.text || 'Grounded Chat Session';
      const safeTitle = `[Grounded Studio] ${firstUserMsg.slice(0, 45)}`;

      const formattedMessages = nextMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.text || m.content || '',
        citations: m.citations || [],
        confidence: m.confidence || null,
        timestamp: new Date()
      }));

      const res = await fetch(`${API_BASE}/api/learning-playground/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          title: safeTitle,
          latestPrompt: firstUserMsg,
          messages: formattedMessages,
          context: { selectedDocumentTitles: selectedTitles, groundingMode }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data?.id && !activeSessionId) {
          setActiveSessionId(data.data.id);
        }
      }
    } catch (err) {
      console.warn('Failed to save grounded chat session:', err);
    }
  };

  // Send Grounded Chat Query
  const handleSendMessage = async (customPrompt = null) => {
    const textPrompt = (customPrompt || inputValue).trim();
    if (!textPrompt || isLoadingChat) return;

    const userMsg = { id: Date.now(), role: 'user', text: textPrompt };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoadingChat(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/grounded-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          prompt: textPrompt,
          selectedDocumentTitles: selectedTitles,
          groundingMode,
          chatHistory: messages
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate answer');
      }

      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        text: data.answer,
        citations: data.citations || [],
        confidence: data.groundingConfidence || 85,
        retrievedChunks: data.retrievedChunks || []
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      setLatestConfidence(data.groundingConfidence || 85);
      saveGroundedSession(finalMessages);

    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: `⚠️ Error: ${err.message}`, isError: true }
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };


  // Open Paragraph Inspector Drawer
  const openParagraphInspector = async (title, paraIndex) => {
    setInspectedDocTitle(title);
    setInspectedTargetPara(paraIndex);
    setInspectorOpen(true);
    setIsLoadingParagraphs(true);

    try {
      const res = await fetch(`${API_BASE}/api/document-paragraphs?title=${encodeURIComponent(title)}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInspectedParagraphs(data.paragraphs || []);
        // Scroll to paragraph after DOM update
        setTimeout(() => {
          const el = paragraphRefs.current[paraIndex];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      }
    } catch (err) {
      console.error('Failed to load paragraphs:', err);
    } finally {
      setIsLoadingParagraphs(false);
    }
  };

  // Audio Speech Briefing Synthesis
  const handlePlayAudioBriefing = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in your browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant' && !m.isError);
    const textToSpeak = lastAiMsg 
      ? lastAiMsg.text.replace(/\[Cite:[^\]]+\]/g, '')
      : `Audio summary of selected study sources. You have ${selectedTitles.length} active source documents selected.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  // Export Grounded Answer to Learning Playground
  const handleExportToPlayground = (msgText) => {
    const cleanText = msgText.replace(/\[Cite:[^\]]+\]/g, '');
    navigate('/Learningplayground', {
      state: {
        initialPrompt: `Generate an interactive study mindmap and revision tool based on this grounded research summary:\n\n${cleanText.slice(0, 800)}`
      }
    });
  };

  // Parse Text and Render Citation Badges
  const renderMessageContent = (text, citations = []) => {
    const citationRegex = /\[Cite:\s*id="([^"]+)",\s*title="([^"]+)",\s*para=(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      // Text before citation
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const docTitle = match[2];
      const paraIndex = parseInt(match[3], 10);
      const matchedCite = citations.find(c => c.title === docTitle && c.paragraphIndex === paraIndex);

      parts.push(
        <button
          key={match.index}
          style={styles.citationChip}
          onClick={() => openParagraphInspector(docTitle, paraIndex)}
          title={matchedCite?.snippet || `View paragraph #${paraIndex} in "${docTitle}"`}
        >
          <FileText size={12} color="hsl(195, 90%, 60%)" />
          <span>{docTitle} #Para {paraIndex}</span>
        </button>
      );

      lastIndex = citationRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  return (
    <div style={styles.container}>
      {/* HEADER CONTROL BAR */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.logoBadge}>
            <BookOpen size={22} color="hsl(195, 90%, 60%)" />
          </div>
          <div>
            <h1 style={styles.headerTitle}>Grounded Studio</h1>
            <p style={styles.headerSubtitle}>NotebookLM Engine • Strict Source Citations & Deep Web Integration</p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Confidence Gauge */}
          {latestConfidence !== null && (
            <div style={styles.confidenceBadge} title="Relevance score matching uploaded context">
              <ShieldCheck size={16} color="hsl(142, 70%, 50%)" />
              <span>{latestConfidence}% Grounded</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div style={styles.modeToggleContainer}>
            <button
              style={{
                ...styles.modeToggleBtn,
                background: groundingMode === 'strict' ? 'hsl(195, 85%, 50%)' : 'transparent',
                color: groundingMode === 'strict' ? '#fff' : '#aaa'
              }}
              onClick={() => setGroundingMode('strict')}
            >
              <ShieldCheck size={14} /> Strict Source-Only
            </button>
            <button
              style={{
                ...styles.modeToggleBtn,
                background: groundingMode === 'enrich' ? 'hsl(280, 70%, 60%)' : 'transparent',
                color: groundingMode === 'enrich' ? '#fff' : '#aaa'
              }}
              onClick={() => setGroundingMode('enrich')}
            >
              <Zap size={14} /> Hybrid Enriched
            </button>
          </div>

          {/* Action Buttons */}
          <button style={styles.actionBtn} onClick={() => setShowResearchModal(true)}>
            <Globe size={15} color="hsl(195, 90%, 60%)" /> Deep Research
          </button>

          <button style={{ ...styles.actionBtn, borderColor: isPlayingAudio ? 'hsl(142, 70%, 50%)' : 'rgba(255,255,255,0.1)' }} onClick={handlePlayAudioBriefing}>
            <Volume2 size={15} color={isPlayingAudio ? 'hsl(142, 70%, 50%)' : '#aaa'} /> {isPlayingAudio ? 'Stop Audio' : 'Audio Briefing'}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE split into Left Sources Panel, Center Chat, and Right Paragraph Inspector */}
      <div style={styles.workspace}>
        {/* LEFT SOURCES PANEL */}
        <aside style={styles.sourcesSidebar}>
          <div style={styles.sidebarHeader}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={styles.sidebarTitle}>SOURCES ({documents.length})</span>
              <button style={styles.selectAllBtn} onClick={toggleSelectAll}>
                {selectedTitles.length === documents.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* Upload Button */}
          <label style={styles.uploadBox}>
            <Upload size={16} color="hsl(195, 90%, 60%)" />
            <span>{isUploading ? 'Ingesting document...' : '+ Add Source Document'}</span>
            <input
              type="file"
              accept=".pdf,.txt"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>

          {/* Document Cards */}
          <div style={styles.docList}>
            {isLoadingDocs ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '13px' }}>Loading workspace sources...</div>
            ) : documents.length === 0 ? (
              <div style={{ padding: '30px 15px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                No sources uploaded yet. Click "+ Add Source Document" or trigger "Deep Research" to ingest knowledge!
              </div>
            ) : (
              documents.map(doc => {
                const isSelected = selectedTitles.includes(doc.title);
                return (
                  <div
                    key={doc.title}
                    style={{
                      ...styles.docCard,
                      borderColor: isSelected ? 'hsl(195, 85%, 50%)' : 'rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(0, 200, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)'
                    }}
                    onClick={() => toggleDocSelection(doc.title)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <button style={styles.checkboxBtn}>
                        {isSelected ? <CheckSquare size={16} color="hsl(195, 90%, 60%)" /> : <Square size={16} color="#666" />}
                      </button>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={styles.docCardTitle} title={doc.title}>
                          {doc.isDeepResearch && <span style={styles.deepTag}>DEEP RESEARCH</span>}
                          {doc.title}
                        </div>
                        <div style={styles.docMeta}>
                          {doc.chunkCount} chunks • ~{doc.maxParagraph} paragraphs
                        </div>
                      </div>

                      <button
                        style={styles.deleteDocBtn}
                        onClick={(e) => handleDeleteDoc(doc.title, e)}
                        title="Delete source"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* CENTER CHAT WORKSPACE */}
        <main style={styles.chatArea}>
          <div style={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div style={styles.emptyChatState}>
                <div style={styles.emptyIconBadge}>
                  <Sparkles size={32} color="hsl(195, 90%, 60%)" />
                </div>
                <h3 style={{ margin: '12px 0 6px', color: '#fff', fontSize: '18px' }}>Ask anything about your sources</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '460px', fontSize: '13px', lineHeight: '1.5', margin: '0 0 20px' }}>
                  HydrusLearn AI will strictly extract facts from your {selectedTitles.length} active selected source documents and cite exact paragraph sources inline.
                </p>

                {/* Prompt Shortcuts */}
                <div style={styles.suggestionsRow}>
                  {[
                    'Summarize the key findings across all selected sources',
                    'What are the primary theoretical arguments presented?',
                    'Identify any knowledge gaps or missing methodology details'
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      style={styles.suggestionPill}
                      onClick={() => handleSendMessage(s)}
                    >
                      <Sparkles size={13} color="hsl(195, 90%, 60%)" /> {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(m => (
                <div
                  key={m.id}
                  style={{
                    ...styles.messageRow,
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(m.role === 'user' ? styles.userBubble : styles.aiBubble)
                    }}
                  >
                    <div style={styles.messageRoleHeader}>
                      {m.role === 'user' ? 'You' : 'Grounded AI Assistant'}
                      {m.confidence && (
                        <span style={styles.confidenceTag}>
                          {m.confidence}% Grounded
                        </span>
                      )}
                    </div>

                    <div style={styles.messageText}>
                      {renderMessageContent(m.text, m.citations)}
                    </div>

                    {/* Export Action Button for AI Messages */}
                    {m.role === 'assistant' && (
                      <div style={styles.messageActions}>
                        <button
                          style={styles.exportBtn}
                          onClick={() => handleExportToPlayground(m.text)}
                          title="Generate Mindmap or Quiz in Learning Playground"
                        >
                          <Zap size={13} /> Convert to Interactive Study Tool
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoadingChat && (
              <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                <div style={{ ...styles.messageBubble, ...styles.aiBubble }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aaa', fontSize: '13px' }}>
                    <Sparkles size={16} className="spin" color="hsl(195, 90%, 60%)" />
                    <span>Searching {selectedTitles.length} source documents & verifying inline paragraph citations...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT BAR */}
          <div style={styles.inputContainer}>
            <div style={styles.inputBox}>
              <textarea
                style={styles.chatInput}
                placeholder={
                  selectedTitles.length === 0
                    ? 'Select at least one source on the left to start grounded chat...'
                    : `Ask a question grounded in ${selectedTitles.length} selected source(s)...`
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
              />
              <button
                style={{
                  ...styles.sendBtn,
                  opacity: inputValue.trim() && !isLoadingChat ? 1 : 0.4
                }}
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoadingChat}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT SLIDE-OVER DRAWER (PARAGRAPH INSPECTOR) */}
        {inspectorOpen && (
          <aside style={styles.inspectorDrawer}>
            <div style={styles.drawerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="hsl(195, 90%, 60%)" />
                <div>
                  <h4 style={styles.drawerTitle}>{inspectedDocTitle}</h4>
                  <span style={styles.drawerSubtitle}>Target Cited Paragraph: #{inspectedTargetPara}</span>
                </div>
              </div>
              <button style={styles.closeBtn} onClick={() => setInspectorOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={styles.drawerBody}>
              {isLoadingParagraphs ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                  Loading document paragraphs...
                </div>
              ) : (
                inspectedParagraphs.map(p => {
                  const isHighlighted = p.paragraphIndex === inspectedTargetPara;
                  return (
                    <div
                      key={p.id}
                      ref={el => paragraphRefs.current[p.paragraphIndex] = el}
                      style={{
                        ...styles.paragraphCard,
                        ...(isHighlighted ? styles.highlightedParagraphCard : {})
                      }}
                    >
                      <div style={styles.paragraphHeader}>
                        <span style={styles.paraTag}>
                          Paragraph #{p.paragraphIndex} {isHighlighted && '⭐ CITED IN ANSWER'}
                        </span>
                        <button
                          style={styles.copyParaBtn}
                          onClick={() => navigator.clipboard.writeText(p.text)}
                          title="Copy paragraph"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <p style={styles.paragraphText}>{p.text}</p>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* DEEP RESEARCH MODAL */}
      <DeepResearchModal
        isOpen={showResearchModal}
        onClose={() => setShowResearchModal(false)}
        onIngestSuccess={(result) => {
          fetchDocuments();
          setSelectedTitles(prev => [...prev, result.documentTitle]);
          setShowResearchModal(false);
          handleSendMessage(`Provide a summary of the newly ingested research report on "${result.topic}".`);
        }}
      />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#0a0c12',
    color: '#fff',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  header: {
    height: '64px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#12141c',
    zIndex: 20
  },
  logoBadge: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'rgba(0, 200, 255, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(0, 200, 255, 0.2)'
  },
  headerTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.3px'
  },
  headerSubtitle: {
    margin: 0,
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)'
  },
  confidenceBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    background: 'rgba(142, 70%, 50%, 0.12)',
    border: '1px solid rgba(142, 70%, 50%, 0.3)',
    fontSize: '12px',
    fontWeight: 600,
    color: 'hsl(142, 70%, 50%)'
  },
  modeToggleContainer: {
    display: 'flex',
    padding: '3px',
    borderRadius: '8px',
    backgroundColor: '#0a0c12',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  modeToggleBtn: {
    border: 'none',
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    backgroundColor: '#161925',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  workspace: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  sourcesSidebar: {
    width: '300px',
    backgroundColor: '#12141c',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column'
  },
  sidebarHeader: {
    padding: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
  },
  sidebarTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: '0.8px'
  },
  selectAllBtn: {
    background: 'transparent',
    border: 'none',
    color: 'hsl(195, 90%, 60%)',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  uploadBox: {
    margin: '12px 16px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px dashed rgba(0, 200, 255, 0.3)',
    backgroundColor: 'rgba(0, 200, 255, 0.04)',
    color: 'hsl(195, 90%, 60%)',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  docList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  docCard: {
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  checkboxBtn: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    marginTop: '2px'
  },
  docCardTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  deepTag: {
    fontSize: '9px',
    fontWeight: 800,
    background: 'rgba(180, 80, 255, 0.2)',
    color: 'hsl(280, 70%, 60%)',
    padding: '2px 5px',
    borderRadius: '4px',
    marginRight: '6px'
  },
  docMeta: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: '4px'
  },
  deleteDocBtn: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px'
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0a0c12',
    position: 'relative'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  emptyChatState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center'
  },
  emptyIconBadge: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    background: 'rgba(0, 200, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(0, 200, 255, 0.15)'
  },
  suggestionsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    maxWidth: '520px'
  },
  suggestionPill: {
    padding: '10px 14px',
    borderRadius: '10px',
    backgroundColor: '#12141c',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ddd',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'border-color 0.2s ease'
  },
  messageRow: {
    display: 'flex',
    width: '100%'
  },
  messageBubble: {
    maxWidth: '82%',
    padding: '16px 20px',
    borderRadius: '16px',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  userBubble: {
    backgroundColor: 'hsl(195, 85%, 45%)',
    color: '#fff',
    borderBottomRightRadius: '4px'
  },
  aiBubble: {
    backgroundColor: '#12141c',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#e0e0e0',
    borderBottomLeftRadius: '4px'
  },
  messageRoleHeader: {
    fontSize: '11px',
    fontWeight: 700,
    opacity: 0.6,
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  confidenceTag: {
    color: 'hsl(142, 70%, 50%)',
    fontSize: '10px',
    fontWeight: 700
  },
  messageText: {
    whiteSpace: 'pre-wrap'
  },
  citationChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(0, 200, 255, 0.12)',
    border: '1px solid rgba(0, 200, 255, 0.3)',
    color: 'hsl(195, 90%, 65%)',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    margin: '0 4px',
    verticalAlign: 'middle'
  },
  messageActions: {
    marginTop: '12px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)'
  },
  exportBtn: {
    background: 'transparent',
    border: 'none',
    color: 'hsl(195, 90%, 60%)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  inputContainer: {
    padding: '16px 32px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)'
  },
  inputBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#12141c',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    padding: '8px 14px'
  },
  chatInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit'
  },
  sendBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'hsl(195, 85%, 55%)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  inspectorDrawer: {
    width: '360px',
    backgroundColor: '#12141c',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column'
  },
  drawerHeader: {
    padding: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  drawerTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff'
  },
  drawerSubtitle: {
    fontSize: '11px',
    color: 'hsl(195, 90%, 60%)',
    fontWeight: 600
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer'
  },
  drawerBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  paragraphCard: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#0a0c12',
    border: '1px solid rgba(255, 255, 255, 0.06)'
  },
  highlightedParagraphCard: {
    borderColor: 'hsl(195, 90%, 60%)',
    backgroundColor: 'rgba(0, 200, 255, 0.1)',
    boxShadow: '0 0 15px rgba(0, 200, 255, 0.2)'
  },
  paragraphHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px'
  },
  paraTag: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'hsl(195, 90%, 60%)'
  },
  copyParaBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer'
  },
  paragraphText: {
    margin: 0,
    fontSize: '12px',
    lineHeight: '1.5',
    color: '#ddd'
  }
};
