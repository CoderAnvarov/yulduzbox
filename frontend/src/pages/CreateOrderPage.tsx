import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { newIdempotencyKey } from "../api/client";
import { endpoints } from "../api/endpoints";
import { useToast } from "../components/Toast";
import { ErrorState, Skeleton, Spinner } from "../components/ui";
import { useMainButton } from "../hooks/useTelegramButtons";
import { useMe } from "../hooks/useMe";
import { formatNumber, formatUZS } from "../lib/format";
import { isInsideTelegram } from "../lib/telegram";

const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

export default function CreateOrderPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const me = useMe();
  const products = useQuery({ queryKey: ["products"], queryFn: endpoints.products });
  const [username, setUsername] = useState("");
  const idemKey = useRef(newIdempotencyKey()); // qayta bosilsa ham bitta buyurtma yaratiladi

  const product = products.data?.find((p) => p.id === Number(productId));
  const cleaned = username.trim().replace(/^@/, "");
  const valid = USERNAME_RE.test(cleaned);
  const balance = me.data?.balance ?? 0;
  const enough = product ? balance >= product.price_uzs : false;

  const create = useMutation({
    mutationFn: () => endpoints.createOrder(product!.id, cleaned, idemKey.current),
    onSuccess: (order) => {
      toast("success", "Buyurtma yaratildi. Admin tasdiqlashini kuting");
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/orders/${order.id}`, { replace: true });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const canSubmit = !!product && valid && enough && !create.isPending;
  const submit = useCallback(() => {
    if (canSubmit) create.mutate();
  }, [canSubmit, create]);

  useMainButton({ text: "Buyurtma berish", onClick: submit, disabled: !canSubmit, loading: create.isPending });

  if (products.isLoading) return <Skeleton className="h-64 w-full" />;
  if (products.isError) return <ErrorState message={products.error.message} onRetry={() => products.refetch()} />;
  if (!product) return <ErrorState message="Bu paket topilmadi yoki mavjud emas" />;

  return (
    <>
      <h1 className="smallcaps mb-4 text-2xl text-navy-900">Buyurtma berish</h1>

      <div className="card mb-4 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Star className="h-7 w-7" fill="currentColor" />
        </div>
        <div>
          <p className="text-2xl font-extrabold">{formatNumber(product.stars_amount)} Stars</p>
          <p className="font-bold text-brand-600">{formatUZS(product.price_uzs)}</p>
        </div>
      </div>

      <label className="mb-1 block text-sm font-semibold text-navy-700">Qabul qiluvchi Telegram username</label>
      <input
        className="input"
        placeholder="@username"
        autoCapitalize="none"
        autoCorrect="off"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      {username && !valid && (
        <p className="mt-1 text-sm text-bad-fg">5-32 belgi: lotin harflari, raqam va _ (harf bilan boshlansin)</p>
      )}

      <div className="card mt-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-navy-500">Narx</span>
          <span className="font-bold">{formatUZS(product.price_uzs)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy-500">Sizning balansingiz</span>
          <span className="font-bold">{formatUZS(balance)}</span>
        </div>
        <div className="flex justify-between border-t border-brand-100 pt-2">
          <span className="text-navy-500">Qolgan balans</span>
          <span className={`font-bold ${enough ? "" : "text-bad-fg"}`}>{formatUZS(balance - product.price_uzs)}</span>
        </div>
      </div>

      {!enough && (
        <div className="mt-4 rounded-2xl bg-warn-bg p-4 text-sm text-warn-fg">
          Balansingizda mablag' yetarli emas.{" "}
          <Link to="/wallet/deposit" className="font-bold underline">
            Balansni to'ldirish
          </Link>
        </div>
      )}
      <p className="mt-4 text-xs text-navy-500">
        Buyurtma admin tomonidan qo'lda bajariladi. Summa buyurtma berilganda balansdan yechiladi, bekor bo'lsa to'liq qaytariladi.
      </p>

      {!isInsideTelegram() && (
        <button className="btn-primary mt-5" disabled={!canSubmit} onClick={submit}>
          {create.isPending ? <Spinner /> : "Buyurtma berish"}
        </button>
      )}
    </>
  );
}
