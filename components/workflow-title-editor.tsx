'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'
import { Check, Pencil, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type WorkflowTitleEditorProps = {
  workflowId: string
}

export function WorkflowTitleEditor({ workflowId }: WorkflowTitleEditorProps) {
  const workflow = useQuery(api.workflows.getWorkflow, { workflowId })
  const updateTitle = useMutation(api.workflows.updateWorkflowTitle)

  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (workflow?.title) {
      setTitle(workflow.title)
    }
  }, [workflow?.title])

  const handleSave = async () => {
    if (!title.trim() || isSaving) return

    setIsSaving(true)
    try {
      await updateTitle({
        workflowId,
        title: title.trim(),
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update title:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setTitle(workflow?.title || 'New Workflow')
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!workflow) {
    return (
      <div className="flex items-center gap-2">
        <Pencil className="h-5 w-5 animate-spin text-muted-foreground" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 w-64"
          autoFocus
          disabled={isSaving}
        />
        <Button size="sm" variant="ghost" onClick={handleSave} disabled={isSaving || !title.trim()}>
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-xl font-semibold">{workflow.title}</h1>
      <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  )
}

