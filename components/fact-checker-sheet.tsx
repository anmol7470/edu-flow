'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { CheckCircle, ExternalLink, XCircle } from 'lucide-react'
import { useEffect } from 'react'

type SearchSource = {
  uri: string
  title?: string
}

type FactCheckResult = {
  topic: string
  claim: string
  verification: string
  isAccurate: boolean
}

type NodeOutput = {
  originalText: string
  claimsChecked: number
  results: FactCheckResult[]
  sources: SearchSource[]
  sourceCount: number
  timestamp: number
}

type FactCheckerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
}

export function FactCheckerSheet({ open, onOpenChange, workflowId, nodeId }: FactCheckerSheetProps) {
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

  const accurateCount = output.results.filter((r) => r.isAccurate).length
  const inaccurateCount = output.results.length - accurateCount

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-4 sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Fact Checker Results</SheetTitle>
          <SheetDescription>Verified claims using web search and AI analysis.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto">
          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Claims Checked</div>
              <div className="text-2xl font-bold">{output.claimsChecked}</div>
            </div>
            <div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950/30">
              <div className="text-muted-foreground text-xs">Accurate</div>
              <div className="text-2xl font-bold text-green-600">{accurateCount}</div>
            </div>
            <div className="rounded-lg border bg-red-50 p-3 dark:bg-red-950/30">
              <div className="text-muted-foreground text-xs">Questionable</div>
              <div className="text-2xl font-bold text-red-600">{inaccurateCount}</div>
            </div>
          </div>

          {/* Fact Check Results */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Fact Check Results</h3>
            <div className="space-y-4">
              {output.results.map((result, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-4 ${
                    result.isAccurate
                      ? 'border-green-200 bg-green-50 dark:bg-green-950/20'
                      : 'border-red-200 bg-red-50 dark:bg-red-950/20'
                  }`}
                >
                  <div className="mb-2 flex items-start gap-2">
                    {result.isAccurate ? (
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    )}
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold">{result.topic}</h4>
                      <p className="text-muted-foreground mt-1 text-sm italic">&quot;{result.claim}&quot;</p>
                    </div>
                  </div>
                  <div className="mt-2 ml-7">
                    <p className="text-sm leading-relaxed">{result.verification}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sources */}
          {output.sources.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Sources ({output.sourceCount})</h3>
              <div className="space-y-2">
                {output.sources.map((source, index) => (
                  <a
                    key={index}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-muted/30 hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-3 transition-colors"
                  >
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-lime-600" />
                    <div className="min-w-0 flex-1">
                      {source.title && <p className="text-sm font-medium">{source.title}</p>}
                      <p className="text-muted-foreground truncate text-xs">{source.uri}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-muted-foreground text-xs">Completed: {new Date(output.timestamp).toLocaleString()}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
