"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Logo } from "@/components/logo";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Home() {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { data: session, isPending } = useSession();

  const isAuthenticated = Boolean(session?.user);

  // Show loading state while checking authentication
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Logo />
      </div>
    );
  }

  if (isAuthenticated) {
    // Authenticated view: Show logo and create workflow button
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
        <Logo />
        <Button
          size="lg"
          className="gap-2"
          onClick={() => {
            // TODO: Navigate to workflow builder
            console.log("Create workflow clicked");
          }}
        >
          <Plus className="w-5 h-5" />
          Create Workflow
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
