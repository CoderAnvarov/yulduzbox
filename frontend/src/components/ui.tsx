import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { TONE_CLASS, type Tone } from "../lib/status";

export function Skeleton({ className = "h-16 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`badge ${TONE_CLASS[tone]}`}>{children}</span>;
}

export function StatusBadge({ map, status }: { map: Record<string, { label: string; tone: Tone }>; status: string }) {
  const s = map[status] ?? { label: status, tone: "info" as Tone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center rounded-card bg-brand-50 px-6 py-10 text-center">
      <Inbox className="mb-3 h-10 w-10 text-brand-400" />
      <p className="font-semibold text-navy-700">{title}</p>
      {text && <p className="mt-1 text-sm text-navy-500">{text}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-card bg-bad-bg px-6 py-8 text-center">
      <AlertTriangle className="mb-2 h-8 w-8 text-bad-fg" />
      <p className="font-semibold text-bad-fg">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-4" onClick={onRetry}>
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="smallcaps text-2xl text-navy-900">{title}</h1>
      {subtitle && <p className="text-sm text-navy-500">{subtitle}</p>}
    </div>
  );
}

export function Spinner() {
  return <Loader2 className="h-5 w-5 animate-spin" />;
}

export function LoadMore({ shown, total, onClick }: { shown: number; total: number; onClick: () => void }) {
  if (shown >= total) return null;
  return (
    <button className="btn-secondary mx-auto mt-4 flex" onClick={onClick}>
      Yana yuklash ({shown}/{total})
    </button>
  );
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            value === o.value ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Sezgir amal uchun tasdiqlash oynasi. needReason=true bo'lsa sabab kiritish majburiy. */
export function ConfirmModal({
  open,
  title,
  text,
  confirmLabel,
  danger,
  needReason,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  text?: string;
  confirmLabel: string;
  danger?: boolean;
  needReason?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  if (!open) return null;
  const invalid = needReason && reason.trim().length < 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-card bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-navy-900">{title}</h3>
        {text && <p className="mt-1 text-sm text-navy-500">{text}</p>}
        {needReason && (
          <textarea
            className="input mt-3"
            rows={3}
            maxLength={300}
            placeholder="Sababni yozing (kamida 3 belgi)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="mt-4 flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>
            Bekor qilish
          </button>
          <button
            className={`${danger ? "btn-danger" : "btn-ok"} flex-1`}
            disabled={loading || invalid}
            onClick={() => onConfirm(reason.trim())}
          >
            {loading ? <Spinner /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
