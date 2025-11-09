import { google, GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateText, stepCountIs } from 'ai'
import removeMarkdown from 'remove-markdown'

type StudyPlanPayload = {
  topic: string
  duration: string
  learningStyle: string
  goals: string
  currentLevel: string
  nodeId: string
  workflowId: string
}

type SearchSource = {
  uri: string
  title?: string
}

export const studyPlanGeneratorTask = task({
  id: 'study-plan-generator',
  maxDuration: 600, // 10 minutes
  run: async (payload: StudyPlanPayload, { ctx }) => {
    const { topic, duration, learningStyle, goals, currentLevel, nodeId, workflowId } = payload

    logger.log('Starting study plan generation', { nodeId, topic, duration })

    // Update status to running
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Creating personalized study plan...',
      runId: ctx.run.id,
    })

    try {
      // Use Gemini 2.5 Flash with Google Search to create a personalized study plan
      const { text, providerMetadata } = await generateText({
        model: google('gemini-2.5-flash'),
        tools: {
          google_search: google.tools.googleSearch({}),
        },
        toolChoice: 'required',
        stopWhen: stepCountIs(10),
        prompt: `You are an expert learning coach and curriculum designer. Create a comprehensive, personalized study plan based on the following information:

TOPIC: ${topic}
DURATION: ${duration}
CURRENT LEVEL: ${currentLevel}
LEARNING STYLE: ${learningStyle}
GOALS: ${goals}

Use web search to find:
- Current best practices for learning this topic
- Recommended resources (books, courses, tutorials, websites)
- Common learning paths and milestones
- Relevant communities and support groups

Create a detailed study plan that includes:
1. **Learning Path Overview**: Break down the topic into logical phases/modules
2. **Week-by-Week Schedule**: Detailed weekly breakdown with specific topics and time allocations
3. **Resources**: Recommended books, courses, videos, articles, and tools
4. **Practice Activities**: Hands-on projects, exercises, and practice problems
5. **Milestones**: Key checkpoints to measure progress
6. **Tips for Success**: Strategies tailored to their learning style
7. **Community & Support**: Where to get help and connect with others

Make the plan practical, actionable, and motivating. Cite specific resources you find through search.`,
      })

      logger.log('Study plan generated', {
        planLength: text.length,
      })

      // Remove markdown formatting
      const cleanPlan = removeMarkdown(text)

      // Extract sources from grounding metadata
      const metadata = providerMetadata?.google as GoogleGenerativeAIProviderMetadata | undefined
      const groundingMetadata = metadata?.groundingMetadata

      const sources: SearchSource[] = []
      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web?.uri) {
            // Avoid duplicate sources
            if (!sources.some((s) => s.uri === chunk.web?.uri)) {
              sources.push({
                uri: chunk.web.uri,
                title: chunk.web.title ?? undefined,
              })
            }
          }
        }
      }

      logger.log('Study plan complete', { sourceCount: sources.length })

      // Prepare output
      const output = {
        studyPlan: cleanPlan,
        topic,
        duration,
        learningStyle,
        goals,
        currentLevel,
        sources: sources,
        sourceCount: sources.length,
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
      logger.error('Failed to generate study plan', { error: errorMessage })
      await updateConvexStatus(workflowId, nodeId, {
        status: 'failed',
        error: `Failed to generate study plan: ${errorMessage}`,
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
