/* eslint-disable @typescript-eslint/no-explicit-any */

'use node'

import { tasks } from '@trigger.dev/sdk/v3'
import { v } from 'convex/values'
import { api } from './_generated/api'
import { internalAction } from './_generated/server'

/**
 * Action to trigger Trigger.dev tasks for workflow nodes
 */
export const triggerNodeApi = internalAction({
  args: {
    workflowId: v.string(),
    nodeId: v.string(),
    nodeType: v.string(),
    config: v.any(),
    combinedInput: v.string(),
    apiEndpoint: v.string(),
    parentOutputs: v.array(
      v.object({
        nodeId: v.string(),
        nodeType: v.string(),
        nodeLabel: v.string(),
        output: v.any(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workflowId, nodeId, nodeType, config, combinedInput, parentOutputs } = args

    try {
      // Handle PDF node specially - it doesn't need a task
      if (nodeType === 'pdf') {
        const output = {
          files: config.files || [],
          fileCount: (config.files || []).length,
          timestamp: Date.now(),
        }

        await ctx.runMutation(api.nodeExecutions.updateNodeExecution, {
          workflowId,
          nodeId,
          status: 'completed',
          output: JSON.stringify(output),
        })

        return null
      }

      // Prepare payload for Trigger.dev task
      const payload = prepareTaskPayload(nodeType, config, combinedInput, workflowId, nodeId, parentOutputs)
      const taskId = getTaskIdForNodeType(nodeType)

      if (!taskId) {
        throw new Error(`Unknown node type: ${nodeType}`)
      }

      // Trigger the Trigger.dev task directly
      const handle = await tasks.trigger(taskId, payload)

      console.log(`Triggered ${taskId} for node ${nodeId}, run: ${handle.id}`)

      // Update node execution with run ID
      await ctx.runMutation(api.nodeExecutions.updateNodeExecution, {
        workflowId,
        nodeId,
        status: 'running',
        runId: handle.id,
      })
    } catch (error) {
      console.error(`Failed to trigger node ${nodeId}:`, error)

      // Update execution status to failed
      await ctx.runMutation(api.nodeExecutions.updateNodeExecution, {
        workflowId,
        nodeId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return null
  },
})

/**
 * Helper: Get Trigger.dev task ID for node type
 */
function getTaskIdForNodeType(nodeType: string): string | null {
  const taskIds: Record<string, string> = {
    youtube: 'youtube-analyzer',
    'web-search': 'web-search',
    'web-browser-agent': 'web-agent',
    summarizer: 'text-summarizer',
    'text-improver': 'text-improver',
    'concept-extractor': 'concept-extractor',
    'fact-check': 'fact-checker',
    'essay-grader': 'essay-grader',
    'study-plan': 'study-plan-generator',
  }

  return taskIds[nodeType] || null
}

/**
 * Helper: Extract PDF URLs from parent outputs
 */
function extractPdfUrlsFromParent(parentOutputs: any[]): string[] {
  const pdfUrls: string[] = []

  for (const parent of parentOutputs) {
    if (parent.nodeType === 'pdf' && parent.output?.files) {
      for (const file of parent.output.files) {
        if (file.url) {
          pdfUrls.push(file.url)
        }
      }
    }
  }

  return pdfUrls
}

/**
 * Helper: Extract original essay PDF URL from parent outputs (including passthrough from essay grader)
 */
function extractEssayPdfUrl(parentOutputs: any[]): string | undefined {
  // First check if any parent is a PDF node directly
  const directPdfUrls = extractPdfUrlsFromParent(parentOutputs)
  if (directPdfUrls.length > 0) {
    return directPdfUrls[0]
  }

  // Check if any parent (like essay grader) passed through an essay PDF URL
  for (const parent of parentOutputs) {
    if (parent.output?.essayPdfUrl) {
      return parent.output.essayPdfUrl
    }
  }

  return undefined
}

/**
 * Helper: Prepare payload for Trigger.dev tasks
 */
function prepareTaskPayload(
  nodeType: string,
  config: any,
  combinedInput: string,
  workflowId: string,
  nodeId: string,
  parentOutputs: any[]
) {
  const basePayload = { workflowId, nodeId }

  switch (nodeType) {
    case 'youtube':
      return {
        ...basePayload,
        urls: config.urls || [],
      }

    case 'web-search':
      return {
        ...basePayload,
        prompt: config.prompt || combinedInput,
      }

    case 'web-browser-agent':
      return {
        ...basePayload,
        startingPage: config.startingPage || 'https://www.google.com',
        instructions: config.instructions || combinedInput,
        headless: config.headless !== undefined ? config.headless : true,
      }

    case 'summarizer':
      return {
        ...basePayload,
        text: combinedInput,
      }

    case 'text-improver': {
      // Check if there's an original essay PDF URL from parent chain
      const essayPdfUrl = extractEssayPdfUrl(parentOutputs)

      // If we have a PDF URL, use that instead of combined text
      // This ensures we improve the original essay, not the grading feedback
      return {
        ...basePayload,
        text: essayPdfUrl ? '' : combinedInput, // Don't use text if we have PDF
        pdfUrl: essayPdfUrl,
        customPrompt: config.customPrompt,
      }
    }

    case 'concept-extractor': {
      const pdfUrls = extractPdfUrlsFromParent(parentOutputs)
      return {
        ...basePayload,
        text: combinedInput || '',
        pdfUrls,
      }
    }

    case 'fact-check': {
      const pdfUrls = extractPdfUrlsFromParent(parentOutputs)
      return {
        ...basePayload,
        text: combinedInput || '',
        pdfUrls,
      }
    }

    case 'essay-grader': {
      // Get essay PDF URL from parent output (if PDF reader was the parent)
      const pdfUrls = extractPdfUrlsFromParent(parentOutputs)
      const essayPdfUrl = pdfUrls[0] || ''

      // Get rubric from config (could be text or PDF URL)
      const rubric = config.rubricType === 'pdf' ? config.rubricPdfUrl || '' : config.rubricText || ''

      return {
        ...basePayload,
        essayPdfUrl,
        rubric,
        rubricType: config.rubricType || 'text',
      }
    }

    case 'study-plan':
      return {
        ...basePayload,
        topic: config.topic || '',
        duration: config.duration || '',
        learningStyle: config.learningStyle || '',
        goals: config.goals || '',
        currentLevel: config.currentLevel || '',
      }

    default:
      return {
        ...basePayload,
        input: combinedInput,
      }
  }
}
