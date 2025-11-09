import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  workflows: defineTable({
    workflowId: v.string(),
    userId: v.string(),
    title: v.string(),
    nodes: v.string(), // JSON stringified nodes array
    edges: v.string(), // JSON stringified edges array
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_workflow_id', ['workflowId'])
    .index('by_user', ['userId']),

  // Node configurations (generalized for all node types)
  nodeConfigs: defineTable({
    workflowId: v.string(),
    nodeId: v.string(),
    config: v.string(), // JSON: YouTube = { urls: [] }, PDF = { fileIds: [] }, etc.
    updatedAt: v.number(),
  })
    .index('by_workflow_and_node', ['workflowId', 'nodeId'])
    .index('by_workflow', ['workflowId']),

  // Node execution state and results
  nodeExecutions: defineTable({
    workflowId: v.string(),
    nodeId: v.string(),
    runId: v.optional(v.string()), // Trigger.dev run ID
    status: v.string(), // 'idle' | 'running' | 'completed' | 'failed'
    progress: v.optional(v.string()), // "Fetching video 1/2..."
    output: v.optional(v.string()), // JSON result to pass to next node
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_workflow_and_node', ['workflowId', 'nodeId'])
    .index('by_workflow', ['workflowId']),
})
