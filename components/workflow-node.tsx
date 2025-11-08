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
import { RefreshCw, Trash2 } from 'lucide-react'
import { memo } from 'react'

type NodeData = {
  label?: string
  type?: string
  onDelete?: (id: string) => void
  onReplace?: (id: string, newType: string) => void
}

export const WorkflowNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as NodeData
  const label = nodeData?.label || 'Node'
  const type = nodeData?.type || 'default'
  const config = nodeConfig[type] || nodeConfig.default
  const Icon = config.icon

  const handleDelete = () => {
    if (nodeData?.onDelete) {
      nodeData.onDelete(id)
    }
  }

  const handleReplace = (newType: string) => {
    if (nodeData?.onReplace) {
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
            <div className="flex items-center gap-3 px-4 py-3">
              <div className={cn('rounded-lg p-2 transition-colors', 'bg-white shadow-sm', config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">{label}</div>
              </div>
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
      </ContextMenuContent>
    </ContextMenu>
  )
})

WorkflowNode.displayName = 'WorkflowNode'
