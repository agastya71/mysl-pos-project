/**
 * @fileoverview Employee Management Page
 *
 * Main employee listing and management interface for the POS system. Displays
 * a paginated table of employees with advanced search and filtering capabilities.
 *
 * Features:
 * - Search by name, email, or employee number (fuzzy search)
 * - Filter by role (dropdown with all available roles)
 * - Filter by active status (active only, inactive only, or all)
 * - Pagination with page navigation controls
 * - Edit employee (navigates to EmployeeFormPage)
 * - Create new employee (navigates to EmployeeFormPage)
 * - Visual status badges (green for active, red for inactive)
 *
 * State Management:
 * - Uses employees Redux slice for employee list, filters, pagination
 * - Uses roles Redux slice for role dropdown options
 * - Local state for search input to enable debouncing
 *
 * Navigation:
 * - Back button: navigates to POS page (/pos)
 * - New Employee button: navigates to employee form (/employees/new)
 * - Edit button: navigates to edit form (/employees/:id/edit)
 *
 * @component
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import {
  fetchEmployees,
  setPage,
  setSearch,
  setRoleFilter,
  setActiveFilter,
  clearFilters,
} from '../store/slices/employees.slice';
import { fetchRoles } from '../store/slices/roles.slice';

/**
 * EmployeesPage Component
 *
 * Main employee management interface with list view, search, and filters.
 * Uses Redux for state management and React Router for navigation.
 *
 * Component Flow:
 * 1. On mount: fetches employees and roles from API
 * 2. User interacts: search input, filter dropdowns, pagination buttons
 * 3. On filter change: dispatches Redux actions and triggers re-fetch
 * 4. On edit click: navigates to edit form with employee ID
 *
 * @returns {JSX.Element} Rendered employee management page with header, search bar, table, and pagination
 *
 * @example
 * // Route configuration in App.tsx
 * <Route path="/employees" element={<EmployeesPage />} />
 */
const EmployeesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  // Redux state selectors
  const { items: employees, pagination, filters, isLoading } = useSelector(
    (state: RootState) => state.employees
  );
  const { roles } = useSelector((state: RootState) => state.roles);

  // Local state for search input (enables debouncing if needed)
  const [searchInput, setSearchInput] = useState(filters.search);

  /**
   * Initial data fetch on component mount
   * Fetches employees with default filters and all roles for dropdown
   */
  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchRoles());
  }, [dispatch]);

  /**
   * Handle search button click
   * Updates Redux search filter and triggers employee list re-fetch
   */
  const handleSearch = () => {
    dispatch(setSearch(searchInput));
    dispatch(fetchEmployees());
  };

  /**
   * Handle clear filters button click
   * Resets all filters to defaults (search="", role=all, status=active) and re-fetches
   */
  const handleClearFilters = () => {
    setSearchInput('');
    dispatch(clearFilters());
    dispatch(fetchEmployees());
  };

  /**
   * Handle role filter dropdown change
   * Updates Redux role filter and triggers re-fetch
   * @param {React.ChangeEvent<HTMLSelectElement>} e - Select change event
   */
  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    dispatch(setRoleFilter(value ? parseInt(value) : undefined));
    dispatch(fetchEmployees());
  };

  /**
   * Handle active status filter dropdown change
   * Updates Redux active filter and triggers re-fetch
   * @param {React.ChangeEvent<HTMLSelectElement>} e - Select change event
   */
  const handleActiveFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    dispatch(setActiveFilter(value === 'all' ? undefined : value === 'true'));
    dispatch(fetchEmployees());
  };

  /**
   * Handle pagination page change
   * Updates Redux page number and triggers re-fetch
   * @param {number} page - Page number to navigate to (1-indexed)
   */
  const handlePageChange = (page: number) => {
    dispatch(setPage(page));
    dispatch(fetchEmployees());
  };

  /**
   * Navigate to create employee form
   * Opens EmployeeFormPage in create mode
   */
  const handleCreateNew = () => {
    navigate('/employees/new');
  };

  /**
   * Navigate to edit employee form
   * Opens EmployeeFormPage in edit mode with employee ID
   * @param {number} id - Employee ID to edit
   */
  const handleEditEmployee = (id: number) => {
    navigate(`/employees/${id}/edit`);
  };

  /**
   * Inline style objects for component styling
   * Uses consistent design patterns from other pages (white header, gray background)
   */
  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
    } as React.CSSProperties,
    header: {
      backgroundColor: 'white',
      borderBottom: '2px solid #eee',
      padding: '20px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as React.CSSProperties,
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    } as React.CSSProperties,
    backButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    } as React.CSSProperties,
    title: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#333',
    } as React.CSSProperties,
    newButton: {
      padding: '10px 24px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    } as React.CSSProperties,
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '30px 40px',
    } as React.CSSProperties,
    searchBar: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap',
    } as React.CSSProperties,
    searchInput: {
      flex: '1',
      minWidth: '250px',
      padding: '10px 16px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '4px',
    } as React.CSSProperties,
    select: {
      padding: '10px 16px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
    } as React.CSSProperties,
    searchButton: {
      padding: '10px 24px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
    } as React.CSSProperties,
    clearButton: {
      padding: '10px 24px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
    } as React.CSSProperties,
    tableContainer: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    } as React.CSSProperties,
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    } as React.CSSProperties,
    thead: {
      backgroundColor: '#f8f9fa',
    } as React.CSSProperties,
    th: {
      padding: '16px',
      textAlign: 'left',
      fontSize: '14px',
      fontWeight: 600,
      color: '#495057',
      borderBottom: '2px solid #dee2e6',
    } as React.CSSProperties,
    td: {
      padding: '16px',
      fontSize: '14px',
      color: '#212529',
      borderBottom: '1px solid #dee2e6',
    } as React.CSSProperties,
    badge: {
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
    } as React.CSSProperties,
    activeBadge: {
      backgroundColor: '#d4edda',
      color: '#155724',
    } as React.CSSProperties,
    inactiveBadge: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
    } as React.CSSProperties,
    editButton: {
      padding: '6px 16px',
      backgroundColor: '#ffc107',
      color: '#000',
      border: 'none',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
    } as React.CSSProperties,
    loading: {
      textAlign: 'center',
      padding: '40px',
      fontSize: '16px',
      color: '#6c757d',
    } as React.CSSProperties,
    empty: {
      textAlign: 'center',
      padding: '40px',
      fontSize: '16px',
      color: '#6c757d',
    } as React.CSSProperties,
    pagination: {
      marginTop: '20px',
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
    } as React.CSSProperties,
    pageButton: {
      padding: '8px 16px',
      backgroundColor: 'white',
      color: '#007bff',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      fontSize: '14px',
      cursor: 'pointer',
    } as React.CSSProperties,
    activePageButton: {
      backgroundColor: '#007bff',
      color: 'white',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={() => navigate('/pos')}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#5a6268')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6c757d')}
          >
            ← Back to POS
          </button>
          <h1 style={styles.title}>Employee Management</h1>
        </div>
        <button
          style={styles.newButton}
          onClick={handleCreateNew}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0056b3')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#007bff')}
        >
          + New Employee
        </button>
      </div>

      <div style={styles.container}>
        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="Search by name, email, or employee number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={styles.searchInput}
          />

          <select
            value={filters.role_id || ''}
            onChange={handleRoleFilterChange}
            style={styles.select}
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.role_name}
              </option>
            ))}
          </select>

          <select
            value={
              filters.is_active === undefined ? 'all' : filters.is_active ? 'true' : 'false'
            }
            onChange={handleActiveFilterChange}
            style={styles.select}
          >
            <option value="all">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          <button style={styles.searchButton} onClick={handleSearch}>
            Search
          </button>
          <button style={styles.clearButton} onClick={handleClearFilters}>
            Clear
          </button>
        </div>

        <div style={styles.tableContainer}>
          {isLoading ? (
            <div style={styles.loading}>Loading employees...</div>
          ) : employees.length === 0 ? (
            <div style={styles.empty}>
              No employees found. Click "New Employee" to add one.
            </div>
          ) : (
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <th style={styles.th}>Employee #</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Hire Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td style={styles.td}>{employee.employee_number}</td>
                    <td style={styles.td}>
                      {employee.first_name} {employee.last_name}
                    </td>
                    <td style={styles.td}>{employee.email}</td>
                    <td style={styles.td}>{employee.phone || '-'}</td>
                    <td style={styles.td}>{employee.role_name || '-'}</td>
                    <td style={styles.td}>
                      {new Date(employee.hire_date).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(employee.is_active ? styles.activeBadge : styles.inactiveBadge),
                        }}
                      >
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.editButton}
                        onClick={() => handleEditEmployee(employee.id)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              style={styles.pageButton}
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                style={{
                  ...styles.pageButton,
                  ...(page === pagination.page ? styles.activePageButton : {}),
                }}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              style={styles.pageButton}
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesPage;
