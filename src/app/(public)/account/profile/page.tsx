import { requirePageUser } from "@/lib/auth";
import { ProfilePage } from "@/components/account/ProfilePage";

export const metadata = { title: "Profile" };

export default async function Page() {
  await requirePageUser();
  return <ProfilePage />;
}
