import React, { useState, CSSProperties } from 'react';
import { CategoryWithChildren } from '../../types/category.types';

interface CategoryTreeProps {
  categories: CategoryWithChildren[];
  onEdit: (category: CategoryWithChildren) => void;
  onDelete: (category: CategoryWithChildren) => void;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  onEdit,
  onDelete,
}) => {
  return (
    <div style={styles.categoryTree}>
      {categories.map((category) => (
        <CategoryTreeNode
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

interface CategoryTreeNodeProps {
  category: CategoryWithChildren;
  depth?: number;
  onEdit: (category: CategoryWithChildren) => void;
  onDelete: (category: CategoryWithChildren) => void;
}

const CategoryTreeNode: React.FC<CategoryTreeNodeProps> = ({
  category,
  depth = 0,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div>
      <div
        style={{
          ...styles.categoryItem,
          paddingLeft: `${depth * 24 + 16}px`,
        }}
      >
        <div style={styles.categoryInfo}>
          {hasChildren ? (
            <button
              style={styles.expandButton}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span style={styles.expandSpacer} />
          )}

          <span style={styles.categoryNumber}>{category.category_number}</span>
          <span style={styles.categoryName}>{category.name}</span>
          {category.description && (
            <span style={styles.categoryDescription}>{category.description}</span>
          )}
          <span style={styles.productCount}>
            {category.product_count} product{category.product_count !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={styles.categoryActions}>
          <button
            style={styles.btnEdit}
            onClick={() => onEdit(category)}
            title="Edit category"
          >
            ✏️ Edit
          </button>
          <button
            style={{
              ...styles.btnDelete,
              ...(category.product_count > 0 || (category.children?.length || 0) > 0
                ? styles.btnDeleteDisabled
                : {}),
            }}
            onClick={() => onDelete(category)}
            title="Delete category"
            disabled={category.product_count > 0 || (category.children?.length || 0) > 0}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  categoryTree: {
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  categoryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  categoryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  expandButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    width: '20px',
    padding: 0,
    color: '#666',
  },
  expandSpacer: {
    width: '20px',
    display: 'inline-block',
  },
  categoryNumber: {
    fontFamily: '"Courier New", monospace',
    background: '#e3f2fd',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#1976d2',
    fontWeight: 600,
  },
  categoryName: {
    fontWeight: 500,
    fontSize: '15px',
    color: '#2c3e50',
  },
  categoryDescription: {
    color: '#666',
    fontSize: '13px',
    fontStyle: 'italic',
  },
  productCount: {
    color: '#666',
    fontSize: '12px',
    background: '#f5f5f5',
    padding: '4px 10px',
    borderRadius: '12px',
    whiteSpace: 'nowrap',
  },
  categoryActions: {
    display: 'flex',
    gap: '8px',
  },
  btnEdit: {
    background: 'white',
    border: '1px solid #e0e0e0',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  btnDelete: {
    background: 'white',
    border: '1px solid #e0e0e0',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  btnDeleteDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
