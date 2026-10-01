export interface Page<T> {
  items: T[];
  total: number;
}

export interface Me {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  is_admin: boolean;
  balance: number;
}

export interface UserBrief {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
}

export interface Product {
  id: number;
  stars_amount: number;
  price_uzs: number;
  is_active: boolean;
  sort_order: number;
}

export interface Transaction {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  deposit_id: number | null;
  order_id: number | null;
  created_at: string;
}

export interface Deposit {
  id: number;
  amount: number;
  reference: string;
  status: string;
  reject_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}
export interface AdminDeposit extends Deposit {
  user: UserBrief;
}

export interface Order {
  id: number;
  product_id: number;
  stars_amount: number;
  price_uzs: number;
  recipient_username: string;
  status: string;
  admin_note: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface AdminOrder extends Order {
  user: UserBrief;
}

export interface AdminUser {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  is_blocked: boolean;
  balance: number;
  created_at: string;
}

export interface Dashboard {
  users: number;
  pending_deposits: number;
  pending_orders: number;
  approved_deposits_sum: number;
  completed_orders: number;
  completed_revenue: number;
  total_balances: number;
}

export interface PublicSettings {
  payment_details: string;
  min_deposit: number;
}
