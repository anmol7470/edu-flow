"use client";

import { useCallback, useRef, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type OnConnect,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import debounce from "lodash.debounce";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WorkflowNode } from "@/components/workflow-node";
import type { WorkflowCanvasProps } from "@/lib/types";
import "@xyflow/react/dist/style.css";

const nodeTypeLabels: Record<string, string> = {
  youtube: "YouTube Analyzer",
  pdf: "PDF Reader",
  summarizer: "Summarizer",
  flashcard: "Flashcard Generator",
  quiz: "Quiz Builder",
  tutor: "AI Tutor",
};

function FlowCanvas({
  workflowId,
  userId,
  initialNodes: providedInitialNodes,
  initialEdges: providedInitialEdges,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(providedInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(providedInitialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const saveWorkflow = useMutation(api.workflows.saveWorkflow);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      workflow: WorkflowNode,
    }),
    []
  );

  // Debounced save function
  const debouncedSave = useMemo(
    () =>
      debounce((nodes: Node[], edges: Edge[]) => {
        saveWorkflow({
          workflowId,
          userId,
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        });
      }, 300),
    [workflowId, userId, saveWorkflow]
  );

  // Save workflow whenever nodes or edges change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      debouncedSave(nodes, edges);
    }
  }, [nodes, edges, debouncedSave]);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("application/reactflow");

      if (!nodeType) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: nanoid(),
        type: "workflow",
        position,
        data: { label: nodeTypeLabels[nodeType] || nodeType },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return <FlowCanvas {...props} />;
}
