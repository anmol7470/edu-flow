'use node'

import { v } from 'convex/values'
import { api } from './_generated/api'
import { internalAction } from './_generated/server'
import { tasks } from '@trigger.dev/sdk/v3'

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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workflowId, nodeId, nodeType, config, combinedInput } = args

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
      const payload = prepareTaskPayload(nodeType, config, combinedInput, workflowId, nodeId)
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
 * Helper: Prepare payload for Trigger.dev tasks
 */
function prepareTaskPayload(
  nodeType: string,
  config: any,
  combinedInput: string,
  workflowId: string,
  nodeId: string
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

    case 'summarizer':
      return {
        ...basePayload,
        text: combinedInput,
      }

    case 'text-improver':
      return {
        ...basePayload,
        text: combinedInput,
        customPrompt: config.customPrompt,
      }

    case 'concept-extractor':
      return {
        ...basePayload,
        text: combinedInput,
      }

    case 'fact-check':
      return {
        ...basePayload,
        text: combinedInput,
      }

    case 'essay-grader':
      return {
        ...basePayload,
        essayText: config.essayText || combinedInput,
        rubric: config.rubric || '',
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

