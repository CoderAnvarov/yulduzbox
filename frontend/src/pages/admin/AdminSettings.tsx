import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { endpoints } from "../../api/endpoints";
import { useToast } from "../../components/Toast";
import { ErrorState, PageTitle, Skeleton, Spinner } from "../../components/ui";

export default function AdminSettings() {
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: endpoints.admin.settings });
  const [details, setDetails] = useState("");
  const [min, setMin] = useState("");

  useEffect(() => {
    if (q.data) {
      setDetails(q.data.payment_details);
      setMin(String(q.data.min_deposit));
    }
  }, [q.data]);

  const minValue = Number(min);
  const valid = details.trim().length > 0 && Number.isInteger(minValue) && minValue >= 1000;

  const save = useMutation({
    mutationFn: () => endpoints.admin.patchSettings({ payment_details: details.trim(), min_deposit: minValue }),
    onSuccess: () => {
      toast("success", "Sozlamalar saqlandi");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  return (
    <>
      <PageTitle title="Sozlamalar" />
      {q.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-navy-700">To'lov rekvizitlari (foydalanuvchilarga ko'rinadi)</label>
            <textarea className="input" rows={5} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={"Karta: 8600 ...\nEgasi: ..."} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-navy-700">Minimal to'ldirish summasi (so'm)</label>
            <input className="input" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d]/g, ""))} />
          </div>
          <button className="btn-primary" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Spinner /> : "Saqlash"}
          </button>
        </div>
      )}
    </>
  );
}
