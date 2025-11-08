'use client'

import { AuthDialog } from '@/components/auth-dialog'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import type { HomeClientProps } from '@/lib/types'
import { useMutation, useQuery } from 'convex/react'
import { LogOut, Plus, Trash2, Workflow } from 'lucide-react'
import { nanoid } from 'nanoid'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function HomeClient({ user }: HomeClientProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const createWorkflow = useMutation(api.workflows.createWorkflow)
  const deleteWorkflow = useMutation(api.workflows.deleteWorkflow)
  const workflows = useQuery(api.workflows.getUserWorkflows, user ? { userId: user.id } : 'skip')
  const isAuthenticated = Boolean(user)

  const handleLogout = async () => {
    await authClient.signOut()
    router.refresh()
  }

  const handleCreateWorkflow = async () => {
    if (!user || isCreating) return

    setIsCreating(true)
    try {
      const workflowId = nanoid()
      await createWorkflow({
        workflowId,
        userId: user.id,
      })
      router.push(`/workflow/${workflowId}`)
    } catch (error) {
      console.error('Failed to create workflow:', error)
      setIsCreating(false)
    }
  }

  const handleDeleteWorkflow = async (workflowId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      await deleteWorkflow({ workflowId })
    } catch (error) {
      console.error('Failed to delete workflow:', error)
    }
  }

  if (isAuthenticated) {
    // Authenticated view: Show workflows
    return (
      <div className="flex min-h-screen flex-col p-8">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <Logo />
          <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Workflows section */}
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">My Workflows</h1>
            <Button size="lg" className="gap-2" onClick={handleCreateWorkflow} disabled={isCreating}>
              <Plus className="h-5 w-5" />
              {isCreating ? 'Creating...' : 'New Workflow'}
            </Button>
          </div>

          {/* Workflows grid */}
          {workflows === undefined ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border-border bg-background rounded-lg border p-6">
                  <Skeleton className="mb-4 h-6 w-3/4" />
                  <Skeleton className="mb-2 h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <div className="border-border bg-muted/30 flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
              <Workflow className="text-muted-foreground mb-4 h-12 w-12" />
              <p className="text-muted-foreground mb-2 text-lg font-medium">No workflows yet</p>
              <p className="text-muted-foreground text-sm">Create your first workflow to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workflows.map((workflow) => (
                <Link
                  key={workflow.workflowId}
                  href={`/workflow/${workflow.workflowId}`}
                  className="group border-border bg-background hover:border-primary relative rounded-lg border p-6 transition-all hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <h3 className="text-lg font-semibold">{workflow.title}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => handleDeleteWorkflow(workflow.workflowId, e)}
                    >
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-muted-foreground space-y-1 text-sm">
                    <p>Created: {new Date(workflow.createdAt).toLocaleDateString()}</p>
                    <p>Updated: {new Date(workflow.updatedAt).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Unauthenticated view: Show logo and get started button
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <Logo />
      <Button size="lg" onClick={() => setAuthDialogOpen(true)}>
        Get Started
      </Button>
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  )
}
