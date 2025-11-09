/**
 * Workflow execution utilities for combining node outputs and handling data flow
 */

type NodeOutput = {
  nodeId: string
  nodeType: string
  nodeLabel: string
  output: unknown
}

type FilePart = {
  type: 'file'
  data: string // URL
  mediaType?: string
}

/**
 * Extract text content from various node output formats
 */
export function extractTextFromOutput(output: unknown, nodeType: string): string {
  if (!output) return ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = output as any

  switch (nodeType) {
    case 'youtube': {
      // YouTube analyzer output: { videos: [...], videoCount, totalWords }
      if (data.videos && Array.isArray(data.videos)) {
        return data.videos
          .map((video: any) => {
            const header = `Video: ${video.title || 'Untitled'} (${video.url || 'No URL'})`
            const transcript = video.transcript || ''
            return `${header}\n\n${transcript}`
          })
          .join('\n\n---\n\n')
      }
      return ''
    }

    case 'pdf': {
      // PDF reader output: { files: Array<{url, name, storageId}>, fileCount }
      // PDFs are passed as file URLs directly to AI models, not as text
      // Return empty string since files are handled separately
      return ''
    }

    case 'web-search': {
      // Web search output: { generatedText, sources, sourceCount }
      return data.generatedText || data.text || ''
    }

    case 'summarizer': {
      // Text summarizer output: { summary, originalLength, summaryLength }
      return data.summary || ''
    }

    case 'text-improver': {
      // Text improver output: { improvedText, originalText }
      return data.improvedText || ''
    }

    case 'concept-extractor': {
      // Concept extractor output: { concepts, sourceTextLength }
      return data.concepts || ''
    }

    case 'fact-check': {
      // Fact checker output: { results, sources, claimsChecked }
      if (data.results && Array.isArray(data.results)) {
        return data.results
          .map((result: any) => {
            return `Claim: ${result.claim}\nVerification: ${result.verification}\nAccurate: ${result.isAccurate ? 'Yes' : 'No'}`
          })
          .join('\n\n---\n\n')
      }
      return ''
    }

    case 'essay-grader': {
      // Essay grader output: { overallGrade, feedback }
      const grade = data.overallGrade ? `Grade: ${data.overallGrade}\n\n` : ''
      return `${grade}${data.feedback || ''}`
    }

    case 'study-plan': {
      // Study plan output: { studyPlan, sources }
      return data.studyPlan || ''
    }

    default:
      // Try to extract text from common fields
      if (typeof data === 'string') return data
      if (data.text) return data.text
      if (data.content) return data.content
      if (data.output) return data.output
      return JSON.stringify(data, null, 2)
  }
}

/**
 * Extract file parts from parent outputs (for PDF files)
 */
export function extractFileParts(parentOutputs: NodeOutput[]): FilePart[] {
  const fileParts: FilePart[] = []

  for (const parent of parentOutputs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = parent.output as any
    if (parent.nodeType === 'pdf' && output?.files) {
      for (const file of output.files) {
        if (file.url) {
          fileParts.push({
            type: 'file',
            data: file.url,
            mediaType: 'application/pdf',
          })
        }
      }
    }
  }

  return fileParts
}

/**
 * Combine multiple parent node outputs into a single text payload
 */
export function combineNodeOutputs(parentOutputs: NodeOutput[]): string {
  if (parentOutputs.length === 0) {
    return ''
  }

  if (parentOutputs.length === 1) {
    const parent = parentOutputs[0]
    return extractTextFromOutput(parent.output, parent.nodeType)
  }

  // Multiple parents - combine with separators and metadata
  // Skip PDF outputs as they're handled as file parts
  const combined = parentOutputs
    .filter((parent) => parent.nodeType !== 'pdf')
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
 * Build dependency graph from nodes and edges
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildDependencyGraph(nodes: any[], edges: any[]) {
  const parentMap = new Map<string, string[]>() // node -> its parents
  const childMap = new Map<string, string[]>() // node -> its children

  // Initialize maps
  nodes.forEach((node) => {
    parentMap.set(node.id, [])
    childMap.set(node.id, [])
  })

  // Build relationships
  edges.forEach((edge) => {
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
 * Get node label for display purposes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNodeLabel(nodeId: string, nodes: any[]): string {
  const node = nodes.find((n) => n.id === nodeId)
  return node?.data?.label || nodeId
}

/**
 * Get node type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNodeType(nodeId: string, nodes: any[]): string {
  const node = nodes.find((n) => n.id === nodeId)
  return node?.data?.type || 'unknown'
}
