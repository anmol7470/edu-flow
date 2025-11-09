'use node'

import { logger, task } from '@trigger.dev/sdk/v3'

type WebAgentPayload = {
  startingPage: string
  instructions: string
  headless?: boolean
  nodeId: string
  workflowId: string
}

type AgentApiResponse = {
  success: boolean
  response: string | null
  error?: string
  steps_executed: number
  session_id?: string
  act_id?: string
  parsed_response?: any
  valid_json?: boolean
}

export const webAgentTask = task({
  id: 'web-agent',
  maxDuration: 1800, // 30 minutes for complex browser automation
  run: async (payload: WebAgentPayload, { ctx }) => {
    const { startingPage, instructions, headless = true, nodeId, workflowId } = payload

    logger.log('Starting web agent', {
      nodeId,
      startingPage,
      instructionsLength: instructions.length,
      headless,
    })

    // Update status to running
    await updateConvexStatus(workflowId, nodeId, {
      status: 'running',
      progress: 'Initializing browser agent...',
      runId: ctx.run.id,
    })

    try {
      // Call Nova Act API server
      const novaActApiUrl = process.env.NOVA_ACT_API_URL || 'http://localhost:8001'

      logger.log('Calling Nova Act API', { apiUrl: novaActApiUrl })

      await updateConvexStatus(workflowId, nodeId, {
        status: 'running',
        progress: 'Executing browser actions...',
      })

      const response = await fetch(`${novaActApiUrl}/agent/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          starting_page: startingPage,
          instructions,
          headless,
        }),
      })

      if (!response.ok) {
        throw new Error(`Nova Act API returned ${response.status}: ${response.statusText}`)
      }

      const agentResult: AgentApiResponse = await response.json()

      if (!agentResult.success) {
        throw new Error(agentResult.error || 'Unknown error from web agent')
      }

      logger.log('Web agent completed', {
        stepsExecuted: agentResult.steps_executed,
        sessionId: agentResult.session_id,
        hasResponse: !!agentResult.response,
      })

      // Prepare output
      const output = {
        response: agentResult.response,
        stepsExecuted: agentResult.steps_executed,
        sessionId: agentResult.session_id,
        actId: agentResult.act_id,
        parsedResponse: agentResult.parsed_response,
        validJson: agentResult.valid_json,
        startingPage,
        instructions,
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
      logger.error('Failed to execute web agent', { error: errorMessage })
      await updateConvexStatus(workflowId, nodeId, {
        status: 'failed',
        error: `Failed to execute web agent: ${errorMessage}`,
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
