import { essayGraderTask } from '@/trigger/essay-grader'
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workflowId, nodeId, essayText, rubric } = body

    if (!workflowId || !nodeId || !essayText || !rubric) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const handle = await tasks.trigger<typeof essayGraderTask>('essay-grader', {
      workflowId,
      nodeId,
      essayText,
      rubric,
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
    })
  } catch (error: unknown) {
    console.error('Error triggering essay grader:', error)
    return NextResponse.json(
      {
        error: 'Failed to trigger task',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
