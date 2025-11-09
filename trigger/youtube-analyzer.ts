import { Supadata } from '@supadata/js'
import { logger, task } from '@trigger.dev/sdk/v3'

type YouTubePayload = {
  urls: string[]
  nodeId: string
  workflowId: string
}

export const youtubeAnalyzerTask = task({
  id: 'youtube-analyzer',
  maxDuration: 600, // 10 minutes
  run: async (payload: YouTubePayload, { ctx }) => {
    const { urls, nodeId, workflowId } = payload

    logger.log('Starting YouTube analyzer', { nodeId, videoCount: urls.length })

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

        // Get transcript as plain text (easier to work with)
        const transcriptResult = await supadata.transcript({
          url,
          text: true, // Get plain text instead of timestamped chunks
          mode: 'auto', // Try native, fallback to generate if needed
        })

        // Extract the content from the response
        // Handle both direct response and job ID scenarios
        let fullText: string

        if ('jobId' in transcriptResult) {
          // For large files, poll for results
          logger.log('Transcript requires async processing, polling...')
          const jobResult = await supadata.transcript.getJobStatus(transcriptResult.jobId)

          if (jobResult.status === 'completed') {
            fullText = (jobResult as unknown as { status: 'completed'; content: string }).content
          } else if (jobResult.status === 'failed') {
            const errorData = jobResult.error
            const errorMsg = errorData ? `${errorData.message} (${errorData.details})` : 'Unknown error'
            throw new Error(`Transcript generation failed: ${errorMsg}`)
          } else {
            throw new Error(`Transcript job is still ${jobResult.status}`)
          }
        } else {
          // Direct response
          fullText = transcriptResult.content as string
        }

        transcripts.push({
          title: video.title,
          url,
          duration: video.duration || 0,
          transcript: fullText,
          wordCount: fullText.split(/\s+/).length,
        })

        logger.log(`Video ${i + 1} transcript extracted`, {
          textLength: fullText.length,
          wordCount: fullText.split(/\s+/).length,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to fetch video ${i + 1}`, { error: errorMessage })
        await updateConvexStatus(workflowId, nodeId, {
          status: 'failed',
          error: `Failed to fetch video ${i + 1}: ${errorMessage}`,
        })
        throw error
      }
    }

    // Prepare output with formatted transcripts
    const output = {
      videos: transcripts,
      videoCount: transcripts.length,
      totalWords: transcripts.reduce((sum, t) => sum + t.wordCount, 0),
      timestamp: Date.now(),
    }

    await updateConvexStatus(workflowId, nodeId, {
      status: 'completed',
      output: JSON.stringify(output),
      progress: undefined,
    })

    logger.log('Task completed successfully', {
      videoCount: transcripts.length,
      totalWords: output.totalWords,
    })

    return output
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
    const convexUrl = process.env.CONVEX_SITE_URL
    if (!convexUrl) {
      console.warn('CONVEX_SITE_URL environment variable is not set. Skipping status update.')
      return
    }

    const response = await fetch(`${convexUrl}/updateNodeExecution`, {
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
