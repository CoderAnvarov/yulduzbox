import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { endpoints } from "../../api/endpoints";
import { ErrorState, PageTitle, Skeleton } from "../../components/ui";
import { formatNumber, formatUZS } from "../../lib/format";

function Stat({ label, value, to, accent }: { label: string; value: string; to?: string; accent?: boolean }) {
  const body = (
    <div className={`card h-full ${accent ? "ring-2 ring-warn-fg/30" : ""}`}>
      <p className="text-xs font-semibold text-navy-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-navy-900">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function AdminDashboard() {
  const q = useQuery({ queryKey: ["admin", "dashboard"], queryFn: endpoints.admin.dashboard, refetchInterval: 30000 });

  return (
    <>
      <PageTitle title="Dashboard" />
      {q.isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Kutilayotgan balans so'rovlari" value={formatNumber(q.data!.pending_deposits)} to="/admin/deposits" accent={q.data!.pending_deposits > 0} />
          <Stat label="Kutilayotgan buyurtmalar" value={formatNumber(q.data!.pending_orders)} to="/admin/orders" accent={q.data!.pending_orders > 0} />
          <Stat label="Foydalanuvchilar" value={formatNumber(q.data!.users)} to="/admin/users" />
          <Stat label="Bajarilgan buyurtmalar" value={formatNumber(q.data!.completed_orders)} />
          <Stat label="Tasdiqlangan to'lovlar" value={formatUZS(q.data!.approved_deposits_sum)} />
          <Stat label="Bajarilgan savdo" value={formatUZS(q.data!.completed_revenue)} />
          <div className="col-span-2">
            <Stat label="Foydalanuvchilar balansi (jami majburiyat)" value={formatUZS(q.data!.total_balances)} />
          </div>
        </div>
      )}
    </>
  );
}
