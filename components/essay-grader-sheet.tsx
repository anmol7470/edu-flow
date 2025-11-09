'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'
import { useMutation, useQuery } from 'convex/react'
import { FileText, GraduationCap, Loader2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

type NodeOutput = {
  overallGrade: string
  feedback: string
  essayLength?: number
  essaySource?: string
  essayPdfUrl?: string
  rubricUsed: string
  timestamp: number
}

type EssayGraderSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
  initialConfig?: {
    rubricType?: 'text' | 'pdf'
    rubricText?: string
    rubricPdfUrl?: string
    rubricPdfName?: string
  }
}

export function EssayGraderSheet({ open, onOpenChange, workflowId, nodeId, initialConfig }: EssayGraderSheetProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'output'>('config')
  const [rubricType, setRubricType] = useState<'text' | 'pdf'>('text')
  const [rubricText, setRubricText] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState('')
  const [uploadedPdfName, setUploadedPdfName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nodeExecution = useQuery(api.nodeExecutions.getNodeExecution, { workflowId, nodeId })
  const saveNodeConfig = useMutation(api.nodeExecutions.saveNodeConfig)
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)
  const getFileUrl = useMutation(api.storage.getFileUrl)

  const hasOutput = nodeExecution?.status === 'completed' && nodeExecution?.output
  const output = hasOutput ? (nodeExecution.output as NodeOutput) : null

  // Load initial config - reset when nodeId changes
  useEffect(() => {
    setRubricType(initialConfig?.rubricType || 'text')
    setRubricText(initialConfig?.rubricText || '')
    setUploadedPdfUrl(initialConfig?.rubricPdfUrl || '')
    setUploadedPdfName(initialConfig?.rubricPdfName || '')
    setPdfFile(null)
  }, [
    nodeId,
    initialConfig?.rubricType,
    initialConfig?.rubricText,
    initialConfig?.rubricPdfUrl,
    initialConfig?.rubricPdfName,
  ])

  // Auto-switch to output tab when output becomes available
  useEffect(() => {
    if (open && hasOutput && activeTab === 'config') {
      setActiveTab('output')
    }
  }, [open, hasOutput, activeTab])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB')
      return
    }

    setPdfFile(file)
  }

  const handleUploadPdf = async () => {
    if (!pdfFile) return

    setIsUploading(true)
    try {
      const postUrl = await generateUploadUrl()
      const result = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': pdfFile.type },
        body: pdfFile,
      })

      if (!result.ok) throw new Error('Failed to upload PDF')

      const { storageId } = await result.json()
      const url = await getFileUrl({ storageId })

      if (!url) throw new Error('Failed to get PDF URL')

      setUploadedPdfUrl(url)
      setUploadedPdfName(pdfFile.name)
      setPdfFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Auto-save the configuration after successful upload
      await saveNodeConfig({
        workflowId,
        nodeId,
        config: JSON.stringify({
          rubricType: 'pdf',
          rubricPdfUrl: url,
          rubricPdfName: pdfFile.name,
        }),
      })

      toast.success('PDF uploaded and saved successfully')
    } catch (error) {
      toast.error('Failed to upload PDF')
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveConfig = async () => {
    if (rubricType === 'text' && !rubricText.trim()) {
      toast.error('Please enter rubric text')
      return
    }
    if (rubricType === 'pdf' && !uploadedPdfUrl) {
      toast.error('Please upload a rubric PDF')
      return
    }

    try {
      await saveNodeConfig({
        workflowId,
        nodeId,
        config: JSON.stringify({
          rubricType,
          rubricText: rubricType === 'text' ? rubricText.trim() : undefined,
          rubricPdfUrl: rubricType === 'pdf' ? uploadedPdfUrl : undefined,
          rubricPdfName: rubricType === 'pdf' ? uploadedPdfName : undefined,
        }),
      })
      toast.success('Rubric saved!')
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error(error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-4 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Essay Grader</SheetTitle>
          <SheetDescription>Configure grading rubric or view essay feedback.</SheetDescription>
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
                <div className="mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-rose-600" />
                  <h3 className="text-sm font-semibold">Grading Rubric (Required)</h3>
                </div>

                {/* Rubric Type Selector */}
                <Tabs
                  value={rubricType}
                  onValueChange={(v: string) => setRubricType(v as 'text' | 'pdf')}
                  className="mb-4"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">Text Input</TabsTrigger>
                    <TabsTrigger value="pdf">PDF Upload</TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-2">
                    <Label htmlFor="rubric-text" className="text-sm">
                      Enter Grading Criteria
                    </Label>
                    <textarea
                      id="rubric-text"
                      value={rubricText}
                      onChange={(e) => setRubricText(e.target.value)}
                      placeholder="Example: Thesis Statement (20%), Evidence (30%), Organization (20%), Writing Quality (20%), Conclusion (10%)"
                      className="bg-background placeholder:text-muted-foreground focus:ring-ring min-h-[150px] w-full rounded-md border p-3 text-sm focus:ring-2 focus:outline-none"
                    />
                  </TabsContent>

                  <TabsContent value="pdf" className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="application/pdf"
                      className="hidden"
                    />

                    {uploadedPdfUrl ? (
                      <div className="bg-muted/30 rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-rose-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{uploadedPdfName}</p>
                            <a
                              href={uploadedPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View PDF
                            </a>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUploadedPdfUrl('')
                              setUploadedPdfName('')
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {pdfFile ? (
                          <div className="space-y-2">
                            <div className="bg-muted/30 rounded-lg border p-3">
                              <p className="text-sm font-medium">{pdfFile.name}</p>
                              <p className="text-muted-foreground text-xs">{(pdfFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                            <Button onClick={handleUploadPdf} disabled={isUploading} className="w-full">
                              {isUploading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                'Upload PDF'
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            className="w-full gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Select PDF Rubric (Max 5MB)
                          </Button>
                        )}
                      </>
                    )}
                  </TabsContent>
                </Tabs>

                {rubricType === 'text' && (
                  <Button onClick={handleSaveConfig} disabled={!rubricText.trim() || isUploading} className="w-full">
                    Save Rubric
                  </Button>
                )}
              </div>

              <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/50">
                <h4 className="mb-2 text-sm font-semibold">How It Works</h4>
                <p className="text-muted-foreground text-xs">
                  Provide a rubric (as text or PDF), and the AI will grade the essay from the previous node based on
                  your criteria. You'll receive detailed feedback, strengths, areas for improvement, and a final grade.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'output' && output && (
            <div className="space-y-6">
              {/* Grade Display */}
              <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-6 text-center dark:bg-rose-950/30">
                <div className="text-muted-foreground text-sm">Overall Grade</div>
                <div className="mt-2 text-4xl font-bold text-rose-600">{output.overallGrade}</div>
              </div>

              {/* Feedback */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Detailed Feedback</h3>
                <div className="bg-muted/50 max-h-[400px] overflow-y-auto rounded-lg border p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{output.feedback}</p>
                </div>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Essay Source</div>
                  <div className="text-lg font-semibold">
                    {output.essaySource ||
                      (output.essayLength ? `${output.essayLength.toLocaleString()} chars` : 'N/A')}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">Rubric Preview</div>
                  <div className="truncate text-xs">{output.rubricUsed}</div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-muted-foreground text-xs">Graded: {new Date(output.timestamp).toLocaleString()}</div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
