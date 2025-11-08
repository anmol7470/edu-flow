import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Create a new workflow
export const createWorkflow = mutation({
  args: {
    workflowId: v.string(),
    userId: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Create a default start node
    const startNode = {
      id: `start-${now}`,
      type: 'workflow',
      position: { x: 250, y: 150 },
      data: {
        label: 'Start',
        type: 'start',
      },
    }

    const _id = await ctx.db.insert('workflows', {
      workflowId: args.workflowId,
      userId: args.userId,
      title: args.title || 'New Workflow',
      nodes: JSON.stringify([startNode]),
      edges: JSON.stringify([]),
      createdAt: now,
      updatedAt: now,
    })
    return { success: true, _id }
  },
})

// Save or update workflow state
export const saveWorkflow = mutation({
  args: {
    workflowId: v.string(),
    userId: v.string(),
    nodes: v.string(), // JSON stringified
    edges: v.string(), // JSON stringified
  },
  handler: async (ctx, args) => {
    // Check if workflow already exists
    const existing = await ctx.db
      .query('workflows')
      .withIndex('by_workflow_id', (q) => q.eq('workflowId', args.workflowId))
      .first()

    const now = Date.now()

    if (existing) {
      // Update existing workflow
      await ctx.db.patch(existing._id, {
        nodes: args.nodes,
        edges: args.edges,
        updatedAt: now,
      })
      return { success: true, _id: existing._id }
    } else {
      // Create new workflow
      const _id = await ctx.db.insert('workflows', {
        workflowId: args.workflowId,
        userId: args.userId,
        title: 'New Workflow',
        nodes: args.nodes,
        edges: args.edges,
        createdAt: now,
        updatedAt: now,
      })
      return { success: true, _id }
    }
  },
})

// Load workflow by ID
export const getWorkflow = query({
  args: {
    workflowId: v.string(),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db
      .query('workflows')
      .withIndex('by_workflow_id', (q) => q.eq('workflowId', args.workflowId))
      .first()

    if (!workflow) {
      throw new ConvexError('Workflow not found')
    }

    return {
      workflowId: workflow.workflowId,
      userId: workflow.userId,
      title: workflow.title || 'New Workflow',
      nodes: workflow.nodes,
      edges: workflow.edges,
      updatedAt: workflow.updatedAt,
      createdAt: workflow.createdAt,
    }
  },
})

// Get all workflows for a user
export const getUserWorkflows = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const workflows = await ctx.db
      .query('workflows')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    return workflows.map((w) => ({
      workflowId: w.workflowId,
      title: w.title || 'New Workflow',
      updatedAt: w.updatedAt,
      createdAt: w.createdAt,
    }))
  },
})

// Update workflow title
export const updateWorkflowTitle = mutation({
  args: {
    workflowId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db
      .query('workflows')
      .withIndex('by_workflow_id', (q) => q.eq('workflowId', args.workflowId))
      .first()

    if (!workflow) {
      throw new ConvexError('Workflow not found')
    }

    await ctx.db.patch(workflow._id, {
      title: args.title,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// Delete workflow
export const deleteWorkflow = mutation({
  args: {
    workflowId: v.string(),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db
      .query('workflows')
      .withIndex('by_workflow_id', (q) => q.eq('workflowId', args.workflowId))
      .first()

    if (!workflow) {
      throw new ConvexError('Workflow not found')
    }

    await ctx.db.delete(workflow._id)

    return { success: true }
  },
})
