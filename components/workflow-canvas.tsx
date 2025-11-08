'use client'

import { WorkflowNode } from '@/components/workflow-node'
import { api } from '@/convex/_generated/api'
import type { WorkflowCanvasProps } from '@/lib/types'
import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
} from '@xyflow/react'
import { useMutation } from 'convex/react'
import debounce from 'lodash.debounce'
import { nanoid } from 'nanoid'
import { useCallback, useEffect, useMemo, useRef } from 'react'

const nodeTypeLabels: Record<string, string> = {
  start: 'Start',
  youtube: 'YouTube Analyzer',
  pdf: 'PDF Reader',
  summarizer: 'Text Summarizer',
  flashcard: 'Flashcard Generator',
  quiz: 'Quiz Builder',
  tutor: 'AI Tutor',
  'concept-extractor': 'Concepts Extractor',
  'cross-reference': 'Cross Referencer',
  'essay-grader': 'Essay Grader',
  'study-plan': 'Study Plan Generator',
  'web-scraper': 'Web Scraper',
  'audio-transcriber': 'Audio Transcriber',
  'deep-research': 'Deep Research',
}

function FlowCanvas({
  workflowId,
  userId,
  initialNodes: providedInitialNodes,
  initialEdges: providedInitialEdges,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(providedInitialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(providedInitialEdges)
  const { screenToFlowPosition } = useReactFlow()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const saveWorkflow = useMutation(api.workflows.saveWorkflow)

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    },
    [setNodes, setEdges]
  )

  const handleReplaceNode = useCallback(
    (nodeId: string, newType: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                type: newType,
                label: nodeTypeLabels[newType] || newType,
              },
            }
          }
          return node
        })
      )
    },
    [setNodes]
  )

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      workflow: WorkflowNode,
    }),
    []
  )

  // Debounced save function
  const debouncedSave = useMemo(
    () =>
      debounce((nodes: Node[], edges: Edge[]) => {
        saveWorkflow({
          workflowId,
          userId,
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        })
      }, 300),
    [workflowId, userId, saveWorkflow]
  )

  // Add delete and replace handlers to all nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onDelete: handleDeleteNode,
          onReplace: handleReplaceNode,
        },
      }))
    )
  }, [handleDeleteNode, handleReplaceNode, setNodes])

  // Save workflow whenever nodes or edges change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      debouncedSave(nodes, edges)
    }
  }, [nodes, edges, debouncedSave])

  const onConnect: OnConnect = useCallback((connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const nodeType = event.dataTransfer.getData('application/reactflow')

      if (!nodeType) {
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: nanoid(),
        type: 'workflow',
        position,
        data: {
          label: nodeTypeLabels[nodeType] || nodeType,
          type: nodeType,
          onDelete: handleDeleteNode,
          onReplace: handleReplaceNode,
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [screenToFlowPosition, setNodes, handleDeleteNode, handleReplaceNode]
  )

  return (
    <div ref={reactFlowWrapper} className="relative h-full w-full">
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
        fitViewOptions={{
          padding: 0.3,
          maxZoom: 0.9,
          minZoom: 0.5,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return <FlowCanvas {...props} />
}
