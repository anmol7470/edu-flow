'use client'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { availableNodeTypes, nodeConfig } from '@/lib/nodes'
import { cn } from '@/lib/utils'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CheckCircle2, Circle, Loader2, RefreshCw, Settings, Trash2, XCircle } from 'lucide-react'
import { memo } from 'react'

type NodeData = {
  label?: string
  type?: string
  onDelete?: (id: string) => void
  onReplace?: (id: string, newType: string) => void
  config?: { urls?: string[] }
  execution?: {
    status?: 'idle' | 'running' | 'completed' | 'failed'
    progress?: string
    output?: any
    error?: string
  }
  isSelected?: boolean
  onSelect?: () => void
}

export const WorkflowNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as NodeData
  const label = nodeData?.label || 'Node'
  const type = nodeData?.type || 'default'
  const config = nodeConfig[type] || nodeConfig.default
  const Icon = config.icon
  const isStartNode = type === 'start'
  const execution = nodeData?.execution
  const hasConfig = nodeData?.config && Object.keys(nodeData.config).length > 0

  // Status icon mapping
  const statusIcon = {
    running: <Loader2 className="h-3 w-3 animate-spin text-blue-600" />,
    completed: <CheckCircle2 className="h-3 w-3 text-green-600" />,
    failed: <XCircle className="h-3 w-3 text-red-600" />,
    idle: <Circle className="h-3 w-3 text-gray-400" />,
  }[execution?.status || 'idle']

  const handleDelete = () => {
    if (nodeData?.onDelete && !isStartNode) {
      nodeData.onDelete(id)
    }
  }

  const handleReplace = (newType: string) => {
    if (nodeData?.onReplace && !isStartNode) {
      nodeData.onReplace(id, newType)
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group relative min-w-[240px]">
          {/* Target handles (inputs) */}
          <Handle
            type="target"
            position={Position.Top}
            id="target-top"
            className={cn(
              'h-2! w-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              selected && 'opacity-100',
              'hover:h-3! hover:w-3!'
            )}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="target-left"
            className={cn(
              'h-2! w-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              selected && 'opacity-100',
              'hover:h-3! hover:w-3!'
            )}
          />
          <Handle
            type="target"
            position={Position.Right}
            id="target-right"
            className={cn(
              'h-2! w-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              selected && 'opacity-100',
              'hover:h-3! hover:w-3!'
            )}
          />

          {/* Node content */}
          <div
            className={cn(
              'rounded-xl border-2 transition-all duration-200',
              'shadow-sm hover:shadow-md',
              'border-gray-200 bg-white',
              selected && 'border-blue-300 ring-2 ring-blue-500 ring-offset-2'
            )}
          >
            <div className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={cn('rounded-lg p-2 transition-colors', 'bg-white shadow-sm', config.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">{label}</div>
                </div>
                <div className="flex items-center gap-1">
                  {statusIcon}
                  {hasConfig && !isStartNode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        nodeData?.onSelect?.()
                      }}
                      className="rounded p-1 hover:bg-gray-100"
                      title="Configure node"
                    >
                      <Settings className="h-3 w-3 text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress indicator */}
              {execution?.progress && (
                <div className="text-xs text-gray-600 italic">{execution.progress}</div>
              )}

              {/* Config indicator */}
              {hasConfig && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {type === 'youtube' && nodeData.config?.urls && (
                    <span>{nodeData.config.urls.length} video(s)</span>
                  )}
                </div>
              )}

              {/* Output preview */}
              {execution?.status === 'completed' && execution?.output && (
                <div className="rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-800">
                  ✓ Output ready
                </div>
              )}

              {/* Error display */}
              {execution?.status === 'failed' && execution?.error && (
                <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800">
                  ✗ {execution.error}
                </div>
              )}
            </div>
          </div>

          {/* Source handles (outputs) */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="source-bottom"
            className={cn(
              'h-2! w-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              selected && 'opacity-100',
              'hover:h-3! hover:w-3!'
            )}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="source-left"
            className={cn(
              'h-2! w-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              selected && 'opacity-100',
              'hover:h-3! hover:w-3!'
            )}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="source-right"
            className={cn(
              'h-2! w-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              selected && 'opacity-100',
              'hover:h-3! hover:w-3!'
            )}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {!isStartNode && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <RefreshCw className="mr-2 h-4 w-4" />
                Replace with
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {availableNodeTypes.map((nodeType) => {
                  const nodeTypeConfig = nodeConfig[nodeType.id] || nodeConfig.default
                  const NodeIcon = nodeTypeConfig.icon
                  return (
                    <ContextMenuItem
                      key={nodeType.id}
                      onClick={() => handleReplace(nodeType.id)}
                      disabled={type === nodeType.id}
                    >
                      <NodeIcon className="h-4 w-4" />
                      {nodeType.label}
                    </ContextMenuItem>
                  )
                })}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Delete Node
            </ContextMenuItem>
          </>
        )}
        {isStartNode && (
          <div className="text-muted-foreground px-2 py-6 text-center text-sm">Start node cannot be modified</div>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
})

WorkflowNode.displayName = 'WorkflowNode'
