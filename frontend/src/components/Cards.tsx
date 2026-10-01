import { ChevronRight, Star } from "lucide-react";
import { Link } from "react-router-dom";

import type { Order, Product } from "../api/types";
import { formatDate, formatNumber, formatUZS } from "../lib/format";
import { ORDER_STATUS } from "../lib/status";
import { StatusBadge } from "./ui";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/order/new/${product.id}`}
      className="card flex flex-col items-start gap-2 transition active:scale-[0.98] hover:ring-brand-300"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Star className="h-5 w-5" fill="currentColor" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-navy-900">{formatNumber(product.stars_amount)}</p>
        <p className="smallcaps text-xs text-navy-500">stars</p>
      </div>
      <p className="text-sm font-bold text-brand-600">{formatUZS(product.price_uzs)}</p>
    </Link>
  );
}

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link to={`/orders/${order.id}`} className="card flex items-center gap-3 transition active:scale-[0.99]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Star className="h-5 w-5" fill="currentColor" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-navy-900">
          {formatNumber(order.stars_amount)} Stars → @{order.recipient_username}
        </p>
        <p className="text-xs text-navy-500">
          #{order.id} · {formatDate(order.created_at)} · {formatUZS(order.price_uzs)}
        </p>
        <div className="mt-1.5">
          <StatusBadge map={ORDER_STATUS} status={order.status} />
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-navy-400" />
    </Link>
  );
}
