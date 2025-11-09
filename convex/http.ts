import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'
import { authComponent, createAuth } from './auth'

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

// HTTP endpoint for Trigger.dev to update node execution status
// This is called by Trigger.dev tasks to save execution state to Convex
http.route({
  path: '/updateNodeExecution',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.json()
    const { workflowId, nodeId, status, progress, output, error, runId } = body

    // Call the mutation to save state to database
    await ctx.runMutation(api.nodeExecutions.updateNodeExecution, {
      workflowId,
      nodeId,
      status,
      progress,
      output,
      error,
      runId,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
})

export default http
