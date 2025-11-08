import { WorkflowLayout } from '@/components/workflow-layout'
import { getUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getUser()

  if (!user) {
    redirect('/')
  }

  return <WorkflowLayout workflowId={id} userId={user.id} />
}
