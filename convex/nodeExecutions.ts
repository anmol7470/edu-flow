import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Node Execution Management
 * Handles saving and retrieving node configurations and execution states
 */

// ============================================
// NODE CONFIGURATION MUTATIONS & QUERIES
// ============================================

// Save node configuration
export const saveNodeConfig = mutation({
  args: {
    workflowId: v.string(),
    nodeId: v.string(),
    config: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('nodeConfigs')
      .withIndex('by_workflow_and_node', (q) => q.eq('workflowId', args.workflowId).eq('nodeId', args.nodeId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        config: args.config,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert('nodeConfigs', {
        workflowId: args.workflowId,
        nodeId: args.nodeId,
        config: args.config,
        updatedAt: Date.now(),
      })
    }

    return { success: true }
  },
})

// Get all node configurations for a workflow
export const getNodeConfigs = query({
  args: {
    workflowId: v.string(),
  },
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query('nodeConfigs')
      .withIndex('by_workflow', (q) => q.eq('workflowId', args.workflowId))
      .collect()

    return configs.reduce(
      (acc, c) => {
        acc[c.nodeId] = JSON.parse(c.config)
        return acc
      },
      {} as Record<string, any>
    )
  },
})

// ============================================
// NODE EXECUTION STATE MUTATIONS & QUERIES
// ============================================

// Update node execution status
export const updateNodeExecution = mutation({
  args: {
    workflowId: v.string(),
    nodeId: v.string(),
    status: v.string(),
    progress: v.optional(v.string()),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    runId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('nodeExecutions')
      .withIndex('by_workflow_and_node', (q) => q.eq('workflowId', args.workflowId).eq('nodeId', args.nodeId))
      .first()

    const now = Date.now()
    const data = {
      workflowId: args.workflowId,
      nodeId: args.nodeId,
      status: args.status,
      progress: args.progress,
      output: args.output,
      error: args.error,
      runId: args.runId,
      startedAt: existing?.startedAt || (args.status === 'running' ? now : undefined),
      completedAt: args.status === 'completed' || args.status === 'failed' ? now : undefined,
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
    } else {
      await ctx.db.insert('nodeExecutions', data)
    }

    return { success: true }
  },
})

// Get execution states for all nodes in a workflow
export const getNodeExecutions = query({
  args: {
    workflowId: v.string(),
  },
  handler: async (ctx, args) => {
    const executions = await ctx.db
      .query('nodeExecutions')
      .withIndex('by_workflow', (q) => q.eq('workflowId', args.workflowId))
      .collect()

    return executions.reduce(
      (acc, e) => {
        acc[e.nodeId] = {
          status: e.status,
          progress: e.progress,
          output: e.output ? JSON.parse(e.output) : null,
          error: e.error,
          runId: e.runId,
          startedAt: e.startedAt,
          completedAt: e.completedAt,
        }
        return acc
      },
      {} as Record<string, any>
    )
  },
})

// Get execution state for a specific node
export const getNodeExecution = query({
  args: {
    workflowId: v.string(),
    nodeId: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query('nodeExecutions')
      .withIndex('by_workflow_and_node', (q) => q.eq('workflowId', args.workflowId).eq('nodeId', args.nodeId))
      .first()

    if (!execution) {
      return null
    }

    return {
      status: execution.status,
      progress: execution.progress,
      output: execution.output ? JSON.parse(execution.output) : null,
      error: execution.error,
      runId: execution.runId,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
    }
  },
})

// Clear execution state for a node (useful for re-running)
export const clearNodeExecution = mutation({
  args: {
    workflowId: v.string(),
    nodeId: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query('nodeExecutions')
      .withIndex('by_workflow_and_node', (q) => q.eq('workflowId', args.workflowId).eq('nodeId', args.nodeId))
      .first()

    if (execution) {
      await ctx.db.delete(execution._id)
    }

    return { success: true }
  },
})

// Clear all execution states for a workflow
export const clearWorkflowExecutions = mutation({
  args: {
    workflowId: v.string(),
  },
  handler: async (ctx, args) => {
    const executions = await ctx.db
      .query('nodeExecutions')
      .withIndex('by_workflow', (q) => q.eq('workflowId', args.workflowId))
      .collect()

    for (const execution of executions) {
      await ctx.db.delete(execution._id)
    }

    return { success: true, cleared: executions.length }
  },
})
