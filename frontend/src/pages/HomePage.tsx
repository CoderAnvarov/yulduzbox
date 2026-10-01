import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { endpoints } from "../api/endpoints";
import { OrderCard, ProductCard } from "../components/Cards";
import { EmptyState, ErrorState, Skeleton, SkeletonList } from "../components/ui";
import { useMe } from "../hooks/useMe";
import { formatUZS } from "../lib/format";

export default function HomePage() {
  const me = useMe();
  const products = useQuery({ queryKey: ["products"], queryFn: endpoints.products });
  const orders = useQuery({ queryKey: ["orders", 3], queryFn: () => endpoints.orders(3) });

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <Star className="h-6 w-6" fill="currentColor" />
        </div>
        <div>
          <h1 className="smallcaps text-2xl leading-tight text-navy-900">YulduzBox</h1>
          <p className="text-sm text-navy-500">Salom, {me.data?.first_name ?? "do'stim"} 👋</p>
        </div>
      </div>

      <section className="mb-6 rounded-card bg-gradient-to-br from-brand-600 to-navy-700 p-5 text-white shadow-card">
        <p className="smallcaps text-sm text-brand-100">Sizning balansingiz</p>
        <p className="mt-1 text-3xl font-extrabold">{formatUZS(me.data?.balance ?? 0)}</p>
        <Link to="/wallet/deposit" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
          <Plus className="h-4 w-4" /> Balansni to'ldirish
        </Link>
      </section>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="smallcaps text-lg text-navy-700">Stars paketlari</h2>
        <Link to="/products" className="flex items-center gap-1 text-sm font-semibold text-brand-600">
          Hammasi <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {products.isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : products.isError ? (
        <ErrorState message={products.error.message} onRetry={() => products.refetch()} />
      ) : products.data && products.data.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {products.data.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState title="Paketlar hozircha yo'q" />
      )}

      <h2 className="smallcaps mb-3 mt-7 text-lg text-navy-700">So'nggi buyurtmalar</h2>
      {orders.isLoading ? (
        <SkeletonList count={2} />
      ) : orders.isError ? (
        <ErrorState message={orders.error.message} onRetry={() => orders.refetch()} />
      ) : orders.data && orders.data.items.length > 0 ? (
        <div className="space-y-3">
          {orders.data.items.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      ) : (
        <EmptyState title="Hali buyurtma yo'q" text="Yuqoridan paket tanlang" />
      )}
    </>
  );
}
