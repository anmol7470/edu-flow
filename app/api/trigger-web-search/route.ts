import { webSearchTask } from '@/trigger/web-search'
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workflowId, nodeId, prompt } = body

    if (!workflowId || !nodeId || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const handle = await tasks.trigger<typeof webSearchTask>('web-search', {
      workflowId,
      nodeId,
      prompt,
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
    })
  } catch (error: unknown) {
    console.error('Error triggering web search:', error)
    return NextResponse.json(
      {
        error: 'Failed to trigger task',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
