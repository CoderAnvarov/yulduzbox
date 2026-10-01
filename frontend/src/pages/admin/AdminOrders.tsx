import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { endpoints } from "../../api/endpoints";
import type { AdminOrder } from "../../api/types";
import { useToast } from "../../components/Toast";
import { ConfirmModal, EmptyState, ErrorState, LoadMore, PageTitle, SkeletonList, StatusBadge, Tabs } from "../../components/ui";
import { formatDate, formatNumber, formatUZS, userLabel } from "../../lib/format";
import { ORDER_STATUS } from "../../lib/status";

type Filter = "pending_admin" | "approved" | "completed" | "rejected" | "failed" | "";
type Kind = "approve" | "complete" | "reject" | "fail";
type Action = { kind: Kind; order: AdminOrder } | null;

const TEXT: Record<Kind, { title: string; label: string; danger?: boolean; reason?: boolean; ok: string }> = {
  approve: { title: "Buyurtmani tasdiqlaysizmi?", label: "Tasdiqlash", ok: "Buyurtma tasdiqlandi" },
  complete: { title: "Stars haqiqatan yetkazildimi?", label: "Ha, yetkazildi", ok: "Buyurtma bajarildi" },
  reject: { title: "Buyurtmani rad etasizmi?", label: "Rad etish", danger: true, reason: true, ok: "Rad etildi, pul qaytarildi" },
  fail: { title: "Buyurtma bajarilmadimi?", label: "Bajarilmadi", danger: true, reason: true, ok: "Pul foydalanuvchiga qaytarildi" },
};

export default function AdminOrders() {
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending_admin");
  const [limit, setLimit] = useState(20);
  const [action, setAction] = useState<Action>(null);

  const list = useQuery({ queryKey: ["admin", "orders", filter, limit], queryFn: () => endpoints.admin.orders(filter, limit) });

  const run = useMutation({
    mutationFn: ({ kind, order, reason }: { kind: Kind; order: AdminOrder; reason: string }) => {
      const a = endpoints.admin;
      if (kind === "approve") return a.approveOrder(order.id);
      if (kind === "complete") return a.completeOrder(order.id);
      if (kind === "reject") return a.rejectOrder(order.id, reason);
      return a.failOrder(order.id, reason);
    },
    onSuccess: (_, v) => {
      toast("success", TEXT[v.kind].ok);
      setAction(null);
    },
    onError: (e: Error) => {
      toast("error", e.message);
      setAction(null);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  const t = action ? TEXT[action.kind] : null;

  return (
    <>
      <PageTitle title="Buyurtmalar" subtitle="Stars'ni qo'lda yetkazing, so'ng 'bajarildi' deb belgilang" />
      <Tabs
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setLimit(20);
        }}
        options={[
          { value: "pending_admin", label: "Kutilmoqda" },
          { value: "approved", label: "Tasdiqlangan" },
          { value: "completed", label: "Bajarilgan" },
          { value: "rejected", label: "Rad etilgan" },
          { value: "failed", label: "Bajarilmagan" },
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
            {list.data.items.map((o) => (
              <div key={o.id} className="card">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-extrabold">
                    {formatNumber(o.stars_amount)} Stars → @{o.recipient_username}
                  </p>
                </div>
                <div className="mt-1">
                  <StatusBadge map={ORDER_STATUS} status={o.status} />
                </div>
                <p className="mt-2 text-sm font-semibold text-navy-700">{userLabel(o.user)}</p>
                <p className="text-sm text-navy-500">Narx: {formatUZS(o.price_uzs)}</p>
                <p className="text-xs text-navy-400">
                  #{o.id} · {formatDate(o.created_at)}
                </p>
                {o.admin_note && <p className="mt-1 text-sm text-bad-fg">Sabab: {o.admin_note}</p>}

                {o.status === "pending_admin" && (
                  <div className="mt-3 flex gap-2">
                    <button className="btn-ok flex-1" onClick={() => setAction({ kind: "approve", order: o })}>
                      Tasdiqlash
                    </button>
                    <button className="btn-danger flex-1" onClick={() => setAction({ kind: "reject", order: o })}>
                      Rad etish
                    </button>
                  </div>
                )}
                {(o.status === "approved" || o.status === "processing") && (
                  <div className="mt-3 flex gap-2">
                    <button className="btn-ok flex-1" onClick={() => setAction({ kind: "complete", order: o })}>
                      Bajarildi
                    </button>
                    <button className="btn-danger flex-1" onClick={() => setAction({ kind: "fail", order: o })}>
                      Bajarilmadi
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <LoadMore shown={list.data.items.length} total={list.data.total} onClick={() => setLimit((l) => l + 20)} />
        </>
      ) : (
        <EmptyState title="Buyurtmalar yo'q" />
      )}

      <ConfirmModal
        open={!!action}
        title={t?.title ?? ""}
        text={action ? `#${action.order.id} · ${formatNumber(action.order.stars_amount)} Stars → @${action.order.recipient_username}` : undefined}
        confirmLabel={t?.label ?? ""}
        danger={t?.danger}
        needReason={t?.reason}
        loading={run.isPending}
        onClose={() => setAction(null)}
        onConfirm={(reason) => action && run.mutate({ kind: action.kind, order: action.order, reason })}
      />
    </>
  );
}
