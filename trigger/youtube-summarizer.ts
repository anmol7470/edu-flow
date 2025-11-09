import { anthropic } from '@ai-sdk/anthropic'
import { Supadata } from '@supadata/js'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateText } from 'ai'
import removeMarkdown from 'remove-markdown'

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
          text: fullText,
          url,
        })

        logger.log(`Video ${i + 1} transcript extracted`, {
          textLength: fullText.length,
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
        model: anthropic('claude-sonnet-4-5'),
        prompt: `You are a video content summarizer. I am providing you with YouTube video transcript(s) below. Your task is to read the transcript(s) carefully and create a comprehensive, well-structured summary.

Instructions:
- DO NOT say you need the transcript - it is provided below
- Summarize the actual content from the transcript(s)
- Capture key points, main ideas, and important details
- If multiple videos are provided, organize the summary accordingly
- Write in clear, plain text without markdown formatting

Transcripts:

${combinedText}

Now provide a comprehensive summary of the above transcript(s):`,
      })

      logger.log('Summary generated successfully', {
        summaryLength: summary.text.length,
      })

      // Remove markdown formatting from the summary
      const plainTextSummary = removeMarkdown(summary.text)

      // Store result in Convex
      const output = {
        summary: plainTextSummary,
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Failed to generate summary', { error: errorMessage })
      await updateConvexStatus(workflowId, nodeId, {
        status: 'failed',
        error: `Failed to generate summary: ${errorMessage}`,
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
