import { api } from '@/convex/_generated/api'
import { validateNodeConfigurations, validateWorkflowStructure } from '@/lib/workflow-validation'
import { fetchMutation } from 'convex/nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workflowId, nodes: nodesStr, edges: edgesStr, nodeConfigs } = body

    if (!workflowId || !nodesStr || !edgesStr) {
      return NextResponse.json({ error: 'Invalid request body', success: false }, { status: 400 })
    }

    const nodes = JSON.parse(nodesStr)
    const edges = JSON.parse(edgesStr)

    // Validate workflow structure
    const structureValidation = validateWorkflowStructure(nodes, edges)
    if (!structureValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Workflow validation failed',
          validationErrors: structureValidation.errors,
        },
        { status: 400 }
      )
    }

    // Validate node configurations
    const configValidation = validateNodeConfigurations(nodes, nodeConfigs || {})
    if (!configValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Configuration validation failed',
          configErrors: configValidation.unconfiguredNodes,
        },
        { status: 400 }
      )
    }

    // Start workflow execution via Convex
    const result = await fetchMutation(api.workflowEngine.startWorkflowExecution, {
      workflowId,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error starting workflow:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start workflow',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
