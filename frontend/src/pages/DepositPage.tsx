import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { newIdempotencyKey } from "../api/client";
import { endpoints } from "../api/endpoints";
import { useToast } from "../components/Toast";
import { SupportButton } from "../components/SupportLink";
import { ErrorState, PageTitle, Skeleton, Spinner } from "../components/ui";
import { useMainButton } from "../hooks/useTelegramButtons";
import { formatNumber, formatUZS } from "../lib/format";
import { isInsideTelegram } from "../lib/telegram";

const QUICK = [25000, 50000, 100000, 250000];

export default function DepositPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["public-settings"], queryFn: endpoints.publicSettings });
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const idemKey = useRef(newIdempotencyKey());

  const value = Number(amount.replace(/\s/g, ""));
  const min = settings.data?.min_deposit ?? 10000;
  const amountOk = Number.isInteger(value) && value >= min && value <= 100_000_000;
  const refOk = reference.trim().length >= 3;

  const create = useMutation({
    mutationFn: () => endpoints.createDeposit(value, reference.trim(), idemKey.current),
    onSuccess: () => {
      toast("success", "So'rov yuborildi. Admin to'lovni tekshiradi");
      qc.invalidateQueries({ queryKey: ["my-deposits"] });
      navigate("/wallet", { replace: true });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const canSubmit = amountOk && refOk && !create.isPending;
  const submit = useCallback(() => {
    if (canSubmit) create.mutate();
  }, [canSubmit, create]);

  useMainButton({ text: "So'rov yuborish", onClick: submit, disabled: !canSubmit, loading: create.isPending });

  return (
    <>
      <PageTitle title="Balansni to'ldirish" subtitle="Avval to'lovni amalga oshiring, so'ng so'rov yuboring" />

      {settings.isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : settings.isError ? (
        <ErrorState message={settings.error.message} onRetry={() => settings.refetch()} />
      ) : (
        <div className="card mb-5">
          <div className="mb-2 flex items-center gap-2 text-brand-700">
            <Info className="h-5 w-5" />
            <p className="smallcaps text-base">To'lov rekvizitlari</p>
          </div>
          <p className="whitespace-pre-wrap text-sm text-navy-700">{settings.data?.payment_details}</p>
        </div>
      )}

      <label className="mb-1 block text-sm font-semibold text-navy-700">Summa (so'm)</label>
      <input className="input" inputMode="numeric" placeholder={`Kamida ${formatNumber(min)}`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
      {amount && !amountOk && <p className="mt-1 text-sm text-bad-fg">Minimal summa: {formatUZS(min)}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button key={q} className="btn-secondary" onClick={() => setAmount(String(q))}>
            {formatNumber(q)}
          </button>
        ))}
      </div>

      <label className="mb-1 mt-5 block text-sm font-semibold text-navy-700">To'lov izohi yoki chek raqami</label>
      <input className="input" placeholder="Masalan: chek №123456 yoki karta oxirgi 4 raqami" maxLength={200} value={reference} onChange={(e) => setReference(e.target.value)} />
      <p className="mt-2 text-xs text-navy-500">Balans faqat admin to'lovni haqiqatan tushganini tekshirib tasdiqlagandan keyin oshadi.</p>

      {!isInsideTelegram() && (
        <button className="btn-primary mt-5" disabled={!canSubmit} onClick={submit}>
          {create.isPending ? <Spinner /> : "So'rov yuborish"}
        </button>
      )}

      <div className="mt-6">
        <SupportButton label="To'lov bo'yicha savol" />
      </div>
    </>
  );
}
