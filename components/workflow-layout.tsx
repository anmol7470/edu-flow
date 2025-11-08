'use client'

import { Button } from '@/components/ui/button'
import { WorkflowCanvas } from '@/components/workflow-canvas'
import { WorkflowSidebar } from '@/components/workflow-sidebar'
import { WorkflowTitleEditor } from '@/components/workflow-title-editor'
import { api } from '@/convex/_generated/api'
import type { WorkflowLayoutProps } from '@/lib/types'
import { useQueryWithStatus } from '@/lib/utils'
import type { Edge, Node } from '@xyflow/react'
import { ReactFlowProvider } from '@xyflow/react'
import { Play } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function WorkflowLayout({ workflowId, userId }: WorkflowLayoutProps) {
  const router = useRouter()

  const {
    data: workflow,
    isSuccess,
    isPending,
    isError,
  } = useQueryWithStatus(api.workflows.getWorkflow, { workflowId })

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
          <Play className="h-12 w-12 animate-spin text-primary" />
          <div className="text-muted-foreground text-lg">Loading workflow...</div>
        </div>
      </div>
    )
  }

  // Parse nodes and edges
  const initialNodes: Node[] = isSuccess && workflow ? JSON.parse(workflow.nodes) : []
  const initialEdges: Edge[] = isSuccess && workflow ? JSON.parse(workflow.edges) : []

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div className="w-1/5 max-w-[350px] min-w-[250px]">
          <WorkflowSidebar />
        </div>

        <div className="flex flex-1 flex-col">
          {/* Title editor header */}
          <div className="border-border flex items-center justify-between border-b px-6 py-4">
            <WorkflowTitleEditor workflowId={workflowId} />
            <Button
              className="gap-2 bg-green-600 text-white hover:bg-green-700"
              onClick={() => {
                // TODO: Implement workflow execution
                console.log('Start workflow')
              }}
            >
              <Play className="h-4 w-4" />
              Start
            </Button>
          </div>

          {/* Canvas */}
          <div className="flex-1">
            <WorkflowCanvas
              workflowId={workflowId}
              userId={userId}
              initialNodes={initialNodes}
              initialEdges={initialEdges}
            />
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  )
}
