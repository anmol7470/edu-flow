'use client'

import { WorkflowNode } from '@/components/workflow-node'
import { api } from '@/convex/_generated/api'
import { nodeTypeLabels } from '@/lib/nodes'
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
import { useMutation, useQuery } from 'convex/react'
import debounce from 'lodash.debounce'
import { nanoid } from 'nanoid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function FlowCanvas({
  workflowId,
  userId,
  initialNodes: providedInitialNodes,
  initialEdges: providedInitialEdges,
  selectedNodeId: externalSelectedNodeId,
  onSelectedNodeChange,
}: WorkflowCanvasProps & {
  selectedNodeId?: string | null
  onSelectedNodeChange?: (nodeId: string | null) => void
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(providedInitialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(providedInitialEdges)
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null)
  const selectedNodeId = externalSelectedNodeId ?? internalSelectedNodeId
  const { screenToFlowPosition } = useReactFlow()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const saveWorkflow = useMutation(api.workflows.saveWorkflow)

  // Subscribe to node configs and executions
  const nodeConfigs = useQuery(api.nodeExecutions.getNodeConfigs, { workflowId })
  const nodeExecutions = useQuery(api.nodeExecutions.getNodeExecutions, { workflowId })

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const nodeToDelete = nds.find((node) => node.id === nodeId)
        // Prevent deletion of start nodes
        if (nodeToDelete?.data?.type === 'start') {
          return nds
        }
        return nds.filter((node) => node.id !== nodeId)
      })
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    },
    [setNodes, setEdges]
  )

  const handleReplaceNode = useCallback(
    (nodeId: string, newType: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            // Prevent replacement of start nodes
            if (node.data?.type === 'start') {
              return node
            }
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

  // Add delete and replace handlers, config, and execution state to all nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        deletable: node.data?.type !== 'start',
        data: {
          ...node.data,
          onDelete: handleDeleteNode,
          onReplace: handleReplaceNode,
          config: nodeConfigs?.[node.id],
          execution: nodeExecutions?.[node.id],
          isSelected: selectedNodeId === node.id,
          onSelect: () => {
            if (onSelectedNodeChange) {
              onSelectedNodeChange(node.id)
            } else {
              setInternalSelectedNodeId(node.id)
            }
          },
        },
      }))
    )
  }, [handleDeleteNode, handleReplaceNode, nodeConfigs, nodeExecutions, selectedNodeId, setNodes])

  // Save workflow whenever nodes or edges change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      debouncedSave(nodes, edges)
    }
  }, [nodes, edges, debouncedSave])

  const onConnect: OnConnect = useCallback((connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onSelectedNodeChange) {
        onSelectedNodeChange(node.id)
      } else {
        setInternalSelectedNodeId(node.id)
      }
    },
    [onSelectedNodeChange]
  )

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
        deletable: nodeType !== 'start',
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
        onNodeClick={onNodeClick}
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

export function WorkflowCanvas(
  props: WorkflowCanvasProps & {
    selectedNodeId?: string | null
    onSelectedNodeChange?: (nodeId: string | null) => void
  }
) {
  return <FlowCanvas {...props} />
}
