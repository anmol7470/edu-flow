import { youtubeAnalyzerTask } from '@/trigger/youtube-analyzer'
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workflowId, nodeId, urls } = body

    if (!workflowId || !nodeId || !urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Trigger the YouTube analyzer task
    const handle = await tasks.trigger<typeof youtubeAnalyzerTask>('youtube-analyzer', {
      workflowId,
      nodeId,
      urls,
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
    })
  } catch (error: any) {
    console.error('Error triggering YouTube summarizer:', error)
    return NextResponse.json(
      {
        error: 'Failed to trigger task',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
