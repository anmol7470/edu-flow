"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export const WorkflowNode = memo(({ data }: NodeProps) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
      <Handle
        type="target"
        position={Position.Top}
        className="w-16 bg-teal-500!"
      />
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-sm font-bold">
            {(data as { label?: string })?.label || "Node"}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-16 bg-teal-500!"
      />
    </div>
  );
});

WorkflowNode.displayName = "WorkflowNode";
