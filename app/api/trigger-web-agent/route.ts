import { webAgentTask } from '@/trigger/web-agent'
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workflowId, nodeId, startingPage, instructions, headless } = body

    if (!workflowId || !nodeId || !startingPage || !instructions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const handle = await tasks.trigger<typeof webAgentTask>('web-agent', {
      workflowId,
      nodeId,
      startingPage,
      instructions,
      headless: headless ?? true,
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
    })
  } catch (error: unknown) {
    console.error('Error triggering web agent:', error)
    return NextResponse.json(
      {
        error: 'Failed to trigger task',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
