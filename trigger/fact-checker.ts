import { anthropic } from '@ai-sdk/anthropic'
import { google, GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateText, stepCountIs } from 'ai'
import removeMarkdown from 'remove-markdown'

type FactCheckerPayload = {
  text: string
  nodeId: string
  workflowId: string
}

type SearchSource = {
  uri: string
  title?: string
}

type FactCheckResult = {
  topic: string
  claim: string
  verification: string
  isAccurate: boolean
}

export const factCheckerTask = task({
  id: 'fact-checker',
  maxDuration: 900, // 15 minutes
  run: async (payload: FactCheckerPayload, { ctx }) => {
    const { text, nodeId, workflowId } = payload

    logger.log('Starting fact checker', { nodeId, textLength: text.length })

    // Stage 1: Analyze text and extract claims to fact-check
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Analyzing claims to fact-check...',
      runId: ctx.run.id,
    })

    try {
      // Use Sonnet 4.5 to extract claims
      const analysisResult = await generateText({
        model: anthropic('claude-sonnet-4-5'),
        prompt: `You are a fact-checking assistant. Analyze the following text and identify all factual claims that should be verified.

For each claim, extract:
1. The topic/subject of the claim
2. The specific claim being made

Format your response as a JSON array of objects with "topic" and "claim" fields.

Text to analyze:

${text}

Now provide a structured list of claims to fact-check in JSON format:`,
      })

      logger.log('Claims extracted', { resultLength: analysisResult.text.length })

      // Parse the claims
      let claims: Array<{ topic: string; claim: string }> = []
      try {
        const jsonMatch = analysisResult.text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          claims = JSON.parse(jsonMatch[0])
        }
      } catch (parseError) {
        logger.error('Failed to parse claims', { error: String(parseError) })
        // Fallback: treat the whole text as one claim
        claims = [{ topic: 'General', claim: text.slice(0, 500) }]
      }

      logger.log('Parsed claims', { claimCount: claims.length })

      // Stage 2: Fact-check each claim using Gemini with search
      await updateConvexStatus(workflowId, nodeId, {
        status: 'running',
        progress: `Fact-checking ${claims.length} claims...`,
      })

      const factCheckResults: FactCheckResult[] = []
      const allSources: SearchSource[] = []

      for (let i = 0; i < claims.length; i++) {
        const claim = claims[i]
        logger.log(`Fact-checking claim ${i + 1}/${claims.length}`, { topic: claim.topic })

        await updateConvexStatus(workflowId, nodeId, {
          status: 'running',
          progress: `Fact-checking ${i + 1}/${claims.length}: ${claim.topic}...`,
        })

        // Use Gemini with Google Search to verify
        const verificationResult = await generateText({
          model: google('gemini-2.5-flash'),
          tools: {
            google_search: google.tools.googleSearch({}),
          },
          toolChoice: 'required',
          stopWhen: stepCountIs(10),
          prompt: `Fact-check the following claim using web search:

Topic: ${claim.topic}
Claim: ${claim.claim}

Provide:
1. Verification of whether the claim is accurate, partially accurate, or inaccurate
2. Evidence from reliable sources
3. Any important context or nuance

Be thorough and cite your sources.`,
        })

        // Extract sources from this verification
        const metadata = verificationResult.providerMetadata?.google as GoogleGenerativeAIProviderMetadata | undefined
        const groundingMetadata = metadata?.groundingMetadata

        if (groundingMetadata?.groundingChunks) {
          for (const chunk of groundingMetadata.groundingChunks) {
            if (chunk.web?.uri) {
              // Avoid duplicate sources
              if (!allSources.some((s) => s.uri === chunk.web?.uri)) {
                allSources.push({
                  uri: chunk.web.uri,
                  title: chunk.web.title ?? undefined,
                })
              }
            }
          }
        }

        const verificationText = removeMarkdown(verificationResult.text)

        // Determine accuracy
        const lowerText = verificationText.toLowerCase()
        const isAccurate =
          (lowerText.includes('accurate') || lowerText.includes('correct') || lowerText.includes('true')) &&
          !lowerText.includes('inaccurate') &&
          !lowerText.includes('false') &&
          !lowerText.includes('misleading')

        factCheckResults.push({
          topic: claim.topic,
          claim: claim.claim,
          verification: verificationText,
          isAccurate,
        })
      }

      logger.log('Fact-checking complete', {
        totalClaims: factCheckResults.length,
        sources: allSources.length,
      })

      // Prepare output
      const output = {
        originalText: text,
        claimsChecked: factCheckResults.length,
        results: factCheckResults,
        sources: allSources,
        sourceCount: allSources.length,
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
      logger.error('Failed to fact-check', { error: errorMessage })
      await updateConvexStatus(workflowId, nodeId, {
        status: 'failed',
        error: `Failed to fact-check: ${errorMessage}`,
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
