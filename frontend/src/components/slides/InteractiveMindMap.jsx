import React, { useMemo, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export default function InteractiveMindMap({ mindmap }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // 🔁 Convert backend mindmap → ReactFlow format
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!mindmap || !mindmap.nodes || !mindmap.edges) {
      return { nodes: [], edges: [] };
    }

    const nodes = mindmap.nodes.map((n, i) => ({
      id: n.id,
      data: { label: n.label },
      position: {
        x: i * 220,
        y: i % 2 === 0 ? 0 : 140,
      },
      style: {
        background: "#1f2937",
        color: "#fff",
        border: "2px solid #3b82f6",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "13px",
        fontWeight: "bold",
      },
    }));

    const edges = mindmap.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      animated: true,
      style: { stroke: "#3b82f6", strokeWidth: 2 },
    }));

    return { nodes, edges };
  }, [mindmap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = (_, node) => {
    setSelectedNode(node);
  };

  if (!mindmap) {
    return (
      <div className="text-center p-12 text-gray-600">
        No review data available.
      </div>
    );
  }

  return (
    <section className="w-full bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-6">
          Your Personalized Review Map
        </h2>

        <div
          className="bg-white rounded-xl shadow-lg overflow-hidden"
          style={{ height: "500px" }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            <Controls />
            <MiniMap
              style={{ background: "#f3f4f6" }}
              nodeColor={() => "#3b82f6"}
            />
          </ReactFlow>
        </div>

        {selectedNode && (
          <div className="mt-6 bg-white p-5 rounded-lg shadow border-l-4 border-blue-500">
            <h3 className="text-xl font-bold mb-1">
              {selectedNode.data.label}
            </h3>
            <p className="text-gray-600">
              This topic was identified as an area to review based on your quiz
              answers.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
