'use client'

import { Logo } from '@/components/logo'
import { Input } from '@/components/ui/input'
import { availableNodeTypes, nodeConfig } from '@/lib/nodes'
import { cn } from '@/lib/utils'
import { useNodes } from '@xyflow/react'
import { Home, Search as SearchIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function WorkflowSidebar() {
  const nodes = useNodes()
  const [searchQuery, setSearchQuery] = useState('')

  const nodeTypes = availableNodeTypes.map((node) => ({
    id: node.id,
    label: node.label,
    Icon: nodeConfig[node.id]?.icon || nodeConfig.default.icon,
  }))

  // Check if a start node already exists
  const hasStartNode = nodes.some((node) => node.data?.type === 'start')

  // Filter nodes based on search query
  const filteredNodes = nodeTypes.filter((node) => node.label.toLowerCase().includes(searchQuery.toLowerCase()))

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="bg-muted/30 border-border flex h-full flex-col gap-4 border-r pt-4 pb-4 pl-4">
      {/* Header with branding and home link */}
      <div className="flex items-center justify-between pr-4">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-lg font-semibold text-transparent">
            EduFlow
          </span>
        </div>
        <Link href="/" className="hover:bg-muted rounded-lg p-2 transition-colors" title="Go to home">
          <Home className="size-5" />
        </Link>
      </div>

      {/* Search input */}
      <div className="relative pr-4">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
        <Input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Node list */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-4">
        {filteredNodes.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">No nodes found</div>
        ) : (
          filteredNodes.map((node) => {
            const isDisabled = node.id === 'start' && hasStartNode
            const NodeIcon = node.Icon
            return (
              <div
                key={node.id}
                draggable={!isDisabled}
                onDragStart={(e) => !isDisabled && onDragStart(e, node.id)}
                className={cn(
                  'bg-background border-border flex items-center gap-3 rounded-lg border p-3 transition-colors',
                  isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:border-primary cursor-move hover:shadow-sm'
                )}
                title={isDisabled ? 'Start node already exists on canvas' : `Drag ${node.label} to canvas`}
              >
                <div className="bg-primary/10 rounded-md p-1.5">
                  <NodeIcon className="text-primary h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{node.label}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
