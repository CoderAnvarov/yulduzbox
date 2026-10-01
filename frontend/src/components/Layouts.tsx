import {
  ClipboardList,
  Home,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Tag,
  User,
  Users,
  Wallet,
  Wallet2,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useTelegramBackButton } from "../hooks/useTelegramButtons";
import { useMe } from "../hooks/useMe";
import { isInsideTelegram } from "../lib/telegram";
import { ErrorState, Skeleton } from "./ui";

/** Foydalanuvchi aniqlanmaguncha sahifalarni ko'rsatmaydi. */
export function AuthGate() {
  const me = useMe();
  if (me.isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-3 px-5 pt-10">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (me.isError) {
    const msg = isInsideTelegram() ? me.error.message : "Mini App'ni Telegram bot orqali oching";
    return (
      <div className="mx-auto max-w-md px-5 pt-10">
        <ErrorState message={msg} onRetry={() => me.refetch()} />
      </div>
    );
  }
  return <Outlet />;
}

export function AdminGate() {
  const me = useMe();
  if (!me.data?.is_admin) {
    return (
      <div className="mx-auto max-w-md px-5 pt-10">
        <ErrorState message="Bu bo'limga ruxsat yo'q" />
      </div>
    );
  }
  return <Outlet />;
}

const userNav = [
  { to: "/", label: "Bosh sahifa", icon: Home, end: true },
  { to: "/wallet", label: "Balans", icon: Wallet, end: false },
  { to: "/orders", label: "Buyurtmalar", icon: ClipboardList, end: false },
  { to: "/profile", label: "Profil", icon: User, end: false },
];

export function UserLayout() {
  useTelegramBackButton();
  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-6">
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-md justify-around px-2 py-2">
          {userNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition ${
                  isActive ? "text-brand-600" : "text-navy-400"
                }`
              }
            >
              <Icon className="h-6 w-6" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Foydalanuvchilar", icon: Users, end: false },
  { to: "/admin/deposits", label: "Balans so'rovlari", icon: Wallet2, end: false },
  { to: "/admin/orders", label: "Buyurtmalar", icon: ClipboardList, end: false },
  { to: "/admin/products", label: "Narxlar", icon: Tag, end: false },
  { to: "/admin/settings", label: "Sozlamalar", icon: Settings, end: false },
];

export function AdminLayout() {
  useTelegramBackButton();
  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-4">
      <div className="mb-3 flex items-center gap-2 text-brand-700">
        <ShieldCheck className="h-5 w-5" />
        <span className="smallcaps text-lg">Admin panel</span>
        <NavLink to="/" className="ml-auto text-sm font-semibold text-brand-600">
          ← Ilova
        </NavLink>
      </div>
      <nav className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-2">
        {adminNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                isActive ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
