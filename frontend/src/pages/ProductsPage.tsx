import { useQuery } from "@tanstack/react-query";

import { endpoints } from "../api/endpoints";
import { ProductCard } from "../components/Cards";
import { EmptyState, ErrorState, PageTitle, Skeleton } from "../components/ui";

export default function ProductsPage() {
  const products = useQuery({ queryKey: ["products"], queryFn: endpoints.products });

  return (
    <>
      <PageTitle title="Stars paketlari" subtitle="Kerakli paketni tanlang" />
      {products.isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : products.isError ? (
        <ErrorState message={products.error.message} onRetry={() => products.refetch()} />
      ) : products.data && products.data.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {products.data.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState title="Paketlar hozircha yo'q" />
      )}
    </>
  );
}
