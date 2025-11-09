import type { Edge, Node } from '@xyflow/react'

export type ValidationResult = {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export type ConfigValidationResult = {
  isValid: boolean
  unconfiguredNodes: Array<{
    nodeId: string
    nodeType: string
    label: string
    missingFields: string[]
  }>
}

/**
 * Validate the workflow structure for cycles, connectivity, and start node
 */
export function validateWorkflowStructure(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if Start node exists
  const startNode = nodes.find((n) => n.data?.type === 'start')
  if (!startNode) {
    errors.push('Workflow must have a Start node')
    return { isValid: false, errors, warnings }
  }

  // Build adjacency list for cycle detection
  const adjacencyList = new Map<string, string[]>()
  const incomingEdges = new Map<string, number>()

  // Initialize
  nodes.forEach((node) => {
    adjacencyList.set(node.id, [])
    incomingEdges.set(node.id, 0)
  })

  // Build graph
  edges.forEach((edge) => {
    const children = adjacencyList.get(edge.source) || []
    children.push(edge.target)
    adjacencyList.set(edge.source, children)
    incomingEdges.set(edge.target, (incomingEdges.get(edge.target) || 0) + 1)
  })

  // Check Start node has no incoming edges
  if ((incomingEdges.get(startNode.id) || 0) > 0) {
    errors.push('Start node cannot have incoming connections')
  }

  // Check for cycles using DFS
  const hasCycle = detectCycle(nodes, adjacencyList)
  if (hasCycle.found) {
    errors.push(`Workflow contains a cycle involving: ${hasCycle.nodes.join(' → ')}`)
  }

  // Check all non-start nodes have at least one incoming edge
  const disconnectedNodes: string[] = []
  nodes.forEach((node) => {
    if (node.data?.type !== 'start' && (incomingEdges.get(node.id) || 0) === 0) {
      disconnectedNodes.push((node.data?.label as string) || node.id)
    }
  })

  if (disconnectedNodes.length > 0) {
    errors.push(`The following nodes are disconnected: ${disconnectedNodes.join(', ')}`)
  }

  // Check if all nodes are reachable from Start
  const reachableNodes = getReachableNodes(startNode.id, adjacencyList)
  const unreachableNodes: string[] = []
  nodes.forEach((node) => {
    if (node.id !== startNode.id && !reachableNodes.has(node.id)) {
      unreachableNodes.push((node.data?.label as string) || node.id)
    }
  })

  if (unreachableNodes.length > 0) {
    errors.push(`The following nodes are not reachable from Start: ${unreachableNodes.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Detect cycles in the workflow graph using DFS
 */
function detectCycle(nodes: Node[], adjacencyList: Map<string, string[]>): { found: boolean; nodes: string[] } {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)
    path.push(nodeId)

    const neighbors = adjacencyList.get(nodeId) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true
        }
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        path.push(neighbor)
        return true
      }
    }

    recursionStack.delete(nodeId)
    path.pop()
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        // Extract cycle from path
        const cycleStartIndex = path.indexOf(path[path.length - 1])
        const cycleNodes = path.slice(cycleStartIndex).map((id) => {
          const node = nodes.find((n) => n.id === id)
          return ((node?.data?.label as string) || id) as string
        })
        return { found: true, nodes: cycleNodes }
      }
    }
  }

  return { found: false, nodes: [] }
}

/**
 * Get all nodes reachable from a starting node using BFS
 */
function getReachableNodes(startId: string, adjacencyList: Map<string, string[]>): Set<string> {
  const reachable = new Set<string>()
  const queue = [startId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (reachable.has(current)) continue

    reachable.add(current)
    const neighbors = adjacencyList.get(current) || []
    neighbors.forEach((neighbor) => queue.push(neighbor))
  }

  return reachable
}

/**
 * Validate that all nodes have required configurations
 */
export function validateNodeConfigurations(nodes: Node[], nodeConfigs: Record<string, any>): ConfigValidationResult {
  const unconfiguredNodes: ConfigValidationResult['unconfiguredNodes'] = []

  nodes.forEach((node) => {
    const nodeType = node.data?.type as string
    const config = nodeConfigs[node.id]
    const missingFields: string[] = []

    // Skip validation for start node and output-only nodes
    if (nodeType === 'start') return

    switch (nodeType) {
      case 'youtube':
        if (!config?.urls || !Array.isArray(config.urls) || config.urls.length === 0) {
          missingFields.push('YouTube URLs')
        }
        break

      case 'pdf':
        if (!config?.files || !Array.isArray(config.files) || config.files.length === 0) {
          missingFields.push('PDF files')
        }
        break

      case 'web-search':
        if (!config?.prompt || config.prompt.trim() === '') {
          missingFields.push('Search prompt')
        }
        break

      case 'text-improver':
        // Text improver can optionally have a custom prompt
        // But it requires input from previous nodes, which we'll check at runtime
        break

      case 'essay-grader':
        // Check if rubric is configured (either text or PDF)
        const hasTextRubric = config?.rubricType === 'text' && config?.rubricText?.trim()
        const hasPdfRubric = config?.rubricType === 'pdf' && config?.rubricPdfUrl
        
        if (!hasTextRubric && !hasPdfRubric) {
          missingFields.push('Grading rubric')
        }
        break

      case 'study-plan':
        if (!config?.topic || config.topic.trim() === '') {
          missingFields.push('Study topic')
        }
        if (!config?.duration || config.duration.trim() === '') {
          missingFields.push('Duration')
        }
        if (!config?.learningStyle || config.learningStyle.trim() === '') {
          missingFields.push('Learning style')
        }
        if (!config?.goals || config.goals.trim() === '') {
          missingFields.push('Goals')
        }
        if (!config?.currentLevel || config.currentLevel.trim() === '') {
          missingFields.push('Current level')
        }
        break

      case 'summarizer':
      case 'concept-extractor':
      case 'fact-check':
        // These nodes require input from previous nodes
        // No configuration needed from user
        break

      default:
        // Unknown node type - skip validation
        break
    }

    if (missingFields.length > 0) {
      unconfiguredNodes.push({
        nodeId: node.id,
        nodeType,
        label: (node.data?.label as string) || node.id,
        missingFields,
      })
    }
  })

  return {
    isValid: unconfiguredNodes.length === 0,
    unconfiguredNodes,
  }
}
