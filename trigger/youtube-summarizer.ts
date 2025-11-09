import { anthropic } from '@ai-sdk/anthropic'
import { Supadata } from '@supadata/js'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateText } from 'ai'

type YouTubePayload = {
  urls: string[]
  nodeId: string
  workflowId: string
}

export const youtubeSummarizerTask = task({
  id: 'youtube-summarizer',
  maxDuration: 600, // 10 minutes
  run: async (payload: YouTubePayload, { ctx }) => {
    const { urls, nodeId, workflowId } = payload

    logger.log('Starting YouTube summarizer', { nodeId, videoCount: urls.length })

    // Update status to running
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Initializing...',
      runId: ctx.run.id,
    })

    const supadata = new Supadata({
      apiKey: process.env.SUPADATA_API_KEY!,
    })

    const transcripts = []

    // Fetch transcripts for each video
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      logger.log(`Processing video ${i + 1}/${urls.length}`, { url })

      await updateConvexStatus(workflowId, nodeId, {
        status: 'running',
        progress: `Fetching video ${i + 1}/${urls.length}...`,
      })

      try {
        // Get video metadata
        const video = await supadata.youtube.video({ id: url })
        logger.log('Video metadata fetched', { title: video.title })

        // Get transcript
        const transcriptResult = await supadata.youtube.transcript({
          url,
          text: false, // Get timestamped chunks
        })

        // Join transcript chunks into coherent text
        const fullText = Array.isArray(transcriptResult)
          ? transcriptResult.map((chunk: any) => chunk.text).join(' ')
          : transcriptResult

        transcripts.push({
          title: video.title,
          text: fullText,
          url,
        })

        logger.log(`Video ${i + 1} transcript extracted`, {
          textLength: fullText.length,
        })
      } catch (error: any) {
        logger.error(`Failed to fetch video ${i + 1}`, { error: error.message })
        await updateConvexStatus(workflowId, nodeId, {
          status: 'failed',
          error: `Failed to fetch video ${i + 1}: ${error.message}`,
        })
        throw error
      }
    }

    // Update progress: summarizing
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Generating AI summary...',
    })

    logger.log('Generating summary with Anthropic')

    // Combine transcripts with titles
    const combinedText = transcripts.map((t) => `${t.title}:\n\n${t.text}`).join('\n\n---\n\n')

    try {
      // Summarize using Anthropic
      const summary = await generateText({
        model: anthropic('claude-3-5-sonnet-20241022'),
        prompt: `Summarize the following YouTube video transcripts. Create a comprehensive summary that captures the key points, main ideas, and important details from all videos:\n\n${combinedText}`,
        maxTokens: 2000,
      })

      logger.log('Summary generated successfully', {
        summaryLength: summary.text.length,
      })

      // Store result in Convex
      const output = {
        summary: summary.text,
        videos: transcripts.map((t) => ({
          title: t.title,
          url: t.url,
        })),
        videoCount: transcripts.length,
        timestamp: Date.now(),
      }

      await updateConvexStatus(workflowId, nodeId, {
        status: 'completed',
        output: JSON.stringify(output),
        progress: undefined,
      })

      logger.log('Task completed successfully')

      return output
    } catch (error: any) {
      logger.error('Failed to generate summary', { error: error.message })
      await updateConvexStatus(workflowId, nodeId, {
        status: 'failed',
        error: `Failed to generate summary: ${error.message}`,
      })
      throw error
    }
  },
})

// Helper function to update Convex node execution status
async function updateConvexStatus(
  workflowId: string,
  nodeId: string,
  data: {
    status?: string
    progress?: string
    output?: string
    error?: string
    runId?: string
  }
) {
  try {
    const response = await fetch(`${process.env.CONVEX_SITE_URL}/updateNodeExecution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflowId,
        nodeId,
        ...data,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to update Convex status: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error updating Convex status:', error)
    // Don't throw - we don't want status updates to fail the task
  }
}
