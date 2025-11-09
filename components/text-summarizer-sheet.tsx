'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { FileText } from 'lucide-react'

type NodeOutput = {
  summary: string
  originalLength: number
  summaryLength: number
  timestamp: number
}

type TextSummarizerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
}

export function TextSummarizerSheet({ open, onOpenChange, workflowId, nodeId }: TextSummarizerSheetProps) {
  const nodeExecution = useQuery(api.nodeExecutions.getNodeExecution, { workflowId, nodeId })

  const hasOutput = nodeExecution?.status === 'completed' && nodeExecution?.output
  const output = hasOutput ? (nodeExecution.output as NodeOutput) : null

  if (!output) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col p-4 sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Text Summarizer</SheetTitle>
            <SheetDescription>No output available yet</SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex flex-1 items-center justify-center text-muted-foreground text-sm">
            Run the workflow to generate a summary
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const compressionRatio = ((1 - output.summaryLength / output.originalLength) * 100).toFixed(1)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-4 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Text Summarizer</SheetTitle>
          <SheetDescription>Generated summary</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto">
          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Original</div>
              <div className="text-lg font-bold">{output.originalLength.toLocaleString()}</div>
              <div className="text-muted-foreground text-xs">chars</div>
            </div>
            <div className="bg-muted/50 rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Summary</div>
              <div className="text-lg font-bold">{output.summaryLength.toLocaleString()}</div>
              <div className="text-muted-foreground text-xs">chars</div>
            </div>
            <div className="bg-muted/50 rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Compressed</div>
              <div className="text-lg font-bold">{compressionRatio}%</div>
              <div className="text-muted-foreground text-xs">less</div>
            </div>
          </div>

          {/* Summary Section */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Summary</h3>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{output.summary}</p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-muted-foreground text-xs">
            Completed: {new Date(output.timestamp).toLocaleString()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

