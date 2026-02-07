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

  // Sync local query with Redux state (for external clears)
  useEffect(() => {
    if (reduxSearchQuery === '' && localQuery !== '') {
      setLocalQuery('');
    }
  }, [reduxSearchQuery, localQuery]);

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
        onChange={(e) => setLocalQuery(e.target.value)}
        style={styles.input}
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
    fontSize: '1rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
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
