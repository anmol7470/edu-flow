"use client";

import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import { WorkflowSidebar } from "@/components/workflow-sidebar";
import { WorkflowCanvas } from "@/components/workflow-canvas";
import { useQueryWithStatus } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import type { WorkflowLayoutProps } from "@/lib/types";

export function WorkflowLayout({ workflowId, userId }: WorkflowLayoutProps) {
  const router = useRouter();

  const {
    data: workflow,
    isSuccess,
    isPending,
    isError,
  } = useQueryWithStatus(api.workflows.getWorkflow, { workflowId });

  // Handle error - redirect to home
  if (isError) {
    router.push("/");
    return null;
  }

  // Show loading state
  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading workflow...</div>
      </div>
    );
  }

  // Parse nodes and edges
  const initialNodes: Node[] =
    isSuccess && workflow ? JSON.parse(workflow.nodes) : [];
  const initialEdges: Edge[] =
    isSuccess && workflow ? JSON.parse(workflow.edges) : [];

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div className="w-1/5 min-w-[250px] max-w-[350px]">
          <WorkflowSidebar />
        </div>

        <div className="flex-1">
          <WorkflowCanvas
            workflowId={workflowId}
            userId={userId}
            initialNodes={initialNodes}
            initialEdges={initialEdges}
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
