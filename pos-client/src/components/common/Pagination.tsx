import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '20px 0',
    },
    button: {
      padding: '8px 16px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s',
    } as React.CSSProperties,
    buttonDisabled: {
      padding: '8px 16px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      backgroundColor: '#f5f5f5',
      cursor: 'not-allowed',
      color: '#999',
    } as React.CSSProperties,
    pageInfo: {
      fontSize: '14px',
      color: '#666',
      padding: '0 10px',
    },
  };

  return (
    <div style={styles.container}>
      <button
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        style={currentPage <= 1 ? styles.buttonDisabled : styles.button}
      >
        ← Previous
      </button>
      <div style={styles.pageInfo}>
        Page {currentPage} of {totalPages}
      </div>
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        style={currentPage >= totalPages ? styles.buttonDisabled : styles.button}
      >
        Next →
      </button>
    </div>
  );
};

export default Pagination;
