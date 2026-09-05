import { requirePageUser } from "@/lib/auth";
import { AddressesPage } from "@/components/account/AddressesPage";

export const metadata = { title: "Addresses" };

export default async function Page() {
  await requirePageUser();
  return <AddressesPage />;
}
