import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation, mutation } from './_generated/server'

type NodeOutput = {
  nodeId: string
  nodeType: string
  nodeLabel: string
  output: unknown
}

/**
 * Start workflow execution
 * Main entry point for running a workflow
 */
export const startWorkflowExecution = mutation({
  args: {
    workflowId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    triggeredNodes: v.optional(v.array(v.string())),
  }),
  handler: async (ctx, args) => {
    // Get workflow
    const workflow = await ctx.db
      .query('workflows')
      .withIndex('by_workflow_id', (q) => q.eq('workflowId', args.workflowId))
      .first()

    if (!workflow) {
      throw new ConvexError('Workflow not found')
    }

    const nodes = JSON.parse(workflow.nodes)
    const edges = JSON.parse(workflow.edges)

    // Find start node
    const startNode = nodes.find((n: any) => n.data?.type === 'start')
    if (!startNode) {
      throw new ConvexError('Start node not found')
    }

    // Build dependency graph
    const { childMap } = buildDependencyGraph(nodes, edges)

    // Get all nodes directly connected to Start
    const rootNodes = childMap.get(startNode.id) || []

    if (rootNodes.length === 0) {
      return {
        success: false,
        message: 'No nodes connected to Start node. Add nodes and connect them to start the workflow.',
      }
    }

    // Clear previous execution states
    const existingExecutions = await ctx.db
      .query('nodeExecutions')
      .withIndex('by_workflow', (q) => q.eq('workflowId', args.workflowId))
      .collect()

    for (const execution of existingExecutions) {
      await ctx.db.delete(execution._id)
    }

    // Mark Start node as completed
    await ctx.db.insert('nodeExecutions', {
      workflowId: args.workflowId,
      nodeId: startNode.id,
      status: 'completed',
      startedAt: Date.now(),
      completedAt: Date.now(),
    })

    // Get node configs
    const nodeConfigs = await ctx.db
      .query('nodeConfigs')
      .withIndex('by_workflow', (q) => q.eq('workflowId', args.workflowId))
      .collect()

    const configMap = nodeConfigs.reduce(
      (acc, c) => {
        acc[c.nodeId] = JSON.parse(c.config)
        return acc
      },
      {} as Record<string, any>
    )

    // Trigger all root nodes in parallel
    const triggeredNodes: string[] = []
    for (const rootNodeId of rootNodes) {
      const rootNode = nodes.find((n: any) => n.id === rootNodeId)
      if (!rootNode) continue

      const nodeType = rootNode.data?.type
      const config = configMap[rootNodeId]

      // Trigger the node
      await ctx.scheduler.runAfter(0, internal.workflowEngine.triggerNodeInternal, {
        workflowId: args.workflowId,
        nodeId: rootNodeId,
        nodeType,
        config: config || {},
        parentOutputs: [], // No parent outputs for root nodes
      })

      triggeredNodes.push(rootNode.data?.label || rootNodeId)
    }

    return {
      success: true,
      message: `Workflow started! Triggered ${triggeredNodes.length} node(s): ${triggeredNodes.join(', ')}`,
      triggeredNodes,
    }
  },
})

/**
 * Internal mutation to trigger a node execution
 * Called by the scheduler to actually execute nodes
 */
