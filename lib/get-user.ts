import { authClient } from '@/lib/auth-client'
import { headers } from 'next/headers'

export async function getUser() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  })

  return session?.data?.user ?? null
}
