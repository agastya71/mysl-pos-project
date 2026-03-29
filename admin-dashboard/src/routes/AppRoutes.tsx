import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Login } from '../pages/Login';
import { AppLayout } from '../components/Layout/AppLayout';
import { Overview } from '../pages/Dashboard/Overview';
import { ProductList } from '../pages/Products/ProductList';
import { ProductForm } from '../pages/Products/ProductForm';
import { TransactionList } from '../pages/Transactions/TransactionList';
import { UserList } from '../pages/Users/UserList';
import { ReportsDashboard } from '../pages/Reports/ReportsDashboard';
import APListPage from '../pages/AccountsPayable/APListPage';
import VPListPage from '../pages/VendorPayments/VPListPage';
import VPBatchPage from '../pages/VendorPayments/VPBatchPage';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<Overview />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="transactions" element={<TransactionList />} />
        <Route path="users" element={<UserList />} />
        <Route path="reports" element={<ReportsDashboard />} />
        <Route path="finance/accounts-payable" element={<APListPage />} />
        <Route path="finance/vendor-payments" element={<VPListPage />} />
        <Route path="finance/vendor-payments/batch" element={<VPBatchPage />} />
        <Route index element={<Navigate to="/dashboard" />} />
      </Route>
    </Routes>
  );
};
