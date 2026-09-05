import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { REVENUE_STATUSES } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      orders: {
        where: { status: { in: [...REVENUE_STATUSES] } },
        select: { totalCents: true, placedAt: true },
      },
    },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Customers</h1>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left dark:bg-neutral-900">
            <tr>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Orders</th>
              <th className="p-3 font-medium">Lifetime value</th>
              <th className="p-3 font-medium">Last order</th>
              <th className="p-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {users.map((u) => {
              const paid = u.orders;
              return (
                <tr key={u.id}>
                  <td className="p-3">
                    <span className="block font-medium">{u.name}</span>
                    <span className="text-xs text-neutral-400">{u.email}</span>
                  </td>
                  <td className="p-3">{paid.length}</td>
                  <td className="p-3 font-medium">
                    {formatMoney(paid.reduce((s, o) => s + o.totalCents, 0))}
                  </td>
                  <td className="p-3 text-neutral-500">
                    {paid.reduce<Date | null>(
                      (latest, o) => (!latest || o.placedAt > latest ? o.placedAt : latest),
                      null,
                    ) && formatDate(
                      paid.reduce<Date | null>(
                        (latest, o) => (!latest || o.placedAt > latest ? o.placedAt : latest),
                        null,
                      )!,
                    )}
                  </td>
                  <td className="p-3 text-neutral-500">{formatDate(u.createdAt)}</td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-neutral-500">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
