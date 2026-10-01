import { ShieldCheck, User } from "lucide-react";
import { Link } from "react-router-dom";

import { SupportButton } from "../components/SupportLink";
import { PageTitle } from "../components/ui";
import { APP_NAME, SUPPORT_USERNAME } from "../lib/config";
import { useMe } from "../hooks/useMe";
import { formatUZS } from "../lib/format";

export default function ProfilePage() {
  const me = useMe();
  const u = me.data;
  if (!u) return null;

  return (
    <>
      <PageTitle title="Profil" />
      <div className="card mb-4 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <User className="h-7 w-7" />
        </div>
        <div>
          <p className="text-lg font-bold">{u.first_name ?? "Foydalanuvchi"}</p>
          <p className="text-sm text-navy-500">{u.username ? `@${u.username}` : "username yo'q"}</p>
        </div>
      </div>

      <div className="card mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-navy-500">Telegram ID</span>
          <span className="font-bold">{u.telegram_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy-500">Balans</span>
          <span className="font-bold">{formatUZS(u.balance)}</span>
        </div>
      </div>

      {u.is_admin && (
        <Link to="/admin" className="btn-primary mb-4">
          <ShieldCheck className="h-5 w-5" /> Admin panelga o'tish
        </Link>
      )}

      <div className="card space-y-3">
        <p className="smallcaps text-base text-navy-700">Yordam va aloqa</p>
        <p className="text-sm text-navy-500">
          {APP_NAME} asoschisi va support xizmati: <span className="font-bold text-navy-900">@{SUPPORT_USERNAME}</span>. To'lov, buyurtma yoki boshqa savollar bo'yicha yozing.
        </p>
        <SupportButton />
      </div>
    </>
  );
}
