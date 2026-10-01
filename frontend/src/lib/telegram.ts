/** Telegram Web App bilan ishlash. Telegram tashqarisida (oddiy brauzerda) ham xato bermaydi. */

interface TgButton {
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

interface TgMainButton extends TgButton {
  setText: (text: string) => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
}

export interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  openTelegramLink?: (url: string) => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton: TgButton;
  MainButton: TgMainButton;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export const getWebApp = (): TelegramWebApp | undefined => window.Telegram?.WebApp;

export function initTelegram(): void {
  const tg = getWebApp();
  if (!tg) return;
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor?.("#ffffff");
    tg.setBackgroundColor?.("#ffffff");
  } catch {
    // eski Telegram versiyalarida bu metodlar yo'q
  }
}

/** Backend shuni HMAC bilan tekshiradi. */
export const getInitData = (): string => getWebApp()?.initData ?? "";
export const isInsideTelegram = (): boolean => getInitData().length > 0;
