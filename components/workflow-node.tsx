"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Youtube,
  FileText,
  Sparkles,
  CreditCard,
  HelpCircle,
  GraduationCap,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NodeData = {
  label?: string;
  type?: string;
};

const nodeConfig: Record<
  string,
  { icon: typeof Workflow; color: string; bgColor: string }
> = {
  youtube: {
    icon: Youtube,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
  },
  pdf: {
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  summarizer: {
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
  },
  flashcard: {
    icon: CreditCard,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
  quiz: {
    icon: HelpCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
  },
  tutor: {
    icon: GraduationCap,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-200",
  },
  default: {
    icon: Workflow,
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200",
  },
};

export const WorkflowNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  const label = nodeData?.label || "Node";
  const type = nodeData?.type || "default";
  const config = nodeConfig[type] || nodeConfig.default;
  const Icon = config.icon;

  return (
    <div className="group relative min-w-[240px]">
      {/* Target handles (inputs) */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className={cn(
          "w-2! h-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200",
          "opacity-0 group-hover:opacity-100",
          selected && "opacity-100",
          "hover:w-3! hover:h-3!"
        )}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className={cn(
          "w-2! h-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200",
          "opacity-0 group-hover:opacity-100",
          selected && "opacity-100",
          "hover:w-3! hover:h-3!"
        )}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className={cn(
          "w-2! h-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200",
          "opacity-0 group-hover:opacity-100",
          selected && "opacity-100",
          "hover:w-3! hover:h-3!"
        )}
      />

      {/* Node content */}
      <div
        className={cn(
          "rounded-xl border-2 transition-all duration-200",
          "shadow-sm hover:shadow-md",
          "bg-white",
          config.bgColor,
          selected
            ? "ring-2 ring-blue-500 ring-offset-2 border-blue-300"
            : "border-inherit"
        )}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg transition-colors",
              "bg-white shadow-sm",
              config.color
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {label}
            </div>
          </div>
        </div>
      </div>

      {/* Source handles (outputs) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className={cn(
          "w-2! h-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200",
          "opacity-0 group-hover:opacity-100",
          selected && "opacity-100",
          "hover:w-3! hover:h-3!"
        )}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className={cn(
          "w-2! h-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200",
          "opacity-0 group-hover:opacity-100",
          selected && "opacity-100",
          "hover:w-3! hover:h-3!"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className={cn(
          "w-2! h-2! rounded-full! border-2! border-black! bg-black! transition-all duration-200",
          "opacity-0 group-hover:opacity-100",
          selected && "opacity-100",
          "hover:w-3! hover:h-3!"
        )}
      />
    </div>
  );
});

WorkflowNode.displayName = "WorkflowNode";
