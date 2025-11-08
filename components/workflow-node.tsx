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
import { cn } from '@/lib/utils'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  Calendar,
  CreditCard,
  FileEdit,
  FileText,
  GitCompare,
  Globe,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  Mic,
  Play,
  RefreshCw,
  Search as SearchIcon,
  Sparkles,
  Trash2,
  Workflow,
  Youtube,
} from 'lucide-react'
import { memo } from 'react'

type NodeData = {
  label?: string
  type?: string
  onDelete?: (id: string) => void
  onReplace?: (id: string, newType: string) => void
}

const nodeConfig: Record<string, { icon: typeof Workflow; color: string }> = {
  start: {
    icon: Play,
    color: 'text-green-600',
  },
  youtube: {
    icon: Youtube,
    color: 'text-red-600',
  },
  pdf: {
    icon: FileText,
    color: 'text-blue-600',
  },
  summarizer: {
    icon: Sparkles,
    color: 'text-purple-600',
  },
  flashcard: {
    icon: CreditCard,
    color: 'text-emerald-600',
  },
  quiz: {
    icon: HelpCircle,
    color: 'text-orange-600',
  },
  tutor: {
    icon: GraduationCap,
    color: 'text-indigo-600',
  },
  'concept-extractor': {
    icon: Lightbulb,
    color: 'text-yellow-600',
  },
  'cross-reference': {
    icon: GitCompare,
    color: 'text-cyan-600',
  },
  'essay-grader': {
    icon: FileEdit,
    color: 'text-rose-600',
  },
  'study-plan': {
    icon: Calendar,
    color: 'text-violet-600',
  },
  'web-scraper': {
    icon: Globe,
    color: 'text-teal-600',
  },
  'audio-transcriber': {
    icon: Mic,
    color: 'text-pink-600',
  },
  'deep-research': {
    icon: SearchIcon,
    color: 'text-amber-600',
  },
  default: {
    icon: Workflow,
    color: 'text-slate-600',
  },
}

const availableNodeTypes = [
  { id: 'start', label: 'Start' },
  { id: 'youtube', label: 'YouTube Analyzer' },
  { id: 'pdf', label: 'PDF Reader' },
  { id: 'summarizer', label: 'Summarizer' },
  { id: 'flashcard', label: 'Flashcard Generator' },
  { id: 'quiz', label: 'Quiz Builder' },
  { id: 'tutor', label: 'AI Tutor' },
  { id: 'concept-extractor', label: 'Concept Extractor' },
  { id: 'cross-reference', label: 'Cross Referencer' },
  { id: 'essay-grader', label: 'Essay Grader' },
  { id: 'study-plan', label: 'Study Plan Generator' },
  { id: 'web-scraper', label: 'Web Scraper' },
  { id: 'audio-transcriber', label: 'Audio Transcriber' },
  { id: 'deep-research', label: 'Deep Research' },
]

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
