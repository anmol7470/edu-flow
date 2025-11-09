import { textSummarizerTask } from '@/trigger/text-summarizer'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, nodeId, text } = body

    if (!workflowId || !nodeId || !text) {
      return NextResponse.json({ error: 'Missing required fields: workflowId, nodeId, text' }, { status: 400 })
    }

    // Trigger the text summarizer task
    const handle = await textSummarizerTask.trigger({
      workflowId,
      nodeId,
      text,
    })

    return NextResponse.json({ success: true, runId: handle.id })
  } catch (error) {
    console.error('Error triggering text summarizer:', error)
    return NextResponse.json({ error: 'Failed to trigger text summarizer' }, { status: 500 })
  }
}

