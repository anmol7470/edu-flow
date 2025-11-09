'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'
import { useMutation, useQuery } from 'convex/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

type NodeOutput = {
  improvedText: string
  originalText: string
  originalLength: number
  improvedLength: number
  usedCustomPrompt: boolean
  timestamp: number
}

type TextImproverSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
  initialConfig?: { customPrompt?: string }
}

export function TextImproverSheet({ open, onOpenChange, workflowId, nodeId, initialConfig }: TextImproverSheetProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'output'>('config')
  const [customPrompt, setCustomPrompt] = useState('')

  const nodeExecution = useQuery(api.nodeExecutions.getNodeExecution, { workflowId, nodeId })
  const saveNodeConfig = useMutation(api.nodeExecutions.saveNodeConfig)

  const hasOutput = nodeExecution?.status === 'completed' && nodeExecution?.output
  const output = hasOutput ? (nodeExecution.output as NodeOutput) : null

  // Load initial config
  useEffect(() => {
    if (initialConfig?.customPrompt) {
      setCustomPrompt(initialConfig.customPrompt)
    }
  }, [initialConfig])

  // Auto-switch to output tab when output becomes available
  useEffect(() => {
    if (open && hasOutput && activeTab === 'config') {
      setActiveTab('output')
    }
  }, [open, hasOutput, activeTab])

  const handleSaveConfig = async () => {
    try {
      await saveNodeConfig({
        workflowId,
        nodeId,
        config: JSON.stringify({ customPrompt: customPrompt.trim() }),
      })
      toast.success('Custom prompt saved!')
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error(error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-4 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Text Improver</SheetTitle>
          <SheetDescription>Configure custom prompt or view improved text output.</SheetDescription>
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
                  <Sparkles className="h-4 w-4 text-yellow-600" />
                  <h3 className="text-sm font-semibold">Custom Prompt (Optional)</h3>
                </div>
                <p className="text-muted-foreground mb-3 text-xs">
                  Provide specific instructions for how you want the text to be improved. If left empty, a default
                  improvement prompt will be used.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="custom-prompt" className="text-sm">
                    Custom Instructions
                  </Label>
                  <textarea
                    id="custom-prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Example: Make the text more formal and academic..."
                    className="bg-background placeholder:text-muted-foreground focus:ring-ring min-h-[150px] w-full rounded-md border p-3 text-sm focus:ring-2 focus:outline-none"
                  />
                  <Button onClick={handleSaveConfig} className="w-full">
                    Save Custom Prompt
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/50">
                <h4 className="mb-2 text-sm font-semibold">Default Behavior</h4>
                <p className="text-muted-foreground text-xs">
                  If no custom prompt is set, the AI will improve the text by fixing grammar, enhancing clarity,
                  improving sentence structure, and making it more professional and polished.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'output' && output && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Original</div>
                  <div className="text-2xl font-bold">{output.originalLength.toLocaleString()}</div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Improved</div>
                  <div className="text-2xl font-bold">{output.improvedLength.toLocaleString()}</div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Prompt Type</div>
                  <div className="text-xs font-medium">{output.usedCustomPrompt ? 'Custom' : 'Default'}</div>
                </div>
              </div>

              {/* Before/After Comparison */}
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Original Text</h3>
                  <div className="bg-muted/30 max-h-[200px] overflow-y-auto rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {output.originalText}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-green-600" />
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Improved Text</h3>
                  <div className="max-h-[300px] overflow-y-auto rounded-lg border bg-green-50 p-4 dark:bg-green-950/30">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{output.improvedText}</p>
                  </div>
                </div>
              </div>

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
