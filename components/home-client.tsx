"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/logo";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Plus, LogOut } from "lucide-react";
import { nanoid } from "nanoid";

interface HomeClientProps {
  user: { id: string; email: string; name: string } | null;
}

export function HomeClient({ user }: HomeClientProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const router = useRouter();
  const isAuthenticated = Boolean(user);

  const handleLogout = async () => {
    await authClient.signOut();
    router.refresh();
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
          onClick={() => {
            router.push(`/workflow/${nanoid()}`);
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
