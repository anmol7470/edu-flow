import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";

export async function getUser() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  return session?.data?.user ?? null;
}
