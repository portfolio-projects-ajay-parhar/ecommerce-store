import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?callbackUrl=/admin");
  if (user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-8">
      <AdminSidebar userName={user.name ?? user.email ?? "Admin"} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function AdminLayoutFooter() {
  return <Link href="/">← Storefront</Link>;
}
