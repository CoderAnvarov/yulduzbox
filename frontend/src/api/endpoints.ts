import { request } from "./client";
import type {
  AdminDeposit,
  AdminOrder,
  AdminUser,
  Dashboard,
  Deposit,
  Me,
  Order,
  Page,
  Product,
  PublicSettings,
  Transaction,
} from "./types";

const qs = (params: Record<string, string | number | undefined>) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return p.length ? "?" + p.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&") : "";
};

export const endpoints = {
  me: () => request<Me>("/auth/me"),
  products: () => request<Product[]>("/products"),
  publicSettings: () => request<PublicSettings>("/settings/public"),

  history: (limit: number) => request<Page<Transaction>>(`/wallet/history${qs({ limit })}`),
  myDeposits: (limit: number) => request<Page<Deposit>>(`/wallet/deposits${qs({ limit })}`),
  createDeposit: (amount: number, reference: string, key: string) =>
    request<Deposit>("/wallet/deposits", { method: "POST", body: { amount, reference }, idempotencyKey: key }),

  orders: (limit: number) => request<Page<Order>>(`/orders${qs({ limit })}`),
  order: (id: number) => request<Order>(`/orders/${id}`),
  createOrder: (productId: number, recipient: string, key: string) =>
    request<Order>("/orders", { method: "POST", body: { product_id: productId, recipient_username: recipient }, idempotencyKey: key }),

  admin: {
    dashboard: () => request<Dashboard>("/admin/dashboard"),
    deposits: (status: string, limit: number) => request<Page<AdminDeposit>>(`/admin/deposits${qs({ status, limit })}`),
    approveDeposit: (id: number) => request<Deposit>(`/admin/deposits/${id}/approve`, { method: "POST" }),
    rejectDeposit: (id: number, reason: string) => request<Deposit>(`/admin/deposits/${id}/reject`, { method: "POST", body: { reason } }),
    orders: (status: string, limit: number) => request<Page<AdminOrder>>(`/admin/orders${qs({ status, limit })}`),
    approveOrder: (id: number) => request<Order>(`/admin/orders/${id}/approve`, { method: "POST" }),
    completeOrder: (id: number) => request<Order>(`/admin/orders/${id}/complete`, { method: "POST" }),
    rejectOrder: (id: number, reason: string) => request<Order>(`/admin/orders/${id}/reject`, { method: "POST", body: { reason } }),
    failOrder: (id: number, reason: string) => request<Order>(`/admin/orders/${id}/fail`, { method: "POST", body: { reason } }),
    users: (q: string, limit: number) => request<Page<AdminUser>>(`/admin/users${qs({ q, limit })}`),
    products: () => request<Product[]>("/admin/products"),
    patchProduct: (id: number, body: Partial<Pick<Product, "price_uzs" | "is_active" | "sort_order">>) =>
      request<Product>(`/admin/products/${id}`, { method: "PATCH", body }),
    settings: () => request<PublicSettings>("/admin/settings"),
    patchSettings: (body: Partial<PublicSettings>) => request<PublicSettings>("/admin/settings", { method: "PATCH", body }),
  },
};
