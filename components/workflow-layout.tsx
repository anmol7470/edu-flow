'use client'

import { ConceptExtractorSheet } from '@/components/concept-extractor-sheet'
import { EssayGraderSheet } from '@/components/essay-grader-sheet'
import { FactCheckerSheet } from '@/components/fact-checker-sheet'
import { PDFConfigSheet } from '@/components/pdf-config-sheet'
import { StudyPlanSheet } from '@/components/study-plan-sheet'
import { TextImproverSheet } from '@/components/text-improver-sheet'
import { TextSummarizerSheet } from '@/components/text-summarizer-sheet'
import { Button } from '@/components/ui/button'
import { WebAgentSheet } from '@/components/web-agent-sheet'
import { WebSearchSheet } from '@/components/web-search-sheet'
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
import { Play, RotateCcw, Square } from 'lucide-react'
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
  const [factCheckerSheetOpen, setFactCheckerSheetOpen] = useState(false)
  const [essayGraderSheetOpen, setEssayGraderSheetOpen] = useState(false)
  const [studyPlanSheetOpen, setStudyPlanSheetOpen] = useState(false)
  const [webAgentSheetOpen, setWebAgentSheetOpen] = useState(false)

  const {
    data: workflow,
    isSuccess,
    isPending,
    isError,
  } = useQueryWithStatus(api.workflows.getWorkflow, { workflowId })

  const nodeConfigs = useQuery(api.nodeExecutions.getNodeConfigs, { workflowId })
  const nodeExecutions = useQuery(api.nodeExecutions.getNodeExecutions, { workflowId })

  const stopWorkflow = useMutation(api.workflowEngine.stopWorkflowExecution)
  const resetWorkflow = useMutation(api.workflowEngine.resetWorkflowExecution)

  // Check if workflow is running
  const isWorkflowRunning =
    nodeExecutions && Object.values(nodeExecutions).some((exec: any) => exec.status === 'running')

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

  // Check if workflow completed successfully
  // All non-start nodes must be completed successfully
  const isWorkflowCompleted =
    nodeExecutions &&
    initialNodes.length > 1 &&
    initialNodes
      .filter((node) => node.data?.type !== 'start')
      .every((node) => {
        const exec = nodeExecutions[node.id]
        return exec && exec.status === 'completed'
      }) &&
    Object.keys(nodeExecutions).length > 1

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
      } else if (node?.data?.type === 'fact-check') {
        setFactCheckerSheetOpen(true)
      } else if (node?.data?.type === 'essay-grader') {
        setEssayGraderSheetOpen(true)
      } else if (node?.data?.type === 'study-plan') {
        setStudyPlanSheetOpen(true)
      } else if (node?.data?.type === 'web-browser-agent') {
        setWebAgentSheetOpen(true)
      }
    }
  }

  // Handle workflow execution
  const handleStartWorkflow = async () => {
    try {
      const loadingToast = toast.loading('Validating workflow...')

      // Call the workflow execution engine
      const result = await fetch('/api/start-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          nodes: JSON.stringify(initialNodes),
          edges: JSON.stringify(initialEdges),
          nodeConfigs,
        }),
      })

      const data = await result.json()

      toast.dismiss(loadingToast)

      if (!result.ok || !data.success) {
        // Show validation errors
        if (data.validationErrors) {
          data.validationErrors.forEach((error: string) => {
            toast.error(error, { duration: 5000 })
          })
        } else if (data.configErrors) {
          toast.error('Configuration errors found:', { duration: 5000 })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.configErrors.forEach((error: any) => {
            toast.error(`${error.label}: ${error.missingFields.join(', ')}`, { duration: 5000 })
          })
        } else {
          toast.error(data.message || 'Failed to start workflow')
        }
        return
      }

      // Success!
      toast.success(data.message || 'Workflow started!')
    } catch (error) {
      console.error('Failed to start workflow:', error)
      toast.error('Failed to start workflow')
    }
  }

  // Handle workflow stop
  const handleStopWorkflow = async () => {
    try {
      const loadingToast = toast.loading('Stopping workflow...')
      const result = await stopWorkflow({ workflowId })
      toast.dismiss(loadingToast)
      toast.success(result.message || 'Workflow stopped!')
    } catch (error) {
      console.error('Failed to stop workflow:', error)
      toast.error('Failed to stop workflow')
    }
  }

  // Handle workflow reset
  const handleResetWorkflow = async () => {
    try {
      const loadingToast = toast.loading('Resetting workflow...')
      const result = await resetWorkflow({ workflowId })
      toast.dismiss(loadingToast)
      toast.success(result.message || 'Workflow reset successfully!')
    } catch (error) {
      console.error('Failed to reset workflow:', error)
      toast.error('Failed to reset workflow')
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
            <div className="flex items-center gap-2">
              {isWorkflowCompleted && !isWorkflowRunning && (
                <Button
                  variant="outline"
                  className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
                  onClick={handleResetWorkflow}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
              {isWorkflowRunning ? (
                <Button className="gap-2 bg-red-600 text-white hover:bg-red-700" onClick={handleStopWorkflow}>
                  <Square className="h-4 w-4" />
                  Stop Workflow
                </Button>
              ) : (
                <Button className="gap-2 bg-green-600 text-white hover:bg-green-700" onClick={handleStartWorkflow}>
                  <Play className="h-4 w-4" />
                  Start Workflow
                </Button>
              )}
            </div>
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
        {selectedNodeType === 'fact-check' && selectedNodeId && (
          <FactCheckerSheet
            open={factCheckerSheetOpen}
            onOpenChange={setFactCheckerSheetOpen}
            workflowId={workflowId}
            nodeId={selectedNodeId}
          />
        )}
        {selectedNodeType === 'essay-grader' && selectedNodeId && (
          <EssayGraderSheet
            open={essayGraderSheetOpen}
            onOpenChange={setEssayGraderSheetOpen}
            workflowId={workflowId}
            nodeId={selectedNodeId}
            initialConfig={nodeConfigs?.[selectedNodeId]}
          />
        )}
        {selectedNodeType === 'study-plan' && selectedNodeId && (
          <StudyPlanSheet
            open={studyPlanSheetOpen}
            onOpenChange={setStudyPlanSheetOpen}
            workflowId={workflowId}
            nodeId={selectedNodeId}
            initialConfig={nodeConfigs?.[selectedNodeId]}
          />
        )}
        {selectedNodeType === 'web-browser-agent' && selectedNodeId && (
          <WebAgentSheet
            open={webAgentSheetOpen}
            onOpenChange={setWebAgentSheetOpen}
            workflowId={workflowId}
            nodeId={selectedNodeId}
            initialConfig={nodeConfigs?.[selectedNodeId]}
          />
        )}
      </div>
    </ReactFlowProvider>
  )
}
