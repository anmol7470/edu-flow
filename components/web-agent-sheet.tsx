'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'
import { useMutation, useQuery } from 'convex/react'
import { Bot, Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

type NodeOutput = {
  response: string | null
  stepsExecuted: number
  sessionId?: string
  actId?: string
  parsedResponse?: any
  validJson?: boolean
  startingPage: string
  instructions: string
  timestamp: number
}

type WebAgentSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
  initialConfig?: { startingPage?: string; instructions?: string }
}

export function WebAgentSheet({ open, onOpenChange, workflowId, nodeId, initialConfig }: WebAgentSheetProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'output'>('config')
  const [startingPage, setStartingPage] = useState('https://')
  const [instructions, setInstructions] = useState('')

  const nodeExecution = useQuery(api.nodeExecutions.getNodeExecution, { workflowId, nodeId })
  const saveNodeConfig = useMutation(api.nodeExecutions.saveNodeConfig)

  const hasOutput = nodeExecution?.status === 'completed' && nodeExecution?.output
  const output = hasOutput ? (nodeExecution.output as NodeOutput) : null

  // Load initial config
  useEffect(() => {
    if (initialConfig?.startingPage) {
      setStartingPage(initialConfig.startingPage)
    }
    if (initialConfig?.instructions) {
      setInstructions(initialConfig.instructions)
    }
  }, [initialConfig])

  // Auto-switch to output tab when output becomes available
  useEffect(() => {
    if (open && hasOutput && activeTab === 'config') {
      setActiveTab('output')
    }
  }, [open, hasOutput, activeTab])

  const handleSaveConfig = async () => {
    if (!startingPage.trim()) {
      toast.error('Starting page URL is required')
      return
    }
    if (!instructions.trim()) {
      toast.error('Instructions are required')
      return
    }

    try {
      await saveNodeConfig({
        workflowId,
        nodeId,
        config: JSON.stringify({
          startingPage: startingPage.trim(),
          instructions: instructions.trim(),
          headless: true, // Always run in headless mode
        }),
      })
      toast.success('Web agent configuration saved!')
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error(error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-4 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            Web Agent (Nova Act)
          </SheetTitle>
          <SheetDescription>Configure browser automation or view execution results.</SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        <div className="mt-4 flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('config')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'config'
                ? 'border-primary text-primary border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('output')}
            disabled={!hasOutput}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'output'
                ? 'border-primary text-primary border-b-2'
                : 'text-muted-foreground hover:text-foreground',
              !hasOutput && 'cursor-not-allowed opacity-50'
            )}
          >
            Output {hasOutput && '✓'}
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold">Starting Page (Required)</h3>
                </div>
                <p className="text-muted-foreground mb-3 text-xs">
                  The URL where the browser agent should start its actions.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="starting-page" className="text-sm">
                    URL
                  </Label>
                  <input
                    id="starting-page"
                    type="url"
                    value={startingPage}
                    onChange={(e) => setStartingPage(e.target.value)}
                    placeholder="https://example.com"
                    className="bg-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border p-3 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold">Instructions (Required)</h3>
                </div>
                <p className="text-muted-foreground mb-3 text-xs">
                  Natural language instructions describing what the agent should do on the webpage.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="instructions" className="text-sm">
                    What should the agent do?
                  </Label>
                  <textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Example: Click the search button, type 'artificial intelligence', and return the first three results."
                    className="bg-background placeholder:text-muted-foreground focus:ring-ring min-h-[150px] w-full rounded-md border p-3 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveConfig}
                disabled={!startingPage.trim() || !instructions.trim()}
                className="w-full"
              >
                Save Configuration
              </Button>

              <div className="rounded-lg border bg-purple-50 p-4 dark:bg-purple-950/50">
                <h4 className="mb-2 text-sm font-semibold">About Amazon Nova Act</h4>
                <p className="text-muted-foreground mb-2 text-xs">
                  This node uses Amazon Nova Act, an AI agent that can interact with web browsers. It can click buttons,
                  fill forms, navigate pages, and extract information - all through natural language instructions.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'output' && output && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Steps Executed</div>
                  <div className="text-2xl font-bold">{output.stepsExecuted}</div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Status</div>
                  <div className="text-sm font-semibold text-green-600">✓ Completed</div>
                </div>
              </div>

              {/* Session Info */}
              {output.sessionId && (
                <div className="bg-muted/30 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Session ID</div>
                  <div className="font-mono text-xs">{output.sessionId}</div>
                </div>
              )}

              {/* Original Instructions */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Starting Page</h3>
                <div className="bg-muted/30 rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm">{output.startingPage}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Instructions</h3>
                <div className="bg-muted/30 rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">{output.instructions}</p>
                </div>
              </div>

              {/* Agent Response */}
              {output.response && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Agent Response</h3>
                  <div className="bg-muted/50 max-h-[300px] overflow-y-auto rounded-lg border p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{output.response}</p>
                  </div>
                </div>
              )}

              {/* Parsed Response (if JSON) */}
              {output.parsedResponse && output.validJson && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Structured Data</h3>
                  <div className="bg-muted/50 max-h-[300px] overflow-y-auto rounded-lg border p-4">
                    <pre className="text-xs">{JSON.stringify(output.parsedResponse, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-muted-foreground text-xs">
                Completed: {new Date(output.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
