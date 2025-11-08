import type { Edge, Node } from '@xyflow/react'

// Auth types
export type User = {
  id: string
  email: string
  name: string
} | null

export type AuthDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Home types
export type HomeClientProps = {
  user: User
}

// Workflow types
export type WorkflowCanvasProps = {
  workflowId: string
  userId: string
  initialNodes: Node[]
  initialEdges: Edge[]
}

export type WorkflowLayoutProps = {
  workflowId: string
  userId: string
}
