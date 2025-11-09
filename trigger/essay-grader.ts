import { anthropic } from '@ai-sdk/anthropic'
import { logger, task } from '@trigger.dev/sdk/v3'
import { convertToModelMessages, generateText } from 'ai'
import removeMarkdown from 'remove-markdown'

type EssayGraderPayload = {
  essayPdfUrl?: string
  rubric: string
  rubricType?: 'text' | 'pdf'
  nodeId: string
  workflowId: string
}

export const essayGraderTask = task({
  id: 'essay-grader',
  maxDuration: 600, // 10 minutes
  run: async (payload: EssayGraderPayload, { ctx }) => {
    const { essayPdfUrl, rubric, rubricType, nodeId, workflowId } = payload

    logger.log('Starting essay grading', {
      nodeId,
      hasEssayPdf: !!essayPdfUrl,
      rubricType: rubricType || 'text',
      rubricLength: rubric.length,
    })

    // Update status to running
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Grading essay...',
      runId: ctx.run.id,
    })

    try {
      // Prepare the rubric content
      const isRubricPdf = rubricType === 'pdf' && rubric.startsWith('http')

      // Build the prompt
      const promptText = `You are an experienced educator and essay grader. Grade the essay according to the provided rubric.

${!isRubricPdf ? `RUBRIC:\n${rubric}\n\n` : 'The rubric is provided as a PDF document.\n\n'}Provide a comprehensive evaluation including:
1. Overall grade/score
2. Detailed feedback for each rubric criterion
3. Strengths of the essay
4. Areas for improvement
5. Specific suggestions for revision
6. Final summary and grade justification

Be constructive, specific, and actionable in your feedback. Format your response clearly without using markdown.`

      // Use Sonnet 4.5 to grade the essay
      // Handle different combinations of PDF/text for essay and rubric
      let gradingResult
      if (essayPdfUrl || isRubricPdf) {
        const parts = []

        // Add essay PDF if provided
        if (essayPdfUrl) {
          parts.push({
            type: 'file' as const,
            url: essayPdfUrl,
            mediaType: 'application/pdf',
          })
        }

        // Add rubric PDF if it's a PDF
        if (isRubricPdf) {
          parts.push({
            type: 'file' as const,
            url: rubric,
            mediaType: 'application/pdf',
          })
        }

        // Add the prompt
        parts.push({
          type: 'text' as const,
          text: promptText,
        })

        const uiMessages = [
          {
            id: 'essay-grader',
            role: 'user' as const,
            parts,
          },
        ]

        gradingResult = await generateText({
          model: anthropic('claude-sonnet-4-5'),
          messages: convertToModelMessages(uiMessages),
        })
      } else {
        gradingResult = await generateText({
          model: anthropic('claude-sonnet-4-5'),
          prompt: `${promptText}\n\nNote: No essay document was provided. Please inform the user that an essay is required for grading.`,
        })
      }

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
        essayLength: essayPdfUrl ? 0 : 0, // PDF length not available
        essaySource: essayPdfUrl ? 'PDF Document' : 'Not provided',
        essayPdfUrl: essayPdfUrl || undefined, // Pass through for downstream nodes
        rubricUsed: rubricType === 'pdf' ? 'PDF Rubric' : rubric.slice(0, 200) + (rubric.length > 200 ? '...' : ''),
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
