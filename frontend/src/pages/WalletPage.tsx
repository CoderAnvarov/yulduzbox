import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { endpoints } from "../api/endpoints";
import { EmptyState, ErrorState, LoadMore, PageTitle, SkeletonList, StatusBadge, Tabs } from "../components/ui";
import { useMe } from "../hooks/useMe";
import { formatDate, formatUZS } from "../lib/format";
import { DEPOSIT_STATUS, TX_TYPE } from "../lib/status";

export default function WalletPage() {
  const me = useMe();
  const [tab, setTab] = useState<"history" | "deposits">("history");
  const [limit, setLimit] = useState(20);
  const history = useQuery({ queryKey: ["history", limit], queryFn: () => endpoints.history(limit), enabled: tab === "history" });
  const deposits = useQuery({ queryKey: ["my-deposits", limit], queryFn: () => endpoints.myDeposits(limit), enabled: tab === "deposits" });

  return (
    <>
      <PageTitle title="Balans" />
      <section className="mb-5 rounded-card bg-gradient-to-br from-brand-600 to-navy-700 p-5 text-white shadow-card">
        <p className="smallcaps text-sm text-brand-100">Mavjud balans</p>
        <p className="mt-1 text-3xl font-extrabold">{formatUZS(me.data?.balance ?? 0)}</p>
        <Link to="/wallet/deposit" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25">
          <Plus className="h-4 w-4" /> Balansni to'ldirish
        </Link>
      </section>

      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v);
          setLimit(20);
        }}
        options={[
          { value: "history", label: "Tranzaksiyalar" },
          { value: "deposits", label: "To'ldirish so'rovlari" },
        ]}
      />

      {tab === "history" &&
        (history.isLoading ? (
          <SkeletonList />
        ) : history.isError ? (
          <ErrorState message={history.error.message} onRetry={() => history.refetch()} />
        ) : history.data && history.data.items.length > 0 ? (
          <>
            <div className="space-y-3">
              {history.data.items.map((t) => (
                <div key={t.id} className="card flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.amount > 0 ? "bg-ok-bg text-ok-fg" : "bg-brand-50 text-brand-600"}`}>
                    {t.amount > 0 ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900">{TX_TYPE[t.type] ?? t.type}</p>
                    <p className="text-xs text-navy-500">{formatDate(t.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${t.amount > 0 ? "text-ok-fg" : "text-navy-900"}`}>
                      {t.amount > 0 ? "+" : ""}
                      {formatUZS(t.amount)}
                    </p>
                    <p className="text-xs text-navy-400">{formatUZS(t.balance_after)}</p>
                  </div>
                </div>
              ))}
            </div>
            <LoadMore shown={history.data.items.length} total={history.data.total} onClick={() => setLimit((l) => l + 20)} />
          </>
        ) : (
          <EmptyState title="Tranzaksiyalar yo'q" text="Balansni to'ldirgandan keyin shu yerda ko'rinadi" />
        ))}

      {tab === "deposits" &&
        (deposits.isLoading ? (
          <SkeletonList />
        ) : deposits.isError ? (
          <ErrorState message={deposits.error.message} onRetry={() => deposits.refetch()} />
        ) : deposits.data && deposits.data.items.length > 0 ? (
          <>
            <div className="space-y-3">
              {deposits.data.items.map((d) => (
                <div key={d.id} className="card">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{formatUZS(d.amount)}</p>
                    <StatusBadge map={DEPOSIT_STATUS} status={d.status} />
                  </div>
                  <p className="mt-1 text-xs text-navy-500">
                    #{d.id} · {formatDate(d.created_at)}
                  </p>
                  {d.reject_reason && <p className="mt-2 text-sm text-bad-fg">Sabab: {d.reject_reason}</p>}
                </div>
              ))}
            </div>
            <LoadMore shown={deposits.data.items.length} total={deposits.data.total} onClick={() => setLimit((l) => l + 20)} />
          </>
        ) : (
          <EmptyState title="So'rovlar yo'q" />
        ))}
    </>
  );
}
