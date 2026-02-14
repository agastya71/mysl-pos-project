import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import { LoginPage } from './pages/LoginPage';
import { POSPage } from './pages/POSPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import CustomersPage from './pages/CustomersPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { InventoryPage } from './pages/InventoryPage';
import { InventoryHistoryPage } from './pages/InventoryHistoryPage';
import InventoryReportsPage from './pages/InventoryReportsPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderDetailsPage from './pages/PurchaseOrderDetailsPage';
import PurchaseOrderFormPage from './pages/PurchaseOrderFormPage';
import ReorderSuggestionsPage from './pages/ReorderSuggestionsPage';
import VendorsPage from './pages/VendorsPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import RolesPage from './pages/RolesPage';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/pos"
          element={
            <PrivateRoute>
              <POSPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/pos/history"
          element={
            <PrivateRoute>
              <TransactionHistoryPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <PrivateRoute>
              <CustomersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <PrivateRoute>
              <CategoriesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors"
          element={
            <PrivateRoute>
              <VendorsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <PrivateRoute>
              <InventoryPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/inventory/history"
          element={
            <PrivateRoute>
              <InventoryHistoryPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/inventory/reports"
          element={
            <PrivateRoute>
              <InventoryReportsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/purchase-orders"
          element={
            <PrivateRoute>
              <PurchaseOrdersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/purchase-orders/new"
          element={
            <PrivateRoute>
              <PurchaseOrderFormPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/purchase-orders/reorder-suggestions"
          element={
            <PrivateRoute>
              <ReorderSuggestionsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/purchase-orders/:id"
          element={
            <PrivateRoute>
              <PurchaseOrderDetailsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/purchase-orders/:id/edit"
          element={
            <PrivateRoute>
              <PurchaseOrderFormPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <PrivateRoute>
              <EmployeesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/employees/new"
          element={
            <PrivateRoute>
              <EmployeeFormPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/employees/:id/edit"
          element={
            <PrivateRoute>
              <EmployeeFormPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <PrivateRoute>
              <RolesPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;