export const triggerNodeInternal = internalMutation({
  args: {
    workflowId: v.string(),
    nodeId: v.string(),
    nodeType: v.string(),
    config: v.any(),
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
    const { workflowId, nodeId, nodeType, config, parentOutputs } = args

    // Mark node as running
    await ctx.db.insert('nodeExecutions', {
      workflowId,
      nodeId,
      status: 'running',
      startedAt: Date.now(),
    })

    // Prepare the API call based on node type
    const apiEndpoint = getApiEndpointForNodeType(nodeType)
    if (!apiEndpoint) {
      // Mark as failed
      const execution = await ctx.db
        .query('nodeExecutions')
        .withIndex('by_workflow_and_node', (q) => q.eq('workflowId', workflowId).eq('nodeId', nodeId))
        .first()

      if (execution) {
        await ctx.db.patch(execution._id, {
          status: 'failed',
          error: `Unknown node type: ${nodeType}`,
          completedAt: Date.now(),
        })
      }
      return null
    }

    // Combine parent outputs if needed
    const combinedInput = combineNodeOutputs(parentOutputs)

    // Make HTTP request to trigger the task
    try {
      const convexSiteUrl = process.env.CONVEX_SITE_URL
      if (!convexSiteUrl) {
        throw new Error('CONVEX_SITE_URL not configured')
      }

      // Schedule an action to trigger the task
      await ctx.scheduler.runAfter(0, internal.workflowActions.triggerNodeApi, {
        workflowId,
        nodeId,
        nodeType,
        config,
        combinedInput,
        apiEndpoint,
      })
    } catch (error) {
      const execution = await ctx.db
        .query('nodeExecutions')
        .withIndex('by_workflow_and_node', (q) => q.eq('workflowId', workflowId).eq('nodeId', nodeId))
        .first()

      if (execution) {
        await ctx.db.patch(execution._id, {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completedAt: Date.now(),
        })
      }
    }

    return null
  },
})

/**
 * Check and trigger dependent nodes when a node completes
 */
export const checkAndTriggerDependents = internalMutation({
  args: {
    workflowId: v.string(),
    completedNodeId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workflowId, completedNodeId } = args

    // Get workflow
    const workflow = await ctx.db
      .query('workflows')
      .withIndex('by_workflow_id', (q) => q.eq('workflowId', workflowId))
      .first()

    if (!workflow) {
      return null
    }

    const nodes = JSON.parse(workflow.nodes)
    const edges = JSON.parse(workflow.edges)

    // Build dependency graph
    const { parentMap, childMap } = buildDependencyGraph(nodes, edges)

    // Get children of completed node
    const children = childMap.get(completedNodeId) || []

    if (children.length === 0) {
      return null // No dependents
    }

    // Get all node executions
    const executions = await ctx.db
      .query('nodeExecutions')
      .withIndex('by_workflow', (q) => q.eq('workflowId', workflowId))
      .collect()

    const executionMap = executions.reduce(
      (acc, e) => {
        acc[e.nodeId] = {
          status: e.status,
          output: e.output ? JSON.parse(e.output) : null,
        }
        return acc
      },
      {} as Record<string, any>
    )

    // Get node configs
    const nodeConfigs = await ctx.db
      .query('nodeConfigs')
      .withIndex('by_workflow', (q) => q.eq('workflowId', workflowId))
      .collect()

    const configMap = nodeConfigs.reduce(
      (acc, c) => {
        acc[c.nodeId] = JSON.parse(c.config)
        return acc
      },
      {} as Record<string, any>
    )

    // Check each child to see if it's ready to execute
    const nodesToTrigger: string[] = []

    for (const childId of children) {
      // Check if already running or completed
      const childExecution = executionMap[childId]
      if (childExecution && (childExecution.status === 'running' || childExecution.status === 'completed')) {
        continue // Skip already processed nodes
      }

      // Check if all parents are completed
      const parents = parentMap.get(childId) || []
      const allParentsCompleted = parents.every((parentId) => {
        const parentExecution = executionMap[parentId]
        return parentExecution && parentExecution.status === 'completed'
      })

      if (allParentsCompleted) {
        nodesToTrigger.push(childId)
      }
    }

    // Trigger all ready nodes in parallel
    for (const nodeIdToTrigger of nodesToTrigger) {
      const node = nodes.find((n: any) => n.id === nodeIdToTrigger)
      if (!node) continue

      const nodeType = node.data?.type
      const config = configMap[nodeIdToTrigger]

      // Collect parent outputs
      const parents = parentMap.get(nodeIdToTrigger) || []
      const parentOutputs: NodeOutput[] = parents
        .map((parentId) => {
          const parentNode = nodes.find((n: any) => n.id === parentId)
          const parentExecution = executionMap[parentId]
          if (!parentNode || !parentExecution || !parentExecution.output) return null

          return {
            nodeId: parentId,
            nodeType: parentNode.data?.type || 'unknown',
            nodeLabel: parentNode.data?.label || parentId,
            output: parentExecution.output,
          }
        })
        .filter(Boolean) as NodeOutput[]

      // Trigger the node
      await ctx.scheduler.runAfter(0, internal.workflowEngine.triggerNodeInternal, {
        workflowId,
        nodeId: nodeIdToTrigger,
        nodeType,
        config: config || {},
        parentOutputs,
      })
    }

    return null
  },
})

