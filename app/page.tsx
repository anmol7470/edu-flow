import { getUser } from "@/lib/get-user";
import { HomeClient } from "@/components/home-client";

export default async function Home() {
  const user = await getUser();

  return <HomeClient user={user} />;
}
