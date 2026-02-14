import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import {
  createEmployee,
  updateEmployee,
  fetchEmployeeById,
  clearSelectedEmployee,
  deactivateEmployee,
} from '../store/slices/employees.slice';
import { fetchRoles } from '../store/slices/roles.slice';
import { CreateEmployeeInput, UpdateEmployeeInput } from '../types/employee.types';

const EmployeeFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const { selectedEmployee, isLoading } = useSelector((state: RootState) => state.employees);
  const { roles } = useSelector((state: RootState) => state.roles);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    hire_date: new Date().toISOString().split('T')[0], // Today's date
    role_id: '',
    assigned_terminal_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);

  useEffect(() => {
    dispatch(fetchRoles());

    if (isEditMode && id) {
      dispatch(fetchEmployeeById(parseInt(id)));
    }

    return () => {
      dispatch(clearSelectedEmployee());
    };
  }, [dispatch, id, isEditMode]);

  useEffect(() => {
    if (isEditMode && selectedEmployee) {
      setFormData({
        first_name: selectedEmployee.first_name,
        last_name: selectedEmployee.last_name,
        email: selectedEmployee.email,
        phone: selectedEmployee.phone || '',
        hire_date: selectedEmployee.hire_date,
        role_id: selectedEmployee.role_id.toString(),
        assigned_terminal_id: selectedEmployee.assigned_terminal_id || '',
      });
    }
  }, [selectedEmployee, isEditMode]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.hire_date) {
      newErrors.hire_date = 'Hire date is required';
    }
    if (!formData.role_id) {
      newErrors.role_id = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      if (isEditMode && id) {
        const updateData: UpdateEmployeeInput = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || undefined,
          role_id: parseInt(formData.role_id),
          assigned_terminal_id: formData.assigned_terminal_id || undefined,
        };
        await dispatch(updateEmployee({ id: parseInt(id), data: updateData })).unwrap();
        alert('Employee updated successfully!');
      } else {
        const createData: CreateEmployeeInput = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || undefined,
          hire_date: formData.hire_date,
          role_id: parseInt(formData.role_id),
          assigned_terminal_id: formData.assigned_terminal_id || undefined,
        };
        await dispatch(createEmployee(createData)).unwrap();
        alert('Employee created successfully!');
      }
      navigate('/employees');
    } catch (error) {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} employee. Please try again.`);
    }
  };

  const handleDeactivate = async () => {
    if (!id) return;

    try {
      await dispatch(deactivateEmployee(parseInt(id))).unwrap();
      alert('Employee deactivated successfully!');
      setShowConfirmDeactivate(false);
      navigate('/employees');
    } catch (error) {
      alert('Failed to deactivate employee. Please try again.');
    }
  };

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
    deactivateButton: {
      padding: '10px 24px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
    } as React.CSSProperties,
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '30px 40px',
    } as React.CSSProperties,
    formContainer: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    } as React.CSSProperties,
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    } as React.CSSProperties,
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
    } as React.CSSProperties,
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    } as React.CSSProperties,
    label: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#495057',
    } as React.CSSProperties,
    required: {
      color: '#dc3545',
    } as React.CSSProperties,
    input: {
      padding: '10px 16px',
      fontSize: '14px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
    } as React.CSSProperties,
    inputError: {
      borderColor: '#dc3545',
    } as React.CSSProperties,
    errorText: {
      fontSize: '13px',
      color: '#dc3545',
    } as React.CSSProperties,
    select: {
      padding: '10px 16px',
      fontSize: '14px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      backgroundColor: 'white',
    } as React.CSSProperties,
    buttonGroup: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '20px',
    } as React.CSSProperties,
    cancelButton: {
      padding: '10px 24px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
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
    } as React.CSSProperties,
    modalContent: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      maxWidth: '500px',
      width: '90%',
    } as React.CSSProperties,
    modalTitle: {
      fontSize: '20px',
      fontWeight: 700,
      marginBottom: '16px',
      color: '#333',
    } as React.CSSProperties,
    modalText: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '24px',
    } as React.CSSProperties,
    modalButtons: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backButton} onClick={() => navigate('/employees')}>
            ← Back to Employees
          </button>
          <h1 style={styles.title}>
            {isEditMode ? 'Edit Employee' : 'New Employee'}
          </h1>
        </div>
        {isEditMode && selectedEmployee?.is_active && (
          <button
            style={styles.deactivateButton}
            onClick={() => setShowConfirmDeactivate(true)}
          >
            Deactivate Employee
          </button>
        )}
      </div>

      <div style={styles.container}>
        <div style={styles.formContainer}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  First Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  style={{
                    ...styles.input,
                    ...(errors.first_name ? styles.inputError : {}),
                  }}
                />
                {errors.first_name && <span style={styles.errorText}>{errors.first_name}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Last Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  style={{
                    ...styles.input,
                    ...(errors.last_name ? styles.inputError : {}),
                  }}
                />
                {errors.last_name && <span style={styles.errorText}>{errors.last_name}</span>}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Email <span style={styles.required}>*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  ...styles.input,
                  ...(errors.email ? styles.inputError : {}),
                }}
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Hire Date <span style={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  disabled={isEditMode}
                  style={{
                    ...styles.input,
                    ...(errors.hire_date ? styles.inputError : {}),
                  }}
                />
                {errors.hire_date && <span style={styles.errorText}>{errors.hire_date}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Role <span style={styles.required}>*</span>
                </label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  style={{
                    ...styles.select,
                    ...(errors.role_id ? styles.inputError : {}),
                  }}
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
                {errors.role_id && <span style={styles.errorText}>{errors.role_id}</span>}
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => navigate('/employees')}
              >
                Cancel
              </button>
              <button type="submit" style={styles.submitButton} disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditMode ? 'Update Employee' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showConfirmDeactivate && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Confirm Deactivation</h2>
            <p style={styles.modalText}>
              Are you sure you want to deactivate{' '}
              <strong>
                {selectedEmployee?.first_name} {selectedEmployee?.last_name}
              </strong>
              ? They will no longer be able to access the system.
            </p>
            <div style={styles.modalButtons}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowConfirmDeactivate(false)}
              >
                Cancel
              </button>
              <button style={styles.deactivateButton} onClick={handleDeactivate}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeFormPage;
