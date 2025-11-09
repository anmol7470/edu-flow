'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'
import { useMutation, useQuery } from 'convex/react'
import { Calendar, ExternalLink, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

type SearchSource = {
  uri: string
  title?: string
}

type NodeOutput = {
  studyPlan: string
  topic: string
  duration: string
  learningStyle: string
  goals: string
  currentLevel: string
  sources: SearchSource[]
  sourceCount: number
  timestamp: number
}

type StudyPlanSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
  initialConfig?: {
    topic?: string
    duration?: string
    learningStyle?: string
    goals?: string
    currentLevel?: string
  }
}

export function StudyPlanSheet({ open, onOpenChange, workflowId, nodeId, initialConfig }: StudyPlanSheetProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'output'>('config')
  const [topic, setTopic] = useState(initialConfig?.topic || '')
  const [duration, setDuration] = useState(initialConfig?.duration || '4 weeks')
  const [learningStyle, setLearningStyle] = useState(initialConfig?.learningStyle || 'Visual')
  const [goals, setGoals] = useState(initialConfig?.goals || '')
  const [currentLevel, setCurrentLevel] = useState(initialConfig?.currentLevel || 'Beginner')

  const nodeExecution = useQuery(api.nodeExecutions.getNodeExecution, { workflowId, nodeId })
  const saveNodeConfig = useMutation(api.nodeExecutions.saveNodeConfig)

  const hasOutput = nodeExecution?.status === 'completed' && nodeExecution?.output
  const output = hasOutput ? (nodeExecution.output as NodeOutput) : null

  // Load initial config
  useEffect(() => {
    if (initialConfig) {
      if (initialConfig.topic) setTopic(initialConfig.topic)
      if (initialConfig.duration) setDuration(initialConfig.duration)
      if (initialConfig.learningStyle) setLearningStyle(initialConfig.learningStyle)
      if (initialConfig.goals) setGoals(initialConfig.goals)
      if (initialConfig.currentLevel) setCurrentLevel(initialConfig.currentLevel)
    }
  }, [initialConfig])

  // Auto-switch to output tab when output becomes available
  useEffect(() => {
    if (open && hasOutput && activeTab === 'config') {
      setActiveTab('output')
    }
  }, [open, hasOutput, activeTab])

  const handleSaveConfig = async () => {
    if (!topic.trim() || !goals.trim()) {
      toast.error('Topic and goals are required')
      return
    }

    try {
      await saveNodeConfig({
        workflowId,
        nodeId,
        config: JSON.stringify({
          topic: topic.trim(),
          duration,
          learningStyle,
          goals: goals.trim(),
          currentLevel,
        }),
      })
      toast.success('Study plan configuration saved!')
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error(error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-4 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Study Plan Generator</SheetTitle>
          <SheetDescription>Create a personalized study plan or view generated plan.</SheetDescription>
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
                <div className="mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-violet-600" />
                  <h3 className="text-sm font-semibold">Learning Parameters</h3>
                </div>

                <div className="space-y-4">
                  {/* Topic */}
                  <div className="space-y-2">
                    <Label htmlFor="topic" className="text-sm">
                      Topic / Subject <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Python Programming, Machine Learning, Web Development"
                      className="w-full"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-sm">
                      Duration
                    </Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger id="duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2 weeks">2 weeks</SelectItem>
                        <SelectItem value="4 weeks">4 weeks (1 month)</SelectItem>
                        <SelectItem value="8 weeks">8 weeks (2 months)</SelectItem>
                        <SelectItem value="12 weeks">12 weeks (3 months)</SelectItem>
                        <SelectItem value="6 months">6 months</SelectItem>
                        <SelectItem value="1 year">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Current Level */}
                  <div className="space-y-2">
                    <Label htmlFor="currentLevel" className="text-sm">
                      Current Level
                    </Label>
                    <Select value={currentLevel} onValueChange={setCurrentLevel}>
                      <SelectTrigger id="currentLevel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner (No prior experience)</SelectItem>
                        <SelectItem value="Intermediate">Intermediate (Some experience)</SelectItem>
                        <SelectItem value="Advanced">Advanced (Proficient)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Learning Style */}
                  <div className="space-y-2">
                    <Label htmlFor="learningStyle" className="text-sm">
                      Learning Style
                    </Label>
                    <Select value={learningStyle} onValueChange={setLearningStyle}>
                      <SelectTrigger id="learningStyle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Visual">Visual (diagrams, videos)</SelectItem>
                        <SelectItem value="Auditory">Auditory (lectures, podcasts)</SelectItem>
                        <SelectItem value="Reading/Writing">Reading/Writing (books, articles)</SelectItem>
                        <SelectItem value="Kinesthetic">Kinesthetic (hands-on, projects)</SelectItem>
                        <SelectItem value="Mixed">Mixed (combination)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Goals */}
                  <div className="space-y-2">
                    <Label htmlFor="goals" className="text-sm">
                      Learning Goals <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="goals"
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      placeholder="e.g., Build a portfolio website, Get job-ready, Pass certification exam"
                      className="bg-background placeholder:text-muted-foreground focus:ring-ring min-h-[80px] w-full rounded-md border p-3 text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>

                  <Button onClick={handleSaveConfig} disabled={!topic.trim() || !goals.trim()} className="w-full">
                    Save Configuration
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/50">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <h4 className="text-sm font-semibold">AI-Powered Planning</h4>
                </div>
                <p className="text-muted-foreground text-xs">
                  The AI will search for current best practices, recommended resources, and create a customized
                  week-by-week study plan tailored to your learning style and goals.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'output' && output && (
            <div className="space-y-6">
              {/* Configuration Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Duration</div>
                  <div className="text-sm font-semibold">{output.duration}</div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Level</div>
                  <div className="text-sm font-semibold">{output.currentLevel}</div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Style</div>
                  <div className="text-sm font-semibold">{output.learningStyle}</div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Resources</div>
                  <div className="text-sm font-semibold">{output.sourceCount} sources</div>
                </div>
              </div>

              {/* Study Plan */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Your Personalized Study Plan</h3>
                <div className="bg-muted/50 max-h-[400px] overflow-y-auto rounded-lg border p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{output.studyPlan}</p>
                </div>
              </div>

              {/* Resources */}
              {output.sources.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Recommended Resources ({output.sourceCount})</h3>
                  <div className="space-y-2">
                    {output.sources.map((source, index) => (
                      <a
                        key={index}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-muted/30 hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-3 transition-colors"
                      >
                        <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-600" />
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
                Generated: {new Date(output.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
