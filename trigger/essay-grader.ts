import { anthropic } from '@ai-sdk/anthropic'
import { logger, task } from '@trigger.dev/sdk/v3'
import { generateText } from 'ai'
import removeMarkdown from 'remove-markdown'

type EssayGraderPayload = {
  essayText: string
  rubric: string
  nodeId: string
  workflowId: string
}

export const essayGraderTask = task({
  id: 'essay-grader',
  maxDuration: 600, // 10 minutes
  run: async (payload: EssayGraderPayload, { ctx }) => {
    const { essayText, rubric, nodeId, workflowId } = payload

    logger.log('Starting essay grading', {
      nodeId,
      essayLength: essayText.length,
      rubricLength: rubric.length,
    })

    // Update status to running
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Grading essay...',
      runId: ctx.run.id,
    })

    try {
      // Use Sonnet 4.5 to grade the essay
      const gradingResult = await generateText({
        model: anthropic('claude-sonnet-4-5'),
        prompt: `You are an experienced educator and essay grader. Grade the following essay according to the provided rubric.

RUBRIC:
${rubric}

ESSAY TO GRADE:
${essayText}

Provide a comprehensive evaluation including:
1. Overall grade/score
2. Detailed feedback for each rubric criterion
3. Strengths of the essay
4. Areas for improvement
5. Specific suggestions for revision
6. Final summary and grade justification

Be constructive, specific, and actionable in your feedback. Format your response clearly without using markdown.`,
      })

      logger.log('Grading completed', {
        feedbackLength: gradingResult.text.length,
      })

      // Remove markdown formatting
      const cleanFeedback = removeMarkdown(gradingResult.text)

      // Try to extract overall grade/score
      const gradeMatch = cleanFeedback.match(
        /(?:overall grade|final grade|grade|score):\s*([A-F][+-]?|\d+(?:\.\d+)?(?:\/\d+)?|[A-F]|[0-9]{1,3}%)/i
      )
      const overallGrade = gradeMatch ? gradeMatch[1] : 'See feedback'

      // Prepare output
      const output = {
        overallGrade,
        feedback: cleanFeedback,
        essayLength: essayText.length,
        rubricUsed: rubric.slice(0, 200) + (rubric.length > 200 ? '...' : ''),
        timestamp: Date.now(),
      }

      await updateConvexStatus(workflowId, nodeId, {
        status: 'completed',
        output: JSON.stringify(output),
        progress: undefined,
      })

      logger.log('Task completed successfully', { grade: overallGrade })

      return output
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Failed to grade essay', { error: errorMessage })
      await updateConvexStatus(workflowId, nodeId, {
        status: 'failed',
        error: `Failed to grade essay: ${errorMessage}`,
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
