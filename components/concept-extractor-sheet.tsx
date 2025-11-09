'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { useEffect } from 'react'

type NodeOutput = {
  concepts: string
  sourceTextLength: number
  conceptsLength: number
  timestamp: number
}

type ConceptExtractorSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
}

export function ConceptExtractorSheet({ open, onOpenChange, workflowId, nodeId }: ConceptExtractorSheetProps) {
  const nodeExecution = useQuery(api.nodeExecutions.getNodeExecution, { workflowId, nodeId })
  const hasOutput = nodeExecution?.status === 'completed' && nodeExecution?.output
  const output = hasOutput ? (nodeExecution.output as NodeOutput) : null

  // Auto-close if no output when sheet opens
  useEffect(() => {
    if (open && !hasOutput) {
      onOpenChange(false)
    }
  }, [open, hasOutput, onOpenChange])

  if (!output) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-4 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Concept Extractor Results</SheetTitle>
          <SheetDescription>Key concepts identified from the text using Gemini 2.5 Flash.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto">
          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Source Length</div>
              <div className="text-2xl font-bold">{output.sourceTextLength.toLocaleString()}</div>
            </div>
            <div className="bg-muted/50 rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Concepts Length</div>
              <div className="text-2xl font-bold">{output.conceptsLength.toLocaleString()}</div>
            </div>
          </div>

          {/* Concepts Section */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Extracted Concepts</h3>
            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{output.concepts}</p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-muted-foreground text-xs">Completed: {new Date(output.timestamp).toLocaleString()}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
