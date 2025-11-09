import { google } from '@ai-sdk/google'
import { logger, task } from '@trigger.dev/sdk/v3'
import { convertToModelMessages, generateText } from 'ai'
import removeMarkdown from 'remove-markdown'

type ConceptExtractorPayload = {
  text: string
  pdfUrls?: string[]
  nodeId: string
  workflowId: string
}

export const conceptExtractorTask = task({
  id: 'concept-extractor',
  maxDuration: 600, // 10 minutes
  run: async (payload: ConceptExtractorPayload, { ctx }) => {
    const { text, pdfUrls, nodeId, workflowId } = payload

    logger.log('Starting concept extractor', {
      nodeId,
      textLength: text.length,
      hasPdfUrls: !!pdfUrls?.length,
      pdfCount: pdfUrls?.length || 0,
    })

    // Update status to running
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Extracting concepts...',
      runId: ctx.run.id,
    })

    try {
      // Prepare prompt
      const promptText = `You are an expert at analyzing text and extracting key concepts. Your task is to carefully read the provided document and identify all important concepts, ideas, themes, and topics.

For each concept you extract:
- Provide a clear concept name/title
- Write a brief explanation of what it means in the context
- Note why it's significant or how it's used

Format your response as a structured list of concepts. Do not use markdown formatting.

${text ? `Text to analyze:\n\n${text}\n\n` : ''}Now extract and explain all key concepts from the document:`

      // Extract concepts using Gemini 2.5 Flash
      // If PDF URLs are provided, pass them as file attachments
      let result
      if (pdfUrls && pdfUrls.length > 0) {
        const uiMessages = [
          {
            id: 'concept-extractor',
            role: 'user' as const,
            parts: [
              ...pdfUrls.map((url) => ({
                type: 'file' as const,
                url,
                mediaType: 'application/pdf',
              })),
              {
                type: 'text' as const,
                text: promptText,
              },
            ],
          },
        ]

        result = await generateText({
          model: google('gemini-2.5-flash'),
          messages: convertToModelMessages(uiMessages),
        })
      } else {
        result = await generateText({
          model: google('gemini-2.5-flash'),
          prompt: promptText,
        })
      }

      logger.log('Concepts extracted successfully', {
        outputLength: result.text.length,
      })

      // Remove markdown formatting
      const conceptsText = removeMarkdown(result.text)

      // Prepare output
      const output = {
        concepts: conceptsText,
        sourceTextLength: text.length,
        conceptsLength: conceptsText.length,
        hasPdfInput: !!pdfUrls?.length,
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
      logger.error('Failed to extract concepts', { error: errorMessage })
      await updateConvexStatus(workflowId, nodeId, {
        status: 'failed',
        error: `Failed to extract concepts: ${errorMessage}`,
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
