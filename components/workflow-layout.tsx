'use client'

import { ConceptExtractorSheet } from '@/components/concept-extractor-sheet'
import { PDFConfigSheet } from '@/components/pdf-config-sheet'
import { TextImproverSheet } from '@/components/text-improver-sheet'
import { TextSummarizerSheet } from '@/components/text-summarizer-sheet'
import { WebSearchSheet } from '@/components/web-search-sheet'
import { Button } from '@/components/ui/button'
import { WorkflowCanvas } from '@/components/workflow-canvas'
import { WorkflowSidebar } from '@/components/workflow-sidebar'
import { WorkflowTitleEditor } from '@/components/workflow-title-editor'
import { YouTubeConfigSheet } from '@/components/youtube-config-sheet'
import { api } from '@/convex/_generated/api'
import type { WorkflowLayoutProps } from '@/lib/types'
import { useQueryWithStatus } from '@/lib/utils'
import type { Edge, Node } from '@xyflow/react'
import { ReactFlowProvider } from '@xyflow/react'
import { useMutation, useQuery } from 'convex/react'
import { Play } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function WorkflowLayout({ workflowId, userId }: WorkflowLayoutProps) {
  const router = useRouter()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [configSheetOpen, setConfigSheetOpen] = useState(false)
  const [pdfSheetOpen, setPdfSheetOpen] = useState(false)
  const [summarizerSheetOpen, setSummarizerSheetOpen] = useState(false)
  const [improverSheetOpen, setImproverSheetOpen] = useState(false)
  const [conceptExtractorSheetOpen, setConceptExtractorSheetOpen] = useState(false)
  const [webSearchSheetOpen, setWebSearchSheetOpen] = useState(false)

  const {
    data: workflow,
    isSuccess,
    isPending,
    isError,
  } = useQueryWithStatus(api.workflows.getWorkflow, { workflowId })

  const nodeConfigs = useQuery(api.nodeExecutions.getNodeConfigs, { workflowId })
  const updateNodeExecution = useMutation(api.nodeExecutions.updateNodeExecution)

  // Handle error - redirect to home
  if (isError) {
    router.push('/')
    return null
  }

  // Show loading state
  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Play className="text-primary h-12 w-12 animate-spin" />
          <div className="text-muted-foreground text-lg">Loading workflow...</div>
        </div>
      </div>
    )
  }

  // Parse nodes and edges
  const initialNodes: Node[] = isSuccess && workflow ? JSON.parse(workflow.nodes) : []
  const initialEdges: Edge[] = isSuccess && workflow ? JSON.parse(workflow.edges) : []

  // Get selected node info
  const selectedNode = selectedNodeId ? initialNodes.find((n) => n.id === selectedNodeId) : null
  const selectedNodeType = selectedNode?.data?.type as string | undefined

  // Handle node selection
  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId)
    if (nodeId) {
      const node = initialNodes.find((n) => n.id === nodeId)
      if (node?.data?.type === 'youtube') {
        setConfigSheetOpen(true)
      } else if (node?.data?.type === 'pdf') {
        setPdfSheetOpen(true)
      } else if (node?.data?.type === 'summarizer') {
        setSummarizerSheetOpen(true)
      } else if (node?.data?.type === 'text-improver') {
        setImproverSheetOpen(true)
      } else if (node?.data?.type === 'concept-extractor') {
        setConceptExtractorSheetOpen(true)
      } else if (node?.data?.type === 'web-search') {
        setWebSearchSheetOpen(true)
      }
    }
  }

  // Handle workflow execution
  const handleStartWorkflow = async () => {
    try {
      // Find all YouTube nodes with configurations
      const youtubeNodes = initialNodes.filter((node) => node.data?.type === 'youtube')

      if (youtubeNodes.length === 0) {
        toast.error('Add at least one YouTube node to execute the workflow')
        return
      }

      // Check if all YouTube nodes have configurations
      const unconfiguredNodes = youtubeNodes.filter((node) => {
        const config = nodeConfigs?.[node.id]
        return !config || !config.urls || config.urls.length === 0
      })

      if (unconfiguredNodes.length > 0) {
        toast.error('Please configure all YouTube nodes before starting')
        return
      }

      // Find the start node and mark it as completed
      const startNode = initialNodes.find((node) => node.data?.type === 'start')
      if (startNode) {
        await updateNodeExecution({
          workflowId,
          nodeId: startNode.id,
          status: 'completed',
        })
      }

      toast.success('Workflow started! Watch the nodes for progress.')

      // Trigger each YouTube node
      for (const node of youtubeNodes) {
        const config = nodeConfigs?.[node.id]
        if (!config) continue

        // Call trigger.dev task
        await fetch('/api/trigger-youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowId,
            nodeId: node.id,
            urls: config.urls,
          }),
        })
      }
    } catch (error) {
      console.error('Failed to start workflow:', error)
      toast.error('Failed to start workflow')
    }
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div className="w-1/5 max-w-[350px] min-w-[250px]">
          <WorkflowSidebar />
        </div>

        <div className="flex flex-1 flex-col">
          {/* Title editor header */}
          <div className="border-border flex items-center justify-between border-b px-6 py-3">
            <WorkflowTitleEditor workflowId={workflowId} />
            <Button className="gap-2 bg-green-600 text-white hover:bg-green-700" onClick={handleStartWorkflow}>
              <Play className="h-4 w-4" />
              Start Workflow
            </Button>
          </div>

          {/* Canvas */}
          <div className="flex-1">
            <WorkflowCanvas
              workflowId={workflowId}
              userId={userId}
              initialNodes={initialNodes}
              initialEdges={initialEdges}
              selectedNodeId={selectedNodeId}
              onSelectedNodeChange={handleNodeSelect}
            />
          </div>
        </div>

        {/* Configuration sheets */}
        {selectedNodeType === 'youtube' && selectedNodeId && (
          <YouTubeConfigSheet
            open={configSheetOpen}
            onOpenChange={setConfigSheetOpen}
            workflowId={workflowId}
            nodeId={selectedNodeId}
            initialConfig={nodeConfigs?.[selectedNodeId]}
          />
        )}
        {selectedNodeType === 'pdf' && selectedNodeId && (
          <PDFConfigSheet
            open={pdfSheetOpen}
            onOpenChange={setPdfSheetOpen}
            workflowId={workflowId}
            nodeId={selectedNodeId}
            initialConfig={nodeConfigs?.[selectedNodeId]}
          />
        )}
        {selectedNodeType === 'summarizer' && selectedNodeId && (
          <TextSummarizerSheet
            open={summarizerSheetOpen}
            onOpenChange={setSummarizerSheetOpen}
            workflowId={workflowId}
            nodeId={selectedNodeId}
          />
        )}
        {selectedNodeType === 'text-improver' && selectedNodeId && (
          <TextImproverSheet
            open={improverSheetOpen}
            onOpenChange={setImproverSheetOpen}
            workflowId={workflowId}
            nodeId={selectedNodeId}
            initialConfig={nodeConfigs?.[selectedNodeId]}
          />
        )}
        {selectedNodeType === 'concept-extractor' && selectedNodeId && (
          <ConceptExtractorSheet
            open={conceptExtractorSheetOpen}
            onOpenChange={setConceptExtractorSheetOpen}
            workflowId={workflowId}
            nodeId={selectedNodeId}
          />
        )}
        {selectedNodeType === 'web-search' && selectedNodeId && (
          <WebSearchSheet
            open={webSearchSheetOpen}
            onOpenChange={setWebSearchSheetOpen}
            workflowId={workflowId}
            nodeId={selectedNodeId}
            initialConfig={nodeConfigs?.[selectedNodeId]}
          />
        )}
      </div>
    </ReactFlowProvider>
  )
}
