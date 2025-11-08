"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/logo";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Plus, LogOut } from "lucide-react";
import { nanoid } from "nanoid";
import type { HomeClientProps } from "@/lib/types";

export function HomeClient({ user }: HomeClientProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const createWorkflow = useMutation(api.workflows.createWorkflow);
  const isAuthenticated = Boolean(user);

  const handleLogout = async () => {
    await authClient.signOut();
    router.refresh();
  };

  const handleCreateWorkflow = async () => {
    if (!user || isCreating) return;

    setIsCreating(true);
    try {
      const workflowId = nanoid();
      await createWorkflow({
        workflowId,
        userId: user.id,
      });
      router.push(`/workflow/${workflowId}`);
    } catch (error) {
      console.error("Failed to create workflow:", error);
      setIsCreating(false);
    }
  };

  if (isAuthenticated) {
    // Authenticated view: Show logo and create workflow button
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
        {/* Logout button in top right */}
        <div className="fixed top-4 right-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <Logo />
        <Button
          size="lg"
          className="gap-2"
          onClick={handleCreateWorkflow}
          disabled={isCreating}
        >
          <Plus className="w-5 h-5" />
          {isCreating ? "Creating..." : "Create Workflow"}
        </Button>
      </div>
    );
  }

  // Unauthenticated view: Show logo and get started button
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <Logo />
      <Button size="lg" onClick={() => setAuthDialogOpen(true)}>
        Get Started
      </Button>
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}
