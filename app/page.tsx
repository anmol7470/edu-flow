import { HomeClient } from '@/components/home-client'
import { getUser } from '@/lib/get-user'

export default async function Home() {
  const user = await getUser()

  return <HomeClient user={user} />
}
