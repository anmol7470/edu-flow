import { factCheckerTask } from '@/trigger/fact-checker'
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workflowId, nodeId, text } = body

    if (!workflowId || !nodeId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const handle = await tasks.trigger<typeof factCheckerTask>('fact-checker', {
      workflowId,
      nodeId,
      text,
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
    })
  } catch (error: unknown) {
    console.error('Error triggering fact checker:', error)
    return NextResponse.json(
      {
        error: 'Failed to trigger task',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
