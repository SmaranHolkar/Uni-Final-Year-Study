import React, { useMemo, useState, useCallback } from "react";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import { ArrowLeft, ExternalLink, Lightbulb, X } from "lucide-react";

// Color palette from the top example
const categoryColors = [
  "hsl(0, 70%, 60%)",   // Red-ish
  "hsl(142, 70%, 50%)", // Green-ish
  "hsl(195, 85%, 55%)", // Blue-ish
  "hsl(280, 70%, 60%)"  // Purple-ish
];

export default function StepThree({ data, onRetake }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // 🧠 Build ReactFlow nodes + edges from backend mindmap
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!data || !data.nodes || !data.edges) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes = data.nodes.map((n, i) => {
      // Pick a color based on index to mimic categories
      const color = categoryColors[i % categoryColors.length];
      
      return {
        id: n.id,
        // Store extra data for the popup card
        data: { 
          label: n.label,
          description: n.description || "Review this concept to improve your understanding.",
          category: n.category || "Review Topic",
          sourceLink: n.sourceLink || ""
        },
        position: {
          x: i * 250,
          y: i % 2 === 0 ? 0 : 150,
        },
        // Styling from the "KnowledgeGraph" example
        style: {
          background: color,
          color: "white",
          border: "2px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "12px",
          padding: "12px 20px",
          fontSize: "14px",
          fontWeight: "600",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          width: 'auto',
          minWidth: '150px',
          textAlign: 'center'
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

  // If no data was provided, show a friendly message and action
  if (!data) {
    return (
      <div className="h-80 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-700 mb-2">No review map available</h2>
        <p className="text-sm text-slate-500 mb-4">Complete the quiz to generate a personalized review map.</p>
        <button
          onClick={onRetake}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Take Quiz
        </button>
      </div>
    );
  }

  // Handle Perfect Score State
  if (data && data._perfect) {
    return (
      <div className="h-80 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <div className="bg-green-100 p-4 rounded-full mb-4">
          <Lightbulb className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800">🎉 Perfect Score!</h2>
        <p className="mb-6 text-gray-600 max-w-md">You mastered these topics completely. No review map needed!</p>
        <button
          onClick={onRetake}
          className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
        >
          Restart Quiz
        </button>
      </div>
    );
  }

  //Handle "Failed Generation" State --
  if (data && data._failed) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center bg-red-50 rounded-xl border border-red-200 p-8 text-center">
        <h2 className="text-2xl font-bold mb-2 text-red-700">Mindmap Not Available</h2>
        <p className="mb-6 text-red-600">
          There was a glitch generating your review map.
        </p>
        <button
          onClick={onRetake}
          className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg"
        >
          Try Again
        </button>
      </div>
    );
  }
const [printMode, setPrintMode] = useState(false);

  //Main Mindmap with ReactFlow
  return (
    <div className="h-full w-full flex flex-col bg-slate-50 rounded-xl border border-slate-200 shadow-xl relative overflow-visible">
      
      {/* Header Bar */}
      <div className="p-4 bg-white border-b flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onRetake}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors border"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <div>
            <h1 className="text-lg font-bold text-slate-800">Your Review Map</h1>
            <p className="text-xs text-slate-500">Click nodes to see details</p>
          </div>
          <div>
            
          </div>

        </div>
      </div>

      <div className="flex-1 flex relative">
        <div className="flex-1 relative bg-slate-50">
          <div className="w-full h-full" style={{ height: '1000px' }}>
            <ReactFlow
              className="w-full h-full"
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
              <Controls className="bg-white border shadow-md" />
              <MiniMap
                nodeColor={(node) => (node?.style?.background ?? '#3b82f6')}
                style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
            </ReactFlow>
          </div>

          {/* Hint Overlay */}
          {!selectedNode && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2 animate-fade-in">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <p className="text-sm font-medium text-slate-600">Select a topic to view details</p>
            </div>
          )}
        </div>

        {/* Floating Details Card (Styled like the reference) */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-20 animate-in slide-in-from-right-10 fade-in duration-300">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <span 
                  className="px-2 py-1 text-xs font-bold rounded-md text-white"
                  style={{ backgroundColor: selectedNode.style.background }}
                >
                  {selectedNode.data.category}
                </span>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="h-full w-full">
                <h2 className="text-xl font-bold text-slate-800 mb-2">{selectedNode.data.label}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {selectedNode.data.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                  Recommended Action
                </h3>

                {selectedNode.data.sourceLink && (
                  <a
                    href={selectedNode.data.sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                              bg-slate-100 hover:bg-slate-200 text-slate-700 
                              transition-all text-sm font-medium group
                              hover:shadow-sm active:scale-[0.98]"
                  >
                    <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="truncate max-w-[200px]">
                      Open Learning Resource
                    </span>
                  </a>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

//                 {selectedNode.data.sourceLink && (
//   <a
//     href={selectedNode.data.sourceLink}
//     target="_blank"
//     rel="noopener noreferrer"
//     className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-sm font-medium group"
//   >
//     <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
//     Open Learning Resource
//   </a>
// )}