import React, { useState, useEffect } from 'react';
import { X, Sparkles, Globe, Cpu, CheckCircle2, FileText, ExternalLink, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { useAuth } from '../AuthContext';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

export default function DeepResearchModal({ isOpen, onClose, onIngestSuccess, initialTopic = '' }) {
  const { session } = useAuth();
  const [topic, setTopic] = useState(initialTopic);
  const [depth, setDepth] = useState('deep'); // 'quick' or 'deep'
  const [isResearching, setIsResearching] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [researchResult, setResearchResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  if (!isOpen) return null;

  const steps = [
    { title: 'Knowledge Gap Analysis', desc: 'Analyzing missing context and generating sub-queries...', icon: Cpu },
    { title: 'Autonomous Web Crawl', desc: 'Scouring live academic web sources & article repositories...', icon: Globe },
    { title: 'Finding Extraction', desc: 'Synthesizing key data points, formulas, & technical facts...', icon: Sparkles },
    { title: 'Deep Report Generation', desc: 'Drafting structured publication-grade research report...', icon: FileText },
    { title: 'Auto-Ingestion to Base', desc: 'Indexing paragraph embeddings into Grounded Studio...', icon: Layers },
  ];

  const handleStartResearch = async () => {
    if (!topic.trim()) {
      setError('Please enter a research topic or knowledge gap prompt');
      return;
    }

    setError('');
    setIsResearching(true);
    setResearchResult(null);
    setActiveStep(0);

    // Simulate step progression visually
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 2800);

    try {
      const response = await fetch(`${API_BASE}/api/ai/deep-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          topic: topic.trim(),
          depth,
          autoIngest: true
        })
      });

      clearInterval(stepInterval);

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Deep research failed');
      }

      setActiveStep(4);
      setResearchResult(data);
      if (onIngestSuccess) {
        onIngestSuccess(data);
      }
    } catch (err) {
      clearInterval(stepInterval);
      setError(err.message || 'Deep research failed');
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.iconBadge}>
              <Sparkles size={20} color="hsl(195, 90%, 60%)" />
            </div>
            <div>
              <h3 style={styles.title}>Deep Research Integration</h3>
              <p style={styles.subtitle}>Automate multi-stage web research to fill knowledge gaps</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {!isResearching && !researchResult && (
            <div style={styles.formContainer}>
              <label style={styles.label}>What topic or gap would you like to research deeply?</label>
              <textarea
                style={styles.textarea}
                placeholder="e.g. Quantum error correction mechanisms in fault-tolerant quantum computing..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={4}
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  style={{
                    ...styles.depthBtn,
                    borderColor: depth === 'deep' ? 'hsl(195, 85%, 55%)' : 'rgba(255,255,255,0.1)',
                    background: depth === 'deep' ? 'rgba(0, 200, 255, 0.1)' : 'transparent'
                  }}
                  onClick={() => setDepth('deep')}
                >
                  <Sparkles size={16} color="hsl(195, 85%, 55%)" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>Deep Research (Comprehensive)</div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>Multi-query web crawl & 2,000+ word report</div>
                  </div>
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.depthBtn,
                    borderColor: depth === 'quick' ? 'hsl(280, 70%, 60%)' : 'rgba(255,255,255,0.1)',
                    background: depth === 'quick' ? 'rgba(180, 80, 255, 0.1)' : 'transparent'
                  }}
                  onClick={() => setDepth('quick')}
                >
                  <Globe size={16} color="hsl(280, 70%, 60%)" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>Quick Overview</div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>Fast web search & concise executive report</div>
                  </div>
                </button>
              </div>

              {error && <div style={styles.errorBox}>{error}</div>}

              <button style={styles.submitBtn} onClick={handleStartResearch}>
                <Sparkles size={16} /> Start Deep Research Agent
              </button>
            </div>
          )}

          {/* Research Stepper State */}
          {isResearching && (
            <div style={styles.stepperContainer}>
              <div style={styles.stepperHeader}>
                <RefreshCw size={20} className="spin" color="hsl(195, 90%, 60%)" />
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>
                  Agent Executing Research Plan...
                </span>
              </div>

              <div style={styles.stepperList}>
                {steps.map((s, idx) => {
                  const StepIcon = s.icon;
                  const isActive = idx === activeStep;
                  const isDone = idx < activeStep;

                  return (
                    <div
                      key={idx}
                      style={{
                        ...styles.stepItem,
                        opacity: isActive || isDone ? 1 : 0.35,
                        borderColor: isActive ? 'hsl(195, 85%, 55%)' : 'transparent',
                        background: isActive ? 'rgba(0, 200, 255, 0.08)' : 'transparent'
                      }}
                    >
                      <div style={styles.stepIconBox}>
                        {isDone ? (
                          <CheckCircle2 size={18} color="hsl(142, 70%, 50%)" />
                        ) : (
                          <StepIcon size={18} color={isActive ? 'hsl(195, 90%, 60%)' : '#888'} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>
                          Step {idx + 1}: {s.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                          {s.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Research Results View */}
          {researchResult && (
            <div style={styles.resultsContainer}>
              <div style={styles.successBanner}>
                <CheckCircle2 size={20} color="hsl(142, 70%, 50%)" />
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>
                    Deep Research Complete & Auto-Ingested!
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    Report saved as "{researchResult.documentTitle}" ({researchResult.stats.ingestedChunks} paragraph chunks indexed)
                  </div>
                </div>
              </div>

              {/* Web Sources Grid */}
              {researchResult.sources?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '8px' }}>
                    DISCOVERED WEB SOURCES ({researchResult.sources.length})
                  </div>
                  <div style={styles.sourcesGrid}>
                    {researchResult.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.sourceCard}
                      >
                        <Globe size={14} color="hsl(195, 85%, 55%)" />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={styles.sourceCardTitle}>{src.title}</div>
                          <div style={styles.sourceCardSnippet}>{src.snippet}</div>
                        </div>
                        <ExternalLink size={12} color="#666" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Markdown Preview */}
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '8px' }}>
                RESEARCH REPORT PREVIEW
              </div>
              <div style={styles.markdownBox}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#e0e0e0' }}>
                  {researchResult.reportMarkdown}
                </pre>
              </div>

              <button
                style={styles.submitBtn}
                onClick={onClose}
              >
                Chat with Ingested Research <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modal: {
    width: '100%',
    maxWidth: '680px',
    backgroundColor: '#12141c',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh'
  },
  header: {
    padding: '18px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255, 255, 255, 0.02)'
  },
  iconBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(0, 200, 255, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff'
  },
  subtitle: {
    margin: 0,
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  body: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#e0e0e0'
  },
  textarea: {
    width: '100%',
    backgroundColor: '#0a0c12',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '12px 14px',
    color: '#fff',
    fontSize: '14px',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit'
  },
  depthBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textAlign: 'left'
  },
  submitBtn: {
    marginTop: '12px',
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, hsl(195, 85%, 55%), hsl(280, 70%, 60%))',
    color: '#fff',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 15px rgba(0, 180, 255, 0.3)'
  },
  errorBox: {
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(255, 50, 50, 0.15)',
    border: '1px solid rgba(255, 50, 50, 0.3)',
    color: '#ff8888',
    fontSize: '13px'
  },
  stepperContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  stepperHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    borderRadius: '10px',
    background: 'rgba(0, 200, 255, 0.06)'
  },
  stepperList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid transparent',
    transition: 'all 0.2s ease'
  },
  stepIconBox: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '10px',
    background: 'rgba(142, 70%, 50%, 0.12)',
    border: '1px solid rgba(142, 70%, 50%, 0.3)'
  },
  sourcesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '8px'
  },
  sourceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#0a0c12',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    textDecoration: 'none',
    color: '#fff',
    transition: 'border-color 0.2s'
  },
  sourceCardTitle: {
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  sourceCardSnippet: {
    fontSize: '11px',
    color: '#888',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  markdownBox: {
    maxHeight: '260px',
    overflowY: 'auto',
    backgroundColor: '#0a0c12',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '14px'
  }
};
