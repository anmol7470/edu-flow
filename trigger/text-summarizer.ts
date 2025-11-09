import { anthropic } from '@ai-sdk/anthropic'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateText } from 'ai'
import removeMarkdown from 'remove-markdown'

type TextSummarizerPayload = {
  text: string
  nodeId: string
  workflowId: string
}

export const textSummarizerTask = task({
  id: 'text-summarizer',
  maxDuration: 600, // 10 minutes
  run: async (payload: TextSummarizerPayload, { ctx }) => {
    const { text, nodeId, workflowId } = payload

    logger.log('Starting text summarizer', { nodeId, textLength: text.length })

    // Update status to running
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Analyzing text...',
      runId: ctx.run.id,
    })

    try {
      // Generate summary using Anthropic
      const summary = await generateText({
        model: anthropic('claude-sonnet-4-5'),
        prompt: `You are an expert text summarizer. Your task is to create a comprehensive, well-structured summary of the provided text.

Instructions:
- Read the text carefully and extract the main ideas, key points, and important details
- Create a clear, concise summary that captures the essence of the content
- Organize the summary logically with proper structure
- Write in clear, plain text without markdown formatting
- If the text is from multiple sources, organize the summary accordingly
- Focus on the most important information and skip redundant details

Text to summarize:

${text}

Now provide a comprehensive summary:`,
      })

      logger.log('Summary generated successfully', {
        summaryLength: summary.text.length,
      })

      // Remove markdown formatting from the summary
      const plainTextSummary = removeMarkdown(summary.text)

      // Prepare output
      const output = {
        summary: plainTextSummary,
        originalLength: text.length,
        summaryLength: plainTextSummary.length,
        timestamp: Date.now(),
      }

      await updateConvexStatus(workflowId, nodeId, {
        status: 'completed',
        output: JSON.stringify(output),
        progress: undefined,
      })

      logger.log('Task completed successfully', {
        originalLength: output.originalLength,
        summaryLength: output.summaryLength,
      })

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

