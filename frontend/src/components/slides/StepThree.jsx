import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
} from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import { ArrowLeft, ExternalLink, Lightbulb, X } from "lucide-react";
import axios from "axios";
import { useAuth } from "../../AuthContext";

// Color palette
const categoryColors = [
  "hsl(0, 70%, 60%)",
  "hsl(142, 70%, 50%)",
  "hsl(195, 85%, 55%)",
  "hsl(280, 70%, 60%)",
];

// Helper function for exponential backoff retry
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimited = error.response?.status === 429 || 
                           error.message?.includes('Rate limit') ||
                           error.message?.includes('rate_limit_exceeded');
      
      if (isRateLimited && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

export default function StepThree({ data, onRetake, quizResults }) {
  const { user, session, currentDocumentTitle } = useAuth();
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mcq, setMcq] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const hasAutoSavedRef = useRef(false);

 
  // Build initial nodes & edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!data?.nodes || !data?.edges) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes = data.nodes.map((n, i) => {
      const color = categoryColors[i % categoryColors.length];

      return {
        id: n.id,
        data: {
          label: n.label,
          description:
            n.description || "Review this concept to improve your understanding.",
          category: n.category || "Review Topic",
          sourceLink: n.sourceLink,
        },
        position: { x: i * 250, y: i % 2 === 0 ? 0 : 150 },
        style: {
          background: color,
          color: "white",
          borderRadius: "12px",
          padding: "12px 20px",
          fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          minWidth: "150px",
          textAlign: "center",
        },
      };
    });

    const edges = data.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      animated: true,
      style: { stroke: "hsl(195, 85%, 55%)", strokeWidth: 2 },
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  // Save quiz and mindmap to database with rate limiting
  const handleSaveQuizAndMindmap = async () => {
    const accessToken = session?.access_token;
    if (!user?.id || !accessToken || !data || data._perfect || data._failed) {
      setSaveStatus('error');
      setSaveMessage('Cannot save: Missing session or invalid data');
      return;
    }

    setSaveStatus('saving');
    setSaveMessage('Saving your progress...');

    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
      await retryWithBackoff(async () => {
        return await axios.post(
          `${API_BASE}/api/save-quiz-mindmap`,
          {
            userId: user.id,
            title: currentDocumentTitle || `Quiz - ${new Date().toLocaleDateString()}`,
            quizResults: quizResults || [],
            mindmapNodes: {
              nodes: data.nodes || [],
              edges: data.edges || []
            }
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            }
          }
        );
      });

      setSaveStatus('success');
      setSaveMessage('Quiz and mindmap saved successfully!');
      
      setTimeout(() => {
        setSaveStatus(null);
        setSaveMessage('');
      }, 3000);
    } catch (err) {
      console.error("Error saving quiz and mindmap:", err);
      setSaveStatus('error');
      setSaveMessage(`Error: ${err.message || 'Failed to save'}`);
    }
  };

  useEffect(() => {
    if (hasAutoSavedRef.current) return;
    if (!user?.id || !session?.access_token || !data || data._perfect || data._failed) return;

    hasAutoSavedRef.current = true;
    handleSaveQuizAndMindmap();
  }, [user?.id, session?.access_token, data]);

  // -------------------------------
  // Add Similar Topic Node
  // -------------------------------
  const handleAddSimilarTopic = async () => {
    if (!selectedNode) return;

    setLoading(true);
    try {
      const res = await axios.post("/api/generate-similar-topic", {
        topic: selectedNode.data.label,
      });

      const newId = `node-${Date.now()}`;

      const newNode = {
        id: newId,
        data: {
          label: res.data.label,
          description: res.data.description,
          category: "Related Topic",
        },
        position: {
          x: selectedNode.position.x + 220,
          y: selectedNode.position.y + 80,
        },
        style: {
          background:
            categoryColors[Math.floor(Math.random() * categoryColors.length)],
          color: "white",
          borderRadius: "12px",
          padding: "12px 20px",
          fontWeight: 600,
        },
      };

      const newEdge = {
        id: `e-${selectedNode.id}-${newId}`,
        source: selectedNode.id,
        target: newId,
        animated: true,
        style: { strokeWidth: 2 },
      };

      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);
    } catch {
      alert("Failed to generate similar topic");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // Generate MCQ
  // -------------------------------
  const handleGenerateMCQ = async () => {
    if (!selectedNode) return;

    setLoading(true);
    try {
      const res = await axios.post("/api/generate-mcq", {
        topic: selectedNode.data.label,
      });

      setMcq(res.data); // { question, choices[], answer }
    } catch {
      alert("Failed to generate MCQ");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // Empty / Perfect / Failed States
  // -------------------------------
  if (!data) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-center">
        <p>No review map available</p>
        <button onClick={onRetake}>Take Quiz</button>
      </div>
    );
  }

  if (data._perfect) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-center">
        <Lightbulb className="w-10 h-10 text-green-600 mb-2" />
        <h2 className="text-xl font-bold">Perfect Score 🎉</h2>
        <button onClick={onRetake}>Restart Quiz</button>
      </div>
    );
  }

  if (data._failed) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-red-600">
          Mindmap Generation Failed
        </h2>
        <button onClick={onRetake}>Try Again</button>
      </div>
    );
  }

  // -------------------------------
  // Main Render
  // -------------------------------
  return (
    <div className="h-[900px] relative bg-slate-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onRetake}
            className="flex items-center gap-2 px-3 py-1 border rounded-md hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-bold text-lg">Your Review Map</h1>
        </div>

        <div />
      </div>

      {/* Status Message */}
      {saveMessage && (
        <div className={`px-4 py-2 text-sm font-medium text-center ${
          saveStatus === 'success'
            ? 'bg-green-50 text-green-700'
            : saveStatus === 'error'
            ? 'bg-red-50 text-red-700'
            : 'bg-blue-50 text-blue-700'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Graph */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-80 bg-white rounded-xl shadow-xl p-6 z-20">
          <div className="flex justify-between mb-2">
            <span
              className="text-xs text-white px-2 py-1 rounded"
              style={{ background: selectedNode.style.background }}
            >
              {selectedNode.data.category}
            </span>
            <button onClick={() => setSelectedNode(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2 className="font-bold text-lg mb-2">
            {selectedNode.data.label}
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            {selectedNode.data.description}
          </p>

          <button
            className="w-full mb-2 p-2 bg-blue-600 text-white rounded"
            onClick={handleAddSimilarTopic}
            disabled={loading}
          >
            Add Similar Topic
          </button>

          <button
            className="w-full p-2 bg-purple-600 text-white rounded"
            onClick={handleGenerateMCQ}
            disabled={loading}
          >
           Generate MCQ
          </button>

          <button
            className="w-full mt-3 p-2 bg-slate-100 rounded flex justify-center gap-2"
            onClick={() => {
              const q = encodeURIComponent(selectedNode.data.label);
              window.open(`https://www.google.com/search?q=${q}`, "_blank");
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Search Resources
          </button>
        </div>
      )}

      {/* MCQ Modal */}
      {mcq && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[420px]">
            <h2 className="font-bold mb-4">{mcq.question}</h2>

            <div className="space-y-2">
              {mcq.choices.map((c, i) => (
                <button
                  key={i}
                  className="w-full p-2 border rounded hover:bg-slate-100"
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              className="mt-4 w-full bg-slate-700 text-white p-2 rounded"
              onClick={() => setMcq(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
