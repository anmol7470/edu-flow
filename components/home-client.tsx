'use client'

import { AuthDialog } from '@/components/auth-dialog'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import type { HomeClientProps } from '@/lib/types'
import { useMutation } from 'convex/react'
import { LogOut, Plus } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function HomeClient({ user }: HomeClientProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const createWorkflow = useMutation(api.workflows.createWorkflow)
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

  if (isAuthenticated) {
    // Authenticated view: Show logo and create workflow button
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        {/* Logout button in top right */}
        <div className="fixed top-4 right-4">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <Logo />
        <Button size="lg" className="gap-2" onClick={handleCreateWorkflow} disabled={isCreating}>
          <Plus className="h-5 w-5" />
          {isCreating ? 'Creating...' : 'Create Workflow'}
        </Button>
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
