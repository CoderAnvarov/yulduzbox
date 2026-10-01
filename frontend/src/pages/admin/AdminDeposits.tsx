import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { endpoints } from "../../api/endpoints";
import type { AdminDeposit } from "../../api/types";
import { useToast } from "../../components/Toast";
import { ConfirmModal, EmptyState, ErrorState, LoadMore, PageTitle, SkeletonList, StatusBadge, Tabs } from "../../components/ui";
import { formatDate, formatUZS, userLabel } from "../../lib/format";
import { DEPOSIT_STATUS } from "../../lib/status";

type Filter = "pending" | "approved" | "rejected" | "";
type Action = { kind: "approve" | "reject"; deposit: AdminDeposit } | null;

export default function AdminDeposits() {
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [limit, setLimit] = useState(20);
  const [action, setAction] = useState<Action>(null);

  const list = useQuery({ queryKey: ["admin", "deposits", filter, limit], queryFn: () => endpoints.admin.deposits(filter, limit) });

  const run = useMutation({
    mutationFn: ({ kind, deposit, reason }: { kind: "approve" | "reject"; deposit: AdminDeposit; reason: string }) =>
      kind === "approve" ? endpoints.admin.approveDeposit(deposit.id) : endpoints.admin.rejectDeposit(deposit.id, reason),
    onSuccess: (_, v) => {
      toast("success", v.kind === "approve" ? "Tasdiqlandi, balans oshirildi" : "Rad etildi");
      setAction(null);
    },
    onError: (e: Error) => {
      toast("error", e.message);
      setAction(null);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  return (
    <>
      <PageTitle title="Balans so'rovlari" subtitle="To'lov haqiqatan tushganini tekshirib tasdiqlang" />
      <Tabs
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setLimit(20);
        }}
        options={[
          { value: "pending", label: "Kutilmoqda" },
          { value: "approved", label: "Tasdiqlangan" },
          { value: "rejected", label: "Rad etilgan" },
          { value: "", label: "Hammasi" },
        ]}
      />

      {list.isLoading ? (
        <SkeletonList />
      ) : list.isError ? (
        <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      ) : list.data && list.data.items.length > 0 ? (
        <>
          <div className="space-y-3">
            {list.data.items.map((d) => (
              <div key={d.id} className="card">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-extrabold">{formatUZS(d.amount)}</p>
                  <StatusBadge map={DEPOSIT_STATUS} status={d.status} />
                </div>
                <p className="mt-1 text-sm font-semibold text-navy-700">{userLabel(d.user)}</p>
                <p className="mt-1 break-words text-sm text-navy-500">Izoh: {d.reference}</p>
                <p className="mt-1 text-xs text-navy-400">
                  #{d.id} · {formatDate(d.created_at)}
                </p>
                {d.reject_reason && <p className="mt-1 text-sm text-bad-fg">Sabab: {d.reject_reason}</p>}
                {d.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button className="btn-ok flex-1" onClick={() => setAction({ kind: "approve", deposit: d })}>
                      Tasdiqlash
                    </button>
                    <button className="btn-danger flex-1" onClick={() => setAction({ kind: "reject", deposit: d })}>
                      Rad etish
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <LoadMore shown={list.data.items.length} total={list.data.total} onClick={() => setLimit((l) => l + 20)} />
        </>
      ) : (
        <EmptyState title="So'rovlar yo'q" />
      )}

      <ConfirmModal
        open={!!action}
        title={action?.kind === "approve" ? "To'lovni tasdiqlaysizmi?" : "So'rovni rad etasizmi?"}
        text={action ? `#${action.deposit.id} · ${formatUZS(action.deposit.amount)} · ${userLabel(action.deposit.user)}` : undefined}
        confirmLabel={action?.kind === "approve" ? "Tasdiqlash" : "Rad etish"}
        danger={action?.kind === "reject"}
        needReason={action?.kind === "reject"}
        loading={run.isPending}
        onClose={() => setAction(null)}
        onConfirm={(reason) => action && run.mutate({ kind: action.kind, deposit: action.deposit, reason })}
      />
    </>
  );
}
