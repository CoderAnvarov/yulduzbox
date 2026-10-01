import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { endpoints } from "../../api/endpoints";
import type { Product } from "../../api/types";
import { useToast } from "../../components/Toast";
import { EmptyState, ErrorState, PageTitle, SkeletonList, Spinner } from "../../components/ui";
import { formatNumber } from "../../lib/format";

function ProductRow({ product }: { product: Product }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [price, setPrice] = useState(String(product.price_uzs));
  const value = Number(price);
  const valid = Number.isInteger(value) && value > 0 && value <= 1_000_000_000;
  const dirty = value !== product.price_uzs;

  const patch = useMutation({
    mutationFn: (body: Partial<Pick<Product, "price_uzs" | "is_active">>) => endpoints.admin.patchProduct(product.id, body),
    onSuccess: () => {
      toast("success", "Saqlandi");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  return (
    <div className={`card ${product.is_active ? "" : "opacity-60"}`}>
      <div className="flex items-center justify-between">
        <p className="text-lg font-extrabold">{formatNumber(product.stars_amount)} Stars</p>
        <button className={product.is_active ? "btn-secondary" : "btn-danger"} disabled={patch.isPending} onClick={() => patch.mutate({ is_active: !product.is_active })}>
          {product.is_active ? "Faol" : "O'chirilgan"}
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <input className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} />
        <button className="btn-ok" disabled={!valid || !dirty || patch.isPending} onClick={() => patch.mutate({ price_uzs: value })}>
          {patch.isPending ? <Spinner /> : "Saqlash"}
        </button>
      </div>
      <p className="mt-1 text-xs text-navy-400">Narx so'mda. Faqat yangi buyurtmalarga ta'sir qiladi.</p>
    </div>
  );
}

export default function AdminProducts() {
  const list = useQuery({ queryKey: ["admin", "products"], queryFn: endpoints.admin.products });

  return (
    <>
      <PageTitle title="Narxlar" subtitle="Stars paketlari narxini boshqarish" />
      {list.isLoading ? (
        <SkeletonList />
      ) : list.isError ? (
        <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      ) : list.data && list.data.length > 0 ? (
        <div className="space-y-3">
          {list.data.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState title="Paketlar yo'q" text="Backendda 'python -m app.seed' ni ishga tushiring" />
      )}
    </>
  );
}
