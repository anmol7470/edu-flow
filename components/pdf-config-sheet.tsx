'use client'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

type UploadedFile = {
  storageId: Id<'_storage'>
  name: string
  size: number
  url: string
}

type PDFConfigSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
  initialConfig?: { files: UploadedFile[] }
}

export function PDFConfigSheet({ open, onOpenChange, workflowId, nodeId, initialConfig }: PDFConfigSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)
  const getFileUrl = useMutation(api.storage.getFileUrl)
  const deleteFiles = useMutation(api.storage.deleteFiles)
  const saveNodeConfig = useMutation(api.nodeExecutions.saveNodeConfig)

  const MAX_FILES = 5
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  // Sync uploaded files with initialConfig when component mounts or initialConfig changes
  useEffect(() => {
    if (initialConfig?.files && Array.isArray(initialConfig.files)) {
      setUploadedFiles(initialConfig.files)
    }
  }, [initialConfig])

  // Reset files when sheet closes
  useEffect(() => {
    if (!open) {
      // Reset to saved config when closing
      if (initialConfig?.files && Array.isArray(initialConfig.files)) {
        setUploadedFiles(initialConfig.files)
      } else {
        setUploadedFiles([])
      }
    }
  }, [open, initialConfig])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // Reset input

    if (files.length === 0) return

    // Validate file types
    const invalidFiles = files.filter((file) => file.type !== 'application/pdf')
    if (invalidFiles.length > 0) {
      toast.error('Only PDF files are allowed')
      return
    }

    // Validate file sizes
    const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE)
    if (oversizedFiles.length > 0) {
      toast.error(`Files must be under 5MB: ${oversizedFiles.map((f) => f.name).join(', ')}`)
      return
    }

    // Check duplicates
    const duplicates = files.filter((file) => uploadedFiles.some((uf) => uf.name === file.name))
    if (duplicates.length > 0) {
      toast.error(`Duplicate files: ${duplicates.map((f) => f.name).join(', ')}`)
      return
    }

    // Check max count
    if (uploadedFiles.length + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    // Upload files
    setIsUploading(true)
    try {
      const uploadPromises = files.map(async (file) => {
        // Get upload URL
        const postUrl = await generateUploadUrl()

        // Upload file
        const result = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!result.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const { storageId } = await result.json()

        // Get the URL
        const url = await getFileUrl({ storageId })
        if (!url) {
          throw new Error(`Failed to get URL for ${file.name}`)
        }

        return {
          storageId,
          name: file.name,
          size: file.size,
          url,
        }
      })

      const newFiles = await Promise.all(uploadPromises)
      const updatedFiles = [...uploadedFiles, ...newFiles]
      setUploadedFiles(updatedFiles)

      // Auto-save after upload
      await saveNodeConfig({
        workflowId,
        nodeId,
        config: JSON.stringify({ files: updatedFiles }),
      })

      toast.success(`${newFiles.length} file(s) uploaded successfully`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload files')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = async (file: UploadedFile) => {
    try {
      await deleteFiles({ storageIds: [file.storageId] })
      const updatedFiles = uploadedFiles.filter((f) => f.storageId !== file.storageId)
      setUploadedFiles(updatedFiles)

      // Auto-save after removal
      await saveNodeConfig({
        workflowId,
        nodeId,
        config: JSON.stringify({ files: updatedFiles }),
      })

      toast.success('File removed')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to remove file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configure PDF Reader</SheetTitle>
          <SheetDescription>Upload 1-5 PDF files to analyze (max 5MB each)</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto">
          {/* Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || uploadedFiles.length >= MAX_FILES}
              className="w-full gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload PDF Files
                </>
              )}
            </Button>
            <p className="text-muted-foreground mt-2 text-xs">
              {uploadedFiles.length}/{MAX_FILES} files • Max 5MB per file
            </p>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Uploaded Files</h3>
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.storageId} className="bg-muted/50 flex items-center gap-3 rounded-lg border p-3">
                    <FileText className="text-muted-foreground h-8 w-8 flex-shrink-0" />
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 cursor-pointer hover:underline"
                    >
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-muted-foreground text-xs">{formatFileSize(file.size)}</p>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(file)}
                      className="hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {uploadedFiles.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center">
              <FileText className="mb-3 h-12 w-12 opacity-50" />
              <p className="text-sm">No files uploaded yet</p>
              <p className="text-xs">Click the button above to upload PDFs</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
