/**
 * Purchase Orders List Page
 * Main page for viewing and managing purchase orders
 * Pattern: Similar to TransactionHistoryPage
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchPOs,
  fetchVendors,
  setVendorFilter,
  setStatusFilter,
  setOrderTypeFilter,
  setDateRangeFilter,
  setSearchFilter,
  clearFilters,
  setPage,
  selectPurchaseOrders,
  selectPOFilters,
  selectPOPagination,
  selectVendors,
  selectPOLoading,
  selectPOError,
  deletePOThunk,
  submitPOThunk,
  approvePOThunk,
  cancelPOThunk,
  closePOThunk,
  fetchPOById,
  selectSelectedPO,
  fetchReorderSuggestions,
  selectReorderSuggestions,
} from '../store/slices/purchaseOrders.slice';
import { POStatus, POOrderType } from '../types/purchaseOrder.types';
import PurchaseOrderDetailsModal from '../components/PurchaseOrder/PurchaseOrderDetailsModal';
import ReorderSuggestionsModal from '../components/PurchaseOrder/ReorderSuggestionsModal';

const PurchaseOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const pos = useAppSelector(selectPurchaseOrders);
  const filters = useAppSelector(selectPOFilters);
  const pagination = useAppSelector(selectPOPagination);
  const vendors = useAppSelector(selectVendors);
  const isLoading = useAppSelector(selectPOLoading);
  const error = useAppSelector(selectPOError);
  const selectedPO = useAppSelector(selectSelectedPO);
  const reorderSuggestions = useAppSelector(selectReorderSuggestions);

  // Modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  // Load data on mount
  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchPOs());
  }, [dispatch]);

  // Reload when filters or pagination change
  useEffect(() => {
    dispatch(fetchPOs());
  }, [
    dispatch,
    filters.vendor_id,
    filters.status,
    filters.order_type,
    filters.start_date,
    filters.end_date,
    filters.search,
    pagination.page,
  ]);

  const handleCreateNew = () => {
    navigate('/purchase-orders/new');
  };

  const handleReorderSuggestions = async () => {
    await dispatch(fetchReorderSuggestions());
    setIsReorderModalOpen(true);
  };

  const handleViewDetails = async (id: string) => {
    await dispatch(fetchPOById(id));
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (id: string) => {
    navigate(`/purchase-orders/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this draft purchase order?')) {
      await dispatch(deletePOThunk(id));
      dispatch(fetchPOs());
    }
  };

  const handleSubmit = async (id: string) => {
    if (window.confirm('Submit this purchase order for approval?')) {
      await dispatch(submitPOThunk(id));
      dispatch(fetchPOs());
    }
  };

  const handleApprove = async (id: string) => {
    if (window.confirm('Approve this purchase order?')) {
      await dispatch(approvePOThunk(id));
      dispatch(fetchPOs());
    }
  };

  const handleCancel = async (id: string) => {
    const reason = window.prompt('Enter cancellation reason:');
    if (reason) {
      await dispatch(cancelPOThunk({ id, reason }));
      dispatch(fetchPOs());
    }
  };

  const handleClose = async (id: string) => {
    if (window.confirm('Close this purchase order? It cannot be reopened.')) {
      await dispatch(closePOThunk(id));
      dispatch(fetchPOs());
    }
  };

  const getStatusBadgeColor = (status: POStatus): string => {
    switch (status) {
      case 'draft':
        return '#6c757d'; // Gray
      case 'submitted':
        return '#007bff'; // Blue
      case 'approved':
        return '#28a745'; // Green
      case 'partially_received':
        return '#ffc107'; // Yellow
      case 'received':
        return '#17a2b8'; // Cyan
      case 'closed':
        return '#6c757d'; // Gray
      case 'cancelled':
        return '#dc3545'; // Red
      default:
        return '#6c757d';
    }
  };

  const getStatusLabel = (status: POStatus): string => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <button
            onClick={() => navigate('/pos')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '10px',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#5a6268')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6c757d')}
          >
            ← Back to POS
          </button>
          <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold' }}>
            Purchase Orders
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/vendors')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#5a6268')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6c757d')}
          >
            🏢 Manage Vendors
          </button>
          <button
            onClick={handleReorderSuggestions}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e0a800')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffc107')}
          >
            📦 Reorder Suggestions
          </button>
          <button
            onClick={handleCreateNew}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#218838')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#28a745')}
          >
            + Create Purchase Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '15px',
          }}
        >
          {/* Search */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
              Search PO #
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => dispatch(setSearchFilter(e.target.value))}
              placeholder="PO-20260208-0001"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          {/* Vendor */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
              Vendor
            </label>
            <select
              value={filters.vendor_id}
              onChange={(e) => dispatch(setVendorFilter(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.business_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => dispatch(setStatusFilter(e.target.value as POStatus | ''))}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="partially_received">Partially Received</option>
              <option value="received">Received</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
              Order Type
            </label>
            <select
              value={filters.order_type}
              onChange={(e) =>
                dispatch(setOrderTypeFilter(e.target.value as POOrderType | ''))
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="">All Types</option>
              <option value="standard">Standard</option>
              <option value="urgent">Urgent</option>
              <option value="drop_ship">Drop Ship</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
              From Date
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) =>
                dispatch(
                  setDateRangeFilter({
                    start_date: e.target.value,
                    end_date: filters.end_date,
                  })
                )
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          {/* End Date */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
              To Date
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) =>
                dispatch(
                  setDateRangeFilter({
                    start_date: filters.start_date,
                    end_date: e.target.value,
                  })
                )
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>

        <button
          onClick={() => dispatch(clearFilters())}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div
            style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #007bff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }}
          />
          <p>Loading purchase orders...</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={tableHeaderStyle}>PO Number</th>
                <th style={tableHeaderStyle}>Vendor</th>
                <th style={tableHeaderStyle}>Type</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Order Date</th>
                <th style={tableHeaderStyle}>Total</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>
                    <p style={{ color: '#6c757d', fontSize: '16px' }}>
                      No purchase orders found
                    </p>
                    <button
                      onClick={handleCreateNew}
                      style={{
                        marginTop: '10px',
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Create Your First Purchase Order
                    </button>
                  </td>
                </tr>
              ) : (
                pos.map((po) => (
                  <tr key={po.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={tableCellStyle}>
                      <span
                        style={{
                          color: '#007bff',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                        onClick={() => handleViewDetails(po.id)}
                      >
                        {po.po_number}
                      </span>
                    </td>
                    <td style={tableCellStyle}>{po.vendor_name}</td>
                    <td style={tableCellStyle}>
                      {po.order_type.charAt(0).toUpperCase() + po.order_type.slice(1)}
                    </td>
                    <td style={tableCellStyle}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: getStatusBadgeColor(po.status),
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        {getStatusLabel(po.status)}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      {new Date(po.order_date).toLocaleDateString()}
                    </td>
                    <td style={tableCellStyle}>${Number(po.total_amount).toFixed(2)}</td>
                    <td style={tableCellStyle}>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleViewDetails(po.id)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          View
                        </button>
                        {po.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleEdit(po.id)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#ffc107',
                                color: '#000',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleSubmit(po.id)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Submit
                            </button>
                            <button
                              onClick={() => handleDelete(po.id)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {po.status === 'submitted' && (
                          <button
                            onClick={() => handleApprove(po.id)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Approve
                          </button>
                        )}
                        {po.status === 'received' && (
                          <button
                            onClick={() => handleClose(po.id)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Close
                          </button>
                        )}
                        {po.status !== 'closed' && po.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(po.id)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div
              style={{
                padding: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                borderTop: '1px solid #dee2e6',
              }}
            >
              <button
                onClick={() => dispatch(setPage(pagination.page - 1))}
                disabled={pagination.page === 1}
                style={{
                  padding: '8px 16px',
                  backgroundColor:
                    pagination.page === 1 ? '#e9ecef' : '#007bff',
                  color: pagination.page === 1 ? '#6c757d' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => dispatch(setPage(pagination.page + 1))}
                disabled={pagination.page === pagination.totalPages}
                style={{
                  padding: '8px 16px',
                  backgroundColor:
                    pagination.page === pagination.totalPages
                      ? '#e9ecef'
                      : '#007bff',
                  color:
                    pagination.page === pagination.totalPages
                      ? '#6c757d'
                      : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor:
                    pagination.page === pagination.totalPages
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isDetailsModalOpen && selectedPO && (
        <PurchaseOrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          po={selectedPO}
          onRefresh={() => dispatch(fetchPOs())}
        />
      )}

      <ReorderSuggestionsModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        suggestions={reorderSuggestions}
        isLoading={isLoading}
      />
    </div>
  );
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '14px',
  borderBottom: '2px solid #dee2e6',
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '14px',
};

export default PurchaseOrdersPage;
