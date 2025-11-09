'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'
import { useMutation, useQuery } from 'convex/react'
import { ExternalLink, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

type SearchSource = {
  uri: string
  title?: string
}

type NodeOutput = {
  generatedText: string
  sources: SearchSource[]
  sourceCount: number
  prompt: string
  timestamp: number
}

type WebSearchSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
  initialConfig?: { prompt?: string }
}

export function WebSearchSheet({ open, onOpenChange, workflowId, nodeId, initialConfig }: WebSearchSheetProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'output'>('config')
  const [prompt, setPrompt] = useState('')

  const nodeExecution = useQuery(api.nodeExecutions.getNodeExecution, { workflowId, nodeId })
  const saveNodeConfig = useMutation(api.nodeExecutions.saveNodeConfig)

  const hasOutput = nodeExecution?.status === 'completed' && nodeExecution?.output
  const output = hasOutput ? (nodeExecution.output as NodeOutput) : null

  // Load initial config - reset prompt when nodeId changes
  useEffect(() => {
    setPrompt(initialConfig?.prompt || '')
  }, [nodeId, initialConfig?.prompt])

  // Auto-switch to output tab when output becomes available
  useEffect(() => {
    if (open && hasOutput && activeTab === 'config') {
      setActiveTab('output')
    }
  }, [open, hasOutput, activeTab])

  const handleSaveConfig = async () => {
    if (!prompt.trim()) {
      toast.error('Search prompt is required')
      return
    }

    try {
      await saveNodeConfig({
        workflowId,
        nodeId,
        config: JSON.stringify({ prompt: prompt.trim() }),
      })
      toast.success('Search prompt saved!')
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error(error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-4 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Web Search</SheetTitle>
          <SheetDescription>Configure search prompt or view search results.</SheetDescription>
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
                  <Search className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-semibold">Search Prompt (Required)</h3>
                </div>
                <p className="text-muted-foreground mb-3 text-xs">
                  Enter a search query or question. The AI will search the web and provide an answer with sources.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="search-prompt" className="text-sm">
                    Search Query
                  </Label>
                  <textarea
                    id="search-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Example: What are the latest developments in AI technology?"
                    className="bg-background placeholder:text-muted-foreground focus:ring-ring min-h-[120px] w-full rounded-md border p-3 text-sm focus:ring-2 focus:outline-none"
                  />
                  <Button onClick={handleSaveConfig} disabled={!prompt.trim()} className="w-full">
                    Save Search Prompt
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/50">
                <h4 className="mb-2 text-sm font-semibold">How It Works</h4>
                <p className="text-muted-foreground text-xs">
                  This node uses Google's Gemini 2.5 Flash with web search capabilities. It will search the internet,
                  analyze results, and provide a comprehensive answer with source citations.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'output' && output && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Sources Found</div>
                  <div className="text-2xl font-bold">{output.sourceCount}</div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Response Length</div>
                  <div className="text-2xl font-bold">{output.generatedText.length.toLocaleString()}</div>
                </div>
              </div>

              {/* Original Prompt */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Search Query</h3>
                <div className="bg-muted/30 rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm">{output.prompt}</p>
                </div>
              </div>

              {/* Generated Text */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Search Results</h3>
                <div className="bg-muted/50 max-h-[300px] overflow-y-auto rounded-lg border p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{output.generatedText}</p>
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
                        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
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
