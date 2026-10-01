import { Headset } from "lucide-react";

import { SUPPORT_URL, SUPPORT_USERNAME } from "../lib/config";
import { getWebApp } from "../lib/telegram";

export function openSupport(): void {
  const tg = getWebApp();
  if (tg?.openTelegramLink) tg.openTelegramLink(SUPPORT_URL);
  else window.open(SUPPORT_URL, "_blank", "noopener,noreferrer");
}

/** Support bilan bog'lanish tugmasi (asoschi ham, support ham: @AnvarovCoder). */
export function SupportButton({ label = "Support bilan bog'lanish" }: { label?: string }) {
  return (
    <button type="button" className="btn-secondary w-full" onClick={openSupport}>
      <Headset className="h-4 w-4" />
      {label} (@{SUPPORT_USERNAME})
    </button>
  );
}
