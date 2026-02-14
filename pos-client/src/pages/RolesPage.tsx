/**
 * @fileoverview Role and Permission Management Page
 *
 * Main interface for managing roles and their permissions in the POS system.
 * Displays roles as cards in a grid layout with permission management modals.
 *
 * Features:
 * - Role Card Grid: displays all roles with name, description, and manage button
 * - Create Role Modal: form for creating new roles with name and description
 * - Permissions Modal: checklist interface for assigning/revoking permissions
 * - Real-time permission toggle: checkbox-based permission assignment
 * - Permission counter: shows assigned/total permissions for selected role
 *
 * Role Management:
 * - View all roles in grid layout
 * - Create new role with name and optional description
 * - Manage permissions per role (assign/revoke)
 * - Cannot delete roles (soft delete not implemented)
 *
 * Permission System:
 * - Permissions are predefined in database (not created via UI)
 * - Each permission has: id, permission_name, resource, action, description
 * - Roles can have 0 to N permissions assigned
 * - Permission assignment creates role_permissions record
 *
 * State Management:
 * - Uses roles Redux slice for role list and selected role
 * - Uses roles Redux slice for permissions list
 * - Local state for modal visibility and form inputs
 *
 * Navigation:
 * - Back button: returns to POS page (/pos)
 * - Close modal buttons: dismiss modals without navigation
 *
 * @component
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import {
  fetchRoles,
  fetchRoleById,
  fetchPermissions,
  assignPermissionToRole,
  revokePermissionFromRole,
  createRole,
  clearSelectedRole,
} from '../store/slices/roles.slice';
import { CreateRoleInput } from '../types/employee.types';

/**
 * RolesPage Component
 *
 * Role and permission management interface with card grid and modal-based workflows.
 * Uses Redux for state management and modal patterns for create/edit operations.
 *
 * Component Flow:
 * 1. On mount: fetches roles and permissions from API
 * 2. User clicks "Manage Permissions": opens permissions modal with role data
 * 3. User toggles permission checkbox: immediately assigns or revokes permission
 * 4. User clicks "New Role": opens create role modal
 * 5. On role create: dispatches action, shows alert, closes modal
 *
 * @returns {JSX.Element} Rendered roles page with header, role cards, and modals
 *
 * @example
 * // Route configuration in App.tsx
 * <Route path="/roles" element={<RolesPage />} />
 */
const RolesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Redux state selectors
  const { roles, permissions, selectedRole, isLoading } = useSelector(
    (state: RootState) => state.roles
  );

  // Local modal visibility state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Local form state for create role modal
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  /**
   * Initial data fetch on component mount
   * Fetches all roles and all permissions for display
   */
  useEffect(() => {
    dispatch(fetchRoles());
    dispatch(fetchPermissions());
  }, [dispatch]);

  /**
   * Handle view permissions button click
   * Fetches role details with permissions and opens permissions modal
   * @param {number} roleId - Role ID to fetch and manage permissions for
   */
  const handleViewPermissions = async (roleId: number) => {
    await dispatch(fetchRoleById(roleId));
    setShowPermissionsModal(true);
  };

  /**
   * Handle create role form submission
   * Validates role name, dispatches create action, shows alert, closes modal
   * @param {React.FormEvent} e - Form submit event
   */
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRoleName.trim()) {
      alert('Role name is required');
      return;
    }

    try {
      const data: CreateRoleInput = {
        role_name: newRoleName,
        description: newRoleDescription || undefined,
      };
      await dispatch(createRole(data)).unwrap();
      alert('Role created successfully!');
      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDescription('');
    } catch (error) {
      alert('Failed to create role. Please try again.');
    }
  };

  /**
   * Handle permission checkbox toggle
   * Assigns permission if unchecked, revokes if checked
   * Immediately updates via API and refetches role data
   * @param {number} permissionId - Permission ID to toggle
   * @param {boolean} isAssigned - Current assignment state (true if already assigned)
   */
  const handleTogglePermission = async (permissionId: number, isAssigned: boolean) => {
    if (!selectedRole) return;

    try {
      if (isAssigned) {
        await dispatch(
          revokePermissionFromRole({ roleId: selectedRole.id, permissionId })
        ).unwrap();
      } else {
        await dispatch(
          assignPermissionToRole({ roleId: selectedRole.id, data: { permission_id: permissionId } })
        ).unwrap();
      }
    } catch (error) {
      alert('Failed to update permission. Please try again.');
    }
  };

  /**
   * Inline style objects for component styling
   * Grid layout for role cards, modal overlays for create/edit workflows
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
    } as React.CSSProperties,
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '30px 40px',
    } as React.CSSProperties,
    rolesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
    } as React.CSSProperties,
    roleCard: {
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    } as React.CSSProperties,
    roleName: {
      fontSize: '18px',
      fontWeight: 700,
      color: '#333',
    } as React.CSSProperties,
    roleDescription: {
      fontSize: '14px',
      color: '#666',
      flex: 1,
    } as React.CSSProperties,
    viewButton: {
      padding: '8px 16px',
      backgroundColor: '#17a2b8',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      alignSelf: 'flex-start',
    } as React.CSSProperties,
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px',
    } as React.CSSProperties,
    modalContent: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      maxWidth: '700px',
      width: '100%',
      maxHeight: '80vh',
      overflow: 'auto',
    } as React.CSSProperties,
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    } as React.CSSProperties,
    modalTitle: {
      fontSize: '20px',
      fontWeight: 700,
      color: '#333',
    } as React.CSSProperties,
    closeButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
    } as React.CSSProperties,
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '16px',
    } as React.CSSProperties,
    label: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#495057',
    } as React.CSSProperties,
    input: {
      padding: '10px 16px',
      fontSize: '14px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
    } as React.CSSProperties,
    textarea: {
      padding: '10px 16px',
      fontSize: '14px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      resize: 'vertical',
      minHeight: '80px',
    } as React.CSSProperties,
    submitButton: {
      padding: '10px 24px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      width: '100%',
    } as React.CSSProperties,
    permissionsSection: {
      marginTop: '20px',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '16px',
      fontWeight: 700,
      color: '#333',
      marginBottom: '16px',
    } as React.CSSProperties,
    permissionsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxHeight: '400px',
      overflow: 'auto',
    } as React.CSSProperties,
    permissionItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      gap: '12px',
    } as React.CSSProperties,
    checkbox: {
      width: '20px',
      height: '20px',
      cursor: 'pointer',
    } as React.CSSProperties,
    permissionDetails: {
      flex: 1,
    } as React.CSSProperties,
    permissionName: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#333',
    } as React.CSSProperties,
    permissionDescription: {
      fontSize: '13px',
      color: '#666',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backButton} onClick={() => navigate('/pos')}>
            ← Back to POS
          </button>
          <h1 style={styles.title}>Role & Permission Management</h1>
        </div>
        <button style={styles.newButton} onClick={() => setShowCreateModal(true)}>
          + New Role
        </button>
      </div>

      <div style={styles.container}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            Loading roles...
          </div>
        ) : (
          <div style={styles.rolesGrid}>
            {roles.map((role) => (
              <div key={role.id} style={styles.roleCard}>
                <h3 style={styles.roleName}>{role.role_name}</h3>
                <p style={styles.roleDescription}>
                  {role.description || 'No description provided'}
                </p>
                <button style={styles.viewButton} onClick={() => handleViewPermissions(role.id)}>
                  Manage Permissions
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create New Role</h2>
              <button style={styles.closeButton} onClick={() => setShowCreateModal(false)}>
                Close
              </button>
            </div>

            <form onSubmit={handleCreateRole}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role Name *</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., supervisor, team_lead"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe the responsibilities of this role"
                  style={styles.textarea}
                />
              </div>

              <button type="submit" style={styles.submitButton}>
                Create Role
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedRole && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Permissions for "{selectedRole.role_name}"
              </h2>
              <button
                style={styles.closeButton}
                onClick={() => {
                  setShowPermissionsModal(false);
                  dispatch(clearSelectedRole());
                }}
              >
                Close
              </button>
            </div>

            <div style={styles.permissionsSection}>
              <h3 style={styles.sectionTitle}>
                Assigned: {selectedRole.permissions.length} / {permissions.length}
              </h3>

              <div style={styles.permissionsList}>
                {permissions.map((permission) => {
                  const isAssigned = selectedRole.permissions.some((p) => p.id === permission.id);
                  return (
                    <div key={permission.id} style={styles.permissionItem}>
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleTogglePermission(permission.id, isAssigned)}
                        style={styles.checkbox}
                      />
                      <div style={styles.permissionDetails}>
                        <div style={styles.permissionName}>{permission.permission_name}</div>
                        <div style={styles.permissionDescription}>
                          {permission.description || `${permission.action} on ${permission.resource}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
