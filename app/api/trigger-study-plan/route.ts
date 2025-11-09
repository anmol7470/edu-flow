import { studyPlanGeneratorTask } from '@/trigger/study-plan-generator'
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workflowId, nodeId, topic, duration, learningStyle, goals, currentLevel } = body

    if (!workflowId || !nodeId || !topic || !duration || !learningStyle || !goals || !currentLevel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const handle = await tasks.trigger<typeof studyPlanGeneratorTask>('study-plan-generator', {
      workflowId,
      nodeId,
      topic,
      duration,
      learningStyle,
      goals,
      currentLevel,
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
    })
  } catch (error: unknown) {
    console.error('Error triggering study plan generator:', error)
    return NextResponse.json(
      {
        error: 'Failed to trigger task',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
