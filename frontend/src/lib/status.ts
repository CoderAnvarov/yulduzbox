export type Tone = "ok" | "warn" | "bad" | "info";

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_admin: { label: "Admin kutilmoqda", tone: "warn" },
  approved: { label: "Tasdiqlandi", tone: "info" },
  processing: { label: "Bajarilmoqda", tone: "info" },
  completed: { label: "Bajarildi", tone: "ok" },
  rejected: { label: "Rad etildi", tone: "bad" },
  refunded: { label: "Qaytarildi", tone: "bad" },
  failed: { label: "Bajarilmadi", tone: "bad" },
};

export const DEPOSIT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Kutilmoqda", tone: "warn" },
  approved: { label: "Tasdiqlandi", tone: "ok" },
  rejected: { label: "Rad etildi", tone: "bad" },
};

export const TX_TYPE: Record<string, string> = {
  deposit: "Balans to'ldirildi",
  order_debit: "Buyurtma uchun to'lov",
  order_refund: "Pul qaytarildi",
};

export const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok-fg",
  warn: "bg-warn-bg text-warn-fg",
  bad: "bg-bad-bg text-bad-fg",
  info: "bg-brand-100 text-brand-700",
};
