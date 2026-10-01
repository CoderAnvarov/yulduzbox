import { useQuery } from "@tanstack/react-query";
import { Check, Circle, X } from "lucide-react";
import { useParams } from "react-router-dom";

import { endpoints } from "../api/endpoints";
import { SupportButton } from "../components/SupportLink";
import { ErrorState, Skeleton, StatusBadge } from "../components/ui";
import { formatDate, formatNumber, formatUZS } from "../lib/format";
import { ORDER_STATUS } from "../lib/status";

type StepState = "done" | "current" | "todo" | "bad";

function Step({ label, state }: { label: string; state: StepState }) {
  const icon =
    state === "done" ? <Check className="h-4 w-4" /> : state === "bad" ? <X className="h-4 w-4" /> : <Circle className="h-3 w-3" />;
  const color =
    state === "done" ? "bg-brand-600 text-white" : state === "bad" ? "bg-bad-bg text-bad-fg" : state === "current" ? "bg-brand-100 text-brand-700" : "bg-brand-50 text-navy-400";
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${color}`}>{icon}</div>
      <span className={`font-semibold ${state === "todo" ? "text-navy-400" : "text-navy-900"}`}>{label}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const order = useQuery({ queryKey: ["order", id], queryFn: () => endpoints.order(Number(id)), refetchInterval: 15000 });

  if (order.isLoading) return <Skeleton className="h-64 w-full" />;
  if (order.isError) return <ErrorState message={order.error.message} onRetry={() => order.refetch()} />;
  const o = order.data!;

  const failed = ["rejected", "failed", "refunded"].includes(o.status);
  const approved = ["approved", "processing", "completed"].includes(o.status);
  const steps: { label: string; state: StepState }[] = [
    { label: "Buyurtma yaratildi", state: "done" },
    { label: "Admin tasdiqlashi", state: failed ? "bad" : approved ? "done" : "current" },
    { label: "Stars yetkazilishi", state: o.status === "completed" ? "done" : failed ? "todo" : approved ? "current" : "todo" },
  ];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="smallcaps text-2xl text-navy-900">Buyurtma #{o.id}</h1>
        <StatusBadge map={ORDER_STATUS} status={o.status} />
      </div>

      <div className="card mb-4 space-y-2 text-sm">
        <Row k="Miqdor" v={`${formatNumber(o.stars_amount)} Stars`} />
        <Row k="Qabul qiluvchi" v={`@${o.recipient_username}`} />
        <Row k="Narx" v={formatUZS(o.price_uzs)} />
        <Row k="Yaratilgan" v={formatDate(o.created_at)} />
        <Row k="Yangilangan" v={formatDate(o.updated_at)} />
      </div>

      <div className="card space-y-4">
        {steps.map((s) => (
          <Step key={s.label} {...s} />
        ))}
      </div>

      {o.admin_note && <p className="mt-4 rounded-2xl bg-bad-bg p-4 text-sm text-bad-fg">Sabab: {o.admin_note}</p>}
      {o.refunded_at && <p className="mt-3 rounded-2xl bg-ok-bg p-4 text-sm text-ok-fg">{formatUZS(o.price_uzs)} balansingizga qaytarildi.</p>}

      <div className="mt-5">
        <SupportButton label="Buyurtma bo'yicha savol" />
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-navy-500">{k}</span>
      <span className="font-bold text-navy-900">{v}</span>
    </div>
  );
}
