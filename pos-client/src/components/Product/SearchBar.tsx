import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { searchProducts, setSearchQuery, fetchProducts } from '../../store/slices/products.slice';

interface SearchBarProps {
  onSearch?: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const dispatch = useAppDispatch();
  const reduxSearchQuery = useAppSelector((state) => state.products.searchQuery);
  const [localQuery, setLocalQuery] = useState('');

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim()) {
        dispatch(setSearchQuery(localQuery));
        dispatch(searchProducts(localQuery));
        onSearch?.(localQuery);
      } else {
        // When search is cleared, fetch all products
        dispatch(setSearchQuery(''));
        dispatch(fetchProducts({ limit: 100 }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery, dispatch, onSearch]);

  // Sync with external Redux clears (only clear local if Redux is cleared)
  // DO NOT include localQuery in deps - would cause infinite loop/clearing on type
  useEffect(() => {
    if (reduxSearchQuery === '' && localQuery !== '') {
      setLocalQuery('');
    }
  }, [reduxSearchQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  };

  const handleClear = () => {
    setLocalQuery('');
    dispatch(setSearchQuery(''));
    dispatch(fetchProducts({ limit: 100 }));
  };

  return (
    <div style={styles.container}>
      <input
        type="text"
        placeholder="Search products by name, SKU, or barcode..."
        value={localQuery}
        onChange={handleChange}
        style={styles.input}
        autoComplete="off"
        autoFocus
      />
      {localQuery && (
        <button onClick={handleClear} style={styles.clearButton}>
          ✕
        </button>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    marginBottom: '1rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 2.5rem 0.75rem 1rem',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#000000',
    boxSizing: 'border-box' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  clearButton: {
    position: 'absolute' as const,
    right: '0.5rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: '#666',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
  },
};

export default SearchBar;
