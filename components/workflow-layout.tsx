"use client";

import { WorkflowSidebar } from "@/components/workflow-sidebar";
import { WorkflowCanvas } from "@/components/workflow-canvas";

interface WorkflowLayoutProps {
  workflowId: string;
}

export function WorkflowLayout({ workflowId }: WorkflowLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Sidebar - 1/5 of the page */}
      <div className="w-1/5 min-w-[250px] max-w-[350px]">
        <WorkflowSidebar />
      </div>

      {/* React Flow Canvas - 4/5 of the page */}
      <div className="flex-1">
        <WorkflowCanvas workflowId={workflowId} />
      </div>
    </div>
  );
}

