'use client'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/convex/_generated/api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from 'convex/react'
import { CheckCircle2, ExternalLink, Loader2, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

const youtubeUrlSchema = z
  .url({ message: 'Must be a valid URL' })
  .refine((url) => url.includes('youtube.com') || url.includes('youtu.be'), {
    message: 'Must be a YouTube URL',
  })

const formSchema = z.object({
  url1: youtubeUrlSchema,
  url2: z.string().refine(
    (url) => {
      // Allow empty strings
      if (!url || url.trim() === '') return true
      // If not empty, must be a valid URL
      try {
        new URL(url)
        return url.includes('youtube.com') || url.includes('youtu.be')
      } catch {
        return false
      }
    },
    { message: 'Must be a valid YouTube URL or leave empty' }
  ),
})

type FormValues = z.infer<typeof formSchema>

type NodeOutput = {
  videos: Array<{
    title: string
    url: string
    duration: number
    transcript: string
    wordCount: number
  }>
  videoCount: number
  totalWords: number
  timestamp: number
}

type YouTubeConfigSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
  initialConfig?: { urls: string[] }
}

export function YouTubeConfigSheet({ open, onOpenChange, workflowId, nodeId, initialConfig }: YouTubeConfigSheetProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'output'>('config')
  const saveNodeConfig = useMutation(api.nodeExecutions.saveNodeConfig)
  const nodeExecution = useQuery(api.nodeExecutions.getNodeExecution, { workflowId, nodeId })

  const hasOutput = nodeExecution?.status === 'completed' && nodeExecution?.output

  // Auto-switch to output tab when sheet opens and output is available
  useEffect(() => {
    if (open && hasOutput) {
      setActiveTab('output')
    } else if (open && !hasOutput) {
      setActiveTab('config')
    }
  }, [open, hasOutput])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url1: initialConfig?.urls?.[0] || '',
      url2: initialConfig?.urls?.[1] || '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      // Filter out empty URLs
      const urls = [values.url1, values.url2].filter((url) => url && url.trim() !== '')

      const config = {
        urls,
      }

      await saveNodeConfig({
        workflowId,
        nodeId,
        config: JSON.stringify(config),
      })

      toast.success('Configuration saved!')
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error(error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-4 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>YouTube Analyzer</SheetTitle>
          <SheetDescription>
            {hasOutput ? 'View analysis results or update configuration' : 'Configure the YouTube analyzer'}
          </SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        {hasOutput && (
          <div className="mt-4 flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('output')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'output'
                  ? 'border-primary text-primary border-b-2'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Results
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'config'
                  ? 'border-primary text-primary border-b-2'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="h-4 w-4" />
              Configuration
            </button>
          </div>
        )}

        {/* Content */}
        <div className="mt-6 flex-1 overflow-y-auto">
          {activeTab === 'output' && hasOutput ? (
            <OutputView output={nodeExecution.output as NodeOutput} />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="url1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL 1 (Required)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="url2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function OutputView({ output }: { output: NodeOutput }) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-lg border p-3">
          <div className="text-muted-foreground text-xs">Total Videos</div>
          <div className="text-2xl font-bold">{output.videoCount}</div>
        </div>
        <div className="bg-muted/50 rounded-lg border p-3">
          <div className="text-muted-foreground text-xs">Total Words</div>
          <div className="text-2xl font-bold">{output.totalWords.toLocaleString()}</div>
        </div>
      </div>

      {/* Videos Section */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Transcripts</h3>
        <div className="space-y-4">
          {output.videos.map((video, index) => (
            <div key={index} className="bg-card rounded-lg border p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="mb-1 text-sm font-medium">{video.title}</h4>
                  <div className="text-muted-foreground flex items-center gap-3 text-xs">
                    <span>{video.wordCount.toLocaleString()} words</span>
                    {video.duration > 0 && <span>Duration: {formatDuration(video.duration)}</span>}
                  </div>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary mt-1 inline-flex items-center gap-1 text-xs"
                  >
                    Watch video
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="bg-muted/30 max-h-48 overflow-y-auto rounded border p-3">
                <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">{video.transcript}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-muted-foreground text-xs">Completed: {new Date(output.timestamp).toLocaleString()}</div>
    </div>
  )
}
