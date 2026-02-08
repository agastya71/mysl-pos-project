import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { searchCustomers, clearSearchResults } from '../../store/slices/customers.slice';
import { CustomerSearchResult } from '../../types/customer.types';
import CustomerFormModal from './CustomerFormModal';

interface CustomerSelectorProps {
  selectedCustomerId: string | null;
  onSelect: (customer: CustomerSearchResult | null) => void;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({ selectedCustomerId, onSelect }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { searchResults, items } = useSelector((state: RootState) => state.customers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find selected customer name for display
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = items.find((c) => c.id === selectedCustomerId);
      if (customer) {
        setSelectedCustomer({
          id: customer.id,
          customer_number: customer.customer_number,
          first_name: customer.first_name,
          last_name: customer.last_name,
          full_name: `${customer.first_name} ${customer.last_name}`,
          phone: customer.phone,
          email: customer.email,
        });
      }
    }
  }, [selectedCustomerId, items]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        dispatch(searchCustomers(searchQuery));
        setIsDropdownOpen(true);
      }, 300);
    } else {
      dispatch(clearSearchResults());
      setIsDropdownOpen(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, dispatch]);

  const handleSelectCustomer = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setSearchQuery('');
    setIsDropdownOpen(false);
    dispatch(clearSearchResults());
    onSelect(customer);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSearchQuery('');
    dispatch(clearSearchResults());
    onSelect(null);
  };

  const handleCreateSuccess = () => {
    setIsCreatingNew(false);
    // Optionally auto-select the newly created customer
    if (items.length > 0) {
      const newCustomer = items[0];
      handleSelectCustomer({
        id: newCustomer.id,
        customer_number: newCustomer.customer_number,
        first_name: newCustomer.first_name,
        last_name: newCustomer.last_name,
        full_name: `${newCustomer.first_name} ${newCustomer.last_name}`,
        phone: newCustomer.phone,
        email: newCustomer.email,
      });
    }
  };

  const styles = {
    container: {
      position: 'relative' as const,
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 600,
      color: '#333',
      marginBottom: '8px',
    },
    inputGroup: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
    },
    clearButton: {
      padding: '10px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
    },
    newButton: {
      padding: '10px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
    },
    selectedCustomer: {
      padding: '12px',
      backgroundColor: '#e7f3ff',
      border: '1px solid #007bff',
      borderRadius: '4px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    customerInfo: {
      flex: 1,
    },
    customerName: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#007bff',
    },
    customerDetails: {
      fontSize: '12px',
      color: '#666',
      marginTop: '4px',
    },
    dropdown: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      marginTop: '4px',
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      maxHeight: '300px',
      overflowY: 'auto' as const,
      zIndex: 1000,
    },
    dropdownItem: {
      padding: '12px',
      cursor: 'pointer',
      borderBottom: '1px solid #eee',
      transition: 'background-color 0.2s',
    },
    dropdownItemName: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#333',
    },
    dropdownItemDetails: {
      fontSize: '12px',
      color: '#666',
      marginTop: '4px',
    },
    createNewItem: {
      padding: '12px',
      cursor: 'pointer',
      backgroundColor: '#f8f9fa',
      color: '#28a745',
      fontWeight: 600,
      textAlign: 'center' as const,
      borderTop: '2px solid #dee2e6',
    },
    noResults: {
      padding: '12px',
      textAlign: 'center' as const,
      color: '#999',
      fontSize: '14px',
    },
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      <label style={styles.label}>Customer (Optional)</label>

      {selectedCustomer ? (
        <div style={styles.selectedCustomer}>
          <div style={styles.customerInfo}>
            <div style={styles.customerName}>
              {selectedCustomer.full_name} ({selectedCustomer.customer_number})
            </div>
            <div style={styles.customerDetails}>
              {selectedCustomer.email || selectedCustomer.phone || 'No contact info'}
            </div>
          </div>
          <button onClick={handleClearSelection} style={styles.clearButton}>
            Clear
          </button>
        </div>
      ) : (
        <>
          <div style={styles.inputGroup}>
            <input
              type="text"
              placeholder="Search customers by name, email, phone, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.input}
            />
            <button onClick={() => setIsCreatingNew(true)} style={styles.newButton}>
              + New
            </button>
          </div>

          {isDropdownOpen && (
            <div style={styles.dropdown}>
              {searchResults.length > 0 ? (
                <>
                  {searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      style={styles.dropdownItem}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={styles.dropdownItemName}>
                        {customer.full_name} ({customer.customer_number})
                      </div>
                      <div style={styles.dropdownItemDetails}>
                        {customer.email || customer.phone || 'No contact info'}
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => setIsCreatingNew(true)}
                    style={styles.createNewItem}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e7f3ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                  >
                    + Create New Customer
                  </div>
                </>
              ) : searchQuery.trim().length >= 2 ? (
                <div style={styles.noResults}>No customers found</div>
              ) : null}
            </div>
          )}
        </>
      )}

      {isCreatingNew && (
        <CustomerFormModal onClose={() => setIsCreatingNew(false)} onSuccess={handleCreateSuccess} />
      )}
    </div>
  );
};

export default CustomerSelector;
