import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { endpoints } from "../../api/endpoints";
import { EmptyState, ErrorState, LoadMore, PageTitle, SkeletonList } from "../../components/ui";
import { formatDate, formatUZS } from "../../lib/format";

export default function AdminUsers() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(input.trim());
      setLimit(20);
    }, 400);
    return () => clearTimeout(t);
  }, [input]);

  const list = useQuery({ queryKey: ["admin", "users", q, limit], queryFn: () => endpoints.admin.users(q, limit) });

  return (
    <>
      <PageTitle title="Foydalanuvchilar" />
      <input className="input mb-4" placeholder="Ism, @username yoki Telegram ID" value={input} onChange={(e) => setInput(e.target.value)} />

      {list.isLoading ? (
        <SkeletonList />
      ) : list.isError ? (
        <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      ) : list.data && list.data.items.length > 0 ? (
        <>
          <p className="mb-2 text-sm text-navy-500">Jami: {list.data.total}</p>
          <div className="space-y-3">
            {list.data.items.map((u) => (
              <div key={u.id} className="card">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{u.first_name ?? "Foydalanuvchi"}</p>
                  <p className="font-extrabold text-brand-600">{formatUZS(u.balance)}</p>
                </div>
                <p className="text-sm text-navy-500">
                  {u.username ? `@${u.username}` : "username yo'q"} · ID {u.telegram_id}
                </p>
                <p className="text-xs text-navy-400">Ro'yxatdan o'tgan: {formatDate(u.created_at)}</p>
              </div>
            ))}
          </div>
          <LoadMore shown={list.data.items.length} total={list.data.total} onClick={() => setLimit((l) => l + 20)} />
        </>
      ) : (
        <EmptyState title="Foydalanuvchi topilmadi" />
      )}
    </>
  );
}
