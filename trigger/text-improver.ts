import { anthropic } from '@ai-sdk/anthropic'
import { logger, task } from '@trigger.dev/sdk/v3'
import { convertToModelMessages, generateText } from 'ai'
import removeMarkdown from 'remove-markdown'

type TextImproverPayload = {
  text: string
  pdfUrl?: string
  customPrompt?: string
  nodeId: string
  workflowId: string
}

export const textImproverTask = task({
  id: 'text-improver',
  maxDuration: 600, // 10 minutes
  run: async (payload: TextImproverPayload, { ctx }) => {
    const { text, pdfUrl, customPrompt, nodeId, workflowId } = payload

    logger.log('Starting text improver', {
      nodeId,
      textLength: text.length,
      hasPdfUrl: !!pdfUrl,
      hasCustomPrompt: !!customPrompt,
    })

    // Update status to running
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Improving text...',
      runId: ctx.run.id,
    })

    try {
      // Default prompt if none provided
      const defaultPrompt = `You are an expert writing assistant. Your task is to improve the document by:
- Fixing grammar, spelling, and punctuation errors
- Improving clarity and readability
- Enhancing sentence structure and flow
- Making the tone more professional and polished
- Removing redundancies and improving conciseness
- Maintaining the original meaning and intent

Provide ONLY the improved text without any explanations or markdown formatting.`

      const systemPrompt = customPrompt || defaultPrompt
      const promptText = `${systemPrompt}\n\n${text ? `Text to improve:\n\n${text}\n\n` : ''}Improved text:`

      // Improve text using Anthropic
      // If PDF URL is provided, use that instead of text
      let result
      if (pdfUrl) {
        const uiMessages = [
          {
            id: 'text-improver',
            role: 'user' as const,
            parts: [
              {
                type: 'file' as const,
                url: pdfUrl,
                mediaType: 'application/pdf',
              },
              {
                type: 'text' as const,
                text: promptText,
              },
            ],
          },
        ]

        result = await generateText({
          model: anthropic('claude-sonnet-4-5'),
          messages: convertToModelMessages(uiMessages),
        })
      } else {
        result = await generateText({
          model: anthropic('claude-sonnet-4-5'),
          prompt: promptText,
        })
      }

      logger.log('Text improved successfully', {
        originalLength: text.length,
        improvedLength: result.text.length,
      })

      // Remove markdown formatting
      const improvedText = removeMarkdown(result.text)

      // Prepare output
      const output = {
        improvedText,
        originalText: text || (pdfUrl ? '[PDF Document]' : ''),
        originalLength: text.length,
        improvedLength: improvedText.length,
        usedPdf: !!pdfUrl,
        usedCustomPrompt: !!customPrompt,
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
      logger.error('Failed to improve text', { error: errorMessage })
      await updateConvexStatus(workflowId, nodeId, {
        status: 'failed',
        error: `Failed to improve text: ${errorMessage}`,
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
