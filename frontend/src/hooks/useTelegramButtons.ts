import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getWebApp, isInsideTelegram } from "../lib/telegram";

const ROOT_PATHS = ["/", "/wallet", "/orders", "/profile", "/admin"];

/** Telegram BackButton: bosh bo'limlardan tashqarida ko'rinadi va bir qadam orqaga qaytaradi. */
export function useTelegramBackButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const back = getWebApp()?.BackButton;
    if (!back) return;
    const handler = () => navigate(-1);
    if (ROOT_PATHS.includes(pathname)) {
      back.hide();
    } else {
      back.show();
      back.onClick(handler);
    }
    return () => back.offClick(handler);
  }, [pathname, navigate]);
}

/** Telegram MainButton (pastdagi katta tugma). Telegram tashqarisida hech narsa qilmaydi. */
export function useMainButton(opts: { text: string; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  const { text, onClick, disabled, loading } = opts;

  useEffect(() => {
    const btn = getWebApp()?.MainButton;
    if (!btn || !isInsideTelegram()) return;
    btn.setText(text);
    btn.show();
    btn.onClick(onClick);
    return () => {
      btn.offClick(onClick);
      btn.hideProgress();
      btn.hide();
    };
  }, [text, onClick]);

  useEffect(() => {
    const btn = getWebApp()?.MainButton;
    if (!btn || !isInsideTelegram()) return;
    if (disabled || loading) btn.disable();
    else btn.enable();
    if (loading) btn.showProgress(false);
    else btn.hideProgress();
  }, [disabled, loading]);
}