/**
 * Helper: Build dependency graph
 */
function buildDependencyGraph(nodes: any[], edges: any[]) {
  const parentMap = new Map<string, string[]>()
  const childMap = new Map<string, string[]>()

  nodes.forEach((node: any) => {
    parentMap.set(node.id, [])
    childMap.set(node.id, [])
  })

  edges.forEach((edge: any) => {
    const parents = parentMap.get(edge.target) || []
    parents.push(edge.source)
    parentMap.set(edge.target, parents)

    const children = childMap.get(edge.source) || []
    children.push(edge.target)
    childMap.set(edge.source, children)
  })

  return { parentMap, childMap }
}

/**
 * Helper: Get API endpoint for node type
 */
function getApiEndpointForNodeType(nodeType: string): string | null {
  const endpoints: Record<string, string> = {
    youtube: '/api/trigger-youtube',
    pdf: '/api/trigger-pdf',
    'web-search': '/api/trigger-web-search',
    summarizer: '/api/trigger-text-summarizer',
    'text-improver': '/api/trigger-text-improver',
    'concept-extractor': '/api/trigger-concept-extractor',
    'fact-check': '/api/trigger-fact-checker',
    'essay-grader': '/api/trigger-essay-grader',
    'study-plan': '/api/trigger-study-plan',
  }

  return endpoints[nodeType] || null
}

/**
 * Helper: Combine node outputs
 */
function combineNodeOutputs(parentOutputs: NodeOutput[]): string {
  if (parentOutputs.length === 0) {
    return ''
  }

  if (parentOutputs.length === 1) {
    const parent = parentOutputs[0]
    return extractTextFromOutput(parent.output, parent.nodeType)
  }

  const combined = parentOutputs
    .map((parent, index) => {
      const text = extractTextFromOutput(parent.output, parent.nodeType)
      if (!text) return null

      const separator = `=== Source ${index + 1}: ${parent.nodeLabel} (${parent.nodeType}) ===`
      return `${separator}\n\n${text}`
    })
    .filter(Boolean)
    .join('\n\n\n')

  return combined
}

/**
 * Helper: Extract text from various output formats
 */
function extractTextFromOutput(output: any, nodeType: string): string {
  if (!output) return ''

  switch (nodeType) {
    case 'youtube':
      if (output.videos && Array.isArray(output.videos)) {
        return output.videos
          .map((video: any) => {
            const header = `Video: ${video.title || 'Untitled'}`
            const transcript = video.transcript || ''
            return `${header}\n\n${transcript}`
          })
          .join('\n\n---\n\n')
      }
      return ''

    case 'pdf':
      return output.text || ''

    case 'web-search':
      return output.generatedText || output.text || ''

    case 'summarizer':
      return output.summary || ''

    case 'text-improver':
      return output.improvedText || ''

    case 'concept-extractor':
      return output.concepts || ''

    case 'fact-check':
      if (output.results && Array.isArray(output.results)) {
        return output.results
          .map((result: any) => {
            return `Claim: ${result.claim}\nVerification: ${result.verification}`
          })
          .join('\n\n---\n\n')
      }
      return ''

    case 'essay-grader':
      return output.feedback || ''

    case 'study-plan':
      return output.studyPlan || ''

    default:
      if (typeof output === 'string') return output
      if (output.text) return output.text
      return JSON.stringify(output)
  }
}
