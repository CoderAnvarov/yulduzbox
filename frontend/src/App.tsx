import { Route, Routes } from "react-router-dom";

import { AdminGate, AdminLayout, AuthGate, UserLayout } from "./components/Layouts";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";
import CreateOrderPage from "./pages/CreateOrderPage";
import DepositPage from "./pages/DepositPage";
import HomePage from "./pages/HomePage";
import OrderDetailPage from "./pages/OrderDetailPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import ProfilePage from "./pages/ProfilePage";
import WalletPage from "./pages/WalletPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AuthGate />}>
        <Route element={<UserLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/order/new/:productId" element={<CreateOrderPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/wallet/deposit" element={<DepositPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route element={<AdminGate />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/deposits" element={<AdminDeposits />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<div className="p-10 text-center text-navy-500">Sahifa topilmadi</div>} />
    </Routes>
  );
}
