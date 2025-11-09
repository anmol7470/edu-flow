import { api } from '@/convex/_generated/api'
import { fetchMutation } from 'convex/nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workflowId, nodeId, files } = body

    if (!workflowId || !nodeId || !files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // PDF node doesn't need a task - just immediately mark as completed with file URLs
    // The file URLs will be passed to the next node which will use them in generateText
    const output = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      files: files.map((file: any) => ({
        url: file.url,
        name: file.name,
        storageId: file.storageId,
      })),
      fileCount: files.length,
      timestamp: Date.now(),
    }

    // Update node execution to completed
    await fetchMutation(api.nodeExecutions.updateNodeExecution, {
      workflowId,
      nodeId,
      status: 'completed',
      output: JSON.stringify(output),
    })

    return NextResponse.json({
      success: true,
      message: 'PDF files ready for next node',
    })
  } catch (error) {
    console.error('Error processing PDF node:', error)
    return NextResponse.json(
      {
        error: 'Failed to process PDF node',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
