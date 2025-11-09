import { google, GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateText, stepCountIs } from 'ai'
import removeMarkdown from 'remove-markdown'

type WebSearchPayload = {
  prompt: string
  nodeId: string
  workflowId: string
}

type SearchSource = {
  uri: string
  title?: string
}

export const webSearchTask = task({
  id: 'web-search',
  maxDuration: 600, // 10 minutes
  run: async (payload: WebSearchPayload, { ctx }) => {
    const { prompt, nodeId, workflowId } = payload

    logger.log('Starting web search', { nodeId, promptLength: prompt.length })

    // Update status to running
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Searching the web...',
      runId: ctx.run.id,
    })

    try {
      // Perform web search using Gemini 2.5 Flash with Google Search tool
      const { text, providerMetadata } = await generateText({
        model: google('gemini-2.5-flash'),
        tools: {
          google_search: google.tools.googleSearch({}),
        },
        toolChoice: 'required',
        prompt,
        stopWhen: stepCountIs(5),
      })

      logger.log('Web search completed', {
        textLength: text.length,
      })

      // Remove markdown formatting
      const cleanText = removeMarkdown(text)

      // Extract grounding metadata (sources)
      const metadata = providerMetadata?.google as GoogleGenerativeAIProviderMetadata | undefined
      const groundingMetadata = metadata?.groundingMetadata

      // Extract sources from grounding metadata
      const sources: SearchSource[] = []
      if (groundingMetadata?.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
        logger.log('Web search queries', { queries: groundingMetadata.webSearchQueries })
      }

      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web?.uri) {
            sources.push({
              uri: chunk.web.uri,
              title: chunk.web.title ?? undefined,
            })
          }
        }
      }

      logger.log('Extracted sources:', { sourceCount: sources.length })

      // Prepare output
      const output = {
        generatedText: cleanText,
        sources: sources,
        sourceCount: sources.length,
        prompt,
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
      logger.error('Failed to perform web search', { error: errorMessage })
      await updateConvexStatus(workflowId, nodeId, {
        status: 'failed',
        error: `Failed to perform web search: ${errorMessage}`,
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
