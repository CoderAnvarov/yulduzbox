import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { endpoints } from "../api/endpoints";
import { OrderCard } from "../components/Cards";
import { EmptyState, ErrorState, LoadMore, PageTitle, SkeletonList } from "../components/ui";

export default function OrdersPage() {
  const [limit, setLimit] = useState(20);
  const orders = useQuery({ queryKey: ["orders", limit], queryFn: () => endpoints.orders(limit) });

  return (
    <>
      <PageTitle title="Buyurtmalar" />
      {orders.isLoading ? (
        <SkeletonList count={4} />
      ) : orders.isError ? (
        <ErrorState message={orders.error.message} onRetry={() => orders.refetch()} />
      ) : orders.data && orders.data.items.length > 0 ? (
        <>
          <div className="space-y-3">
            {orders.data.items.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
          <LoadMore shown={orders.data.items.length} total={orders.data.total} onClick={() => setLimit((l) => l + 20)} />
        </>
      ) : (
        <EmptyState title="Hali buyurtma yo'q" text="Bosh sahifadan Stars paketini tanlang" />
      )}
    </>
  );
}
