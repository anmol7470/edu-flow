"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WorkflowSidebar() {
  const nodeTypes = [
    { id: "youtube", label: "YouTube Analyzer", icon: "🎥" },
    { id: "pdf", label: "PDF Reader", icon: "📄" },
    { id: "summarizer", label: "Summarizer", icon: "📝" },
    { id: "flashcard", label: "Flashcard Generator", icon: "🃏" },
    { id: "quiz", label: "Quiz Builder", icon: "❓" },
    { id: "tutor", label: "AI Tutor", icon: "🤖" },
  ];

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="h-full bg-muted/30 border-r border-border p-4 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Workflow Nodes</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Drag nodes to the canvas
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {nodeTypes.map((node) => (
          <div
            key={node.id}
            draggable
            onDragStart={(e) => onDragStart(e, node.id)}
            className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg cursor-move hover:border-primary transition-colors"
          >
            <span className="text-2xl">{node.icon}</span>
            <span className="text-sm font-medium">{node.label}</span>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border">
        <Button variant="outline" className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Add Custom Node
        </Button>
      </div>
    </div>
  );
}

