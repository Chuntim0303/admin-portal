import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';

const PaymentRecord = () => {
  const { user, apiCall } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'pending', // Default to pending
    payment_method: '',
    search: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Editing states
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [editReceiptValue, setEditReceiptValue] = useState('');
  const [updateLoading, setUpdateLoading] = useState(null);

  // Check if user has access to payment records
  if (!['account', 'sales_admin', 'management', 'admin'].includes(user.role)) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>Access Denied</h2>
          <p>You don't have permission to view payment records.</p>
          <p>Only users with 'account', 'sales_admin', 'management', or 'admin' roles can access this page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadPayments();
  }, [filters.status, filters.payment_method]);

  const loadPayments = async () => {
    setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.payment_method) queryParams.append('payment_method', filters.payment_method);

      const queryString = queryParams.toString();
      const endpoint = `/payments${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiCall(endpoint);

      if (response.success) {
        setPayments(response.data || []);
      } else {
        throw new Error(response.error?.message || 'Failed to load payments');
      }
    } catch (err) {
      console.error('Error loading payments:', err);
      setError(err.message || 'Failed to load payment records');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleRefresh = () => {
    loadPayments();
  };

  // Filter and sort payments
  const filteredAndSortedPayments = React.useMemo(() => {
    let filtered = [...payments];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.id.toString().includes(searchLower) ||
        payment.description?.toLowerCase().includes(searchLower) ||
        payment.user_details?.email?.toLowerCase().includes(searchLower) ||
        // Updated to use customer_details instead of lead_details
        payment.customer_details?.full_name?.toLowerCase().includes(searchLower) ||
        payment.lead_details?.full_name?.toLowerCase().includes(searchLower) || // Backward compatibility
        payment.official_receipt?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }

      return sortConfig.direction === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return filtered;
  }, [payments, filters.search, sortConfig]);

  // Pagination
  const totalItems = filteredAndSortedPayments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredAndSortedPayments.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      reviewed: 'status-reviewed',
      completed: 'status-completed',
      failed: 'status-failed',
      processing: 'status-processing'
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-default'}`}>
        {status}
      </span>
    );
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return '↕️';
    return sortConfig.direction === 'desc' ? '↓' : '↑';
  };

  const formatAmount = (amount) => {
    return `MYR ${parseFloat(amount).toFixed(2)}`;
  };

  // Official receipt editing functions
  const startEditingReceipt = (paymentId, currentValue) => {
    setEditingReceipt(paymentId);
    setEditReceiptValue(currentValue || '');
  };

  const cancelEditingReceipt = () => {
    setEditingReceipt(null);
    setEditReceiptValue('');
  };

  const saveReceiptEdit = async (paymentId) => {
    if (!editReceiptValue.trim()) {
      alert('Official receipt number cannot be empty');
      return;
    }

    setUpdateLoading(paymentId);
    try {
      const response = await apiCall(`/payments/${paymentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          official_receipt: editReceiptValue.trim()
        })
      });

      if (response.success) {
        // Update the payment in the local state
        setPayments(prevPayments => 
          prevPayments.map(payment => 
            payment.id === paymentId 
              ? { 
                  ...payment, 
                  official_receipt: editReceiptValue.trim(),
                  processed_at: response.data.processed_at,
                  processed_by: response.data.processed_by,
                  status: response.data.status
                }
              : payment
          )
        );
        setEditingReceipt(null);
        setEditReceiptValue('');
      } else {
        throw new Error(response.error?.message || 'Failed to update official receipt');
      }
    } catch (err) {
      console.error('Error updating official receipt:', err);
      alert(err.message || 'Failed to update official receipt');
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleReceiptKeyPress = (e, paymentId) => {
    if (e.key === 'Enter') {
      saveReceiptEdit(paymentId);
    } else if (e.key === 'Escape') {
      cancelEditingReceipt();
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading payment records...</p>
      </div>
    );
  }

  return (
    <div className="payment-records-container">
      <div className="records-header">
        <div className="header-content">
          <h2>Payment Records</h2>
          <p className="header-subtitle">
            View and manage payment transactions
          </p>
        </div>
        
        <div className="header-actions">
          <button onClick={handleRefresh} className="btn btn-secondary" disabled={loading}>
            <span className="btn-icon">🔄</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Payment Method:</label>
            <select
              value={filters.payment_method}
              onChange={(e) => handleFilterChange('payment_method', e.target.value)}
              className="filter-select"
            >
              <option value="">All Methods</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="tng">TNG</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search by ID, description, user, official receipt..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="results-info">
          <span>Showing {paginatedPayments.length} of {totalItems} records</span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={handleRefresh} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Payment Records Table */}
      <div className="table-container">
        <table className="payments-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} className="sortable">
                ID {getSortIcon('id')}
              </th>
              <th>Customer</th>
              <th onClick={() => handleSort('amount')} className="sortable">
                Amount {getSortIcon('amount')}
              </th>
              <th onClick={() => handleSort('payment_method')} className="sortable">
                Payment Method {getSortIcon('payment_method')}
              </th>
              <th>Description</th>
              <th>Attachments</th>
              <th onClick={() => handleSort('official_receipt')} className="sortable">
                Official Receipt {getSortIcon('official_receipt')}
              </th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {getSortIcon('status')}
              </th>
              <th>Created By</th>
              <th onClick={() => handleSort('created_at')} className="sortable">
                Created Date {getSortIcon('created_at')}
              </th>
              <th onClick={() => handleSort('updated_at')} className="sortable">
                Updated Date {getSortIcon('updated_at')}
              </th>
              <th>Processed By</th>
              <th onClick={() => handleSort('processed_at')} className="sortable">
                Processed At {getSortIcon('processed_at')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedPayments.length > 0 ? (
              paginatedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="id-cell">{payment.id}</td>
                  
                  {/* Customer - Updated to use customer_details or lead_details for backward compatibility */}
                  <td className="customer-cell">
                    <div className="customer-info">
                      {(payment.customer_details || payment.lead_details) ? (
                        <>
                          <div className="customer-name">
                            {payment.customer_details?.full_name || payment.lead_details?.full_name}
                          </div>
                          <div className="customer-email">
                            {payment.customer_details?.email || payment.lead_details?.email}
                          </div>
                        </>
                      ) : (
                        <div className="no-customer">No customer linked</div>
                      )}
                    </div>
                  </td>
                  
                  <td className="amount-cell">
                    {formatAmount(payment.amount)}
                  </td>
                  
                  <td className="payment-method-cell">
                    {payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  
                  <td className="description-cell">
                    <div title={payment.description}>
                      {payment.description || '-'}
                    </div>
                  </td>
                  
                  <td className="attachments-cell">
                    {payment.attachments && payment.attachments.length > 0 ? (
                      <div className="attachments-info">
                        <span className="attachment-count">
                          📎 {payment.attachments.length} file{payment.attachments.length > 1 ? 's' : ''}
                        </span>
                        <div className="attachment-list">
                          {payment.attachments.map((file, index) => (
                            <a 
                              key={index} 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="attachment-link"
                              title={`${file.filename} (${file.size} bytes)`}
                            >
                              {file.filename}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="no-attachments">-</span>
                    )}
                  </td>
                  
                  <td className="official-receipt-cell">
                    {editingReceipt === payment.id ? (
                      <div className="receipt-edit-container">
                        <input
                          type="text"
                          value={editReceiptValue}
                          onChange={(e) => setEditReceiptValue(e.target.value)}
                          onKeyPress={(e) => handleReceiptKeyPress(e, payment.id)}
                          className="receipt-edit-input"
                          placeholder="Enter official receipt number"
                          disabled={updateLoading === payment.id}
                          autoFocus
                        />
                        <div className="receipt-edit-actions">
                          <button
                            onClick={() => saveReceiptEdit(payment.id)}
                            className="receipt-save-btn"
                            disabled={updateLoading === payment.id}
                            title="Save (Enter)"
                          >
                            {updateLoading === payment.id ? '⏳' : '✓'}
                          </button>
                          <button
                            onClick={cancelEditingReceipt}
                            className="receipt-cancel-btn"
                            disabled={updateLoading === payment.id}
                            title="Cancel (Escape)"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="receipt-display-container">
                        <span className="receipt-number">
                          {payment.official_receipt || 'Not set'}
                        </span>
                        {(['account', 'sales_admin', 'management', 'admin'].includes(user.role)) && (
                          <button
                            onClick={() => startEditingReceipt(payment.id, payment.official_receipt)}
                            className="receipt-edit-trigger"
                            title="Click to edit official receipt"
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="status-cell">
                    {getStatusBadge(payment.status)}
                  </td>
                  
                  {/* Created By - Show only email */}
                  <td className="user-cell">
                    <div className="user-email">{payment.user_details?.email || 'N/A'}</div>
                  </td>
                  
                  <td className="date-cell">{formatDate(payment.created_at)}</td>
                  <td className="date-cell">{formatDate(payment.updated_at)}</td>
                  <td className="processed-by-cell">{payment.processed_by || '-'}</td>
                  <td className="date-cell">{formatDate(payment.processed_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13" className="no-data-cell">
                  <div className="no-data">
                    <span className="no-data-icon">📋</span>
                    <span>No payment records found</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ‹ Previous
            </button>
            
            <div className="pagination-info">
              Page {currentPage} of {totalPages}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next ›
            </button>
          </div>
        </div>
      )}

      {/* Include all the existing styles from the original PaymentRecord component */}
      <style jsx>{`
        .payment-records-container {
          padding: 30px;
          max-width: 100%;
          margin: 0 auto;
          background: #f5f5f5;
          min-height: 100vh;
        }

        .access-denied {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
          text-align: center;
        }

        .access-denied-content {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .access-denied h2 {
          color: #e74c3c;
          margin: 0 0 15px 0;
        }

        .records-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
          padding: 25px 30px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .header-content h2 {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 28px;
          font-weight: 600;
        }

        .header-subtitle {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #5a6268;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .filters-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .filters-row {
          display: grid;
          grid-template-columns: 200px 200px 1fr;
          gap: 20px;
          margin-bottom: 15px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .filter-group label {
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }

        .filter-select,
        .filter-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: #007bff;
        }

        .results-info {
          color: #666;
          font-size: 14px;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: #ffeaea;
          border: 1px solid #ffcdd2;
          color: #c33;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .retry-btn {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .payments-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .payments-table th {
          background-color: #f8f9fa;
          color: #333;
          font-weight: 600;
          padding: 15px 12px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
          white-space: nowrap;
        }

        .payments-table th.sortable {
          cursor: pointer;
          user-select: none;
        }

        .payments-table th.sortable:hover {
          background-color: #e9ecef;
        }

        .payments-table td {
          padding: 12px;
          border-bottom: 1px solid #dee2e6;
          vertical-align: top;
        }

        .payments-table tr:hover {
          background-color: #f8f9fa;
        }

        .id-cell {
          font-weight: 600;
          color: #007bff;
        }

        .customer-cell {
          min-width: 150px;
        }

        .customer-name {
          font-weight: 600;
          color: #333;
        }

        .customer-email {
          font-size: 12px;
          color: #666;
        }

        .no-customer {
          font-style: italic;
          color: #999;
          font-size: 13px;
        }

        .amount-cell {
          font-weight: 600;
          text-align: right;
          color: #28a745;
          min-width: 100px;
        }

        .payment-method-cell {
          text-transform: capitalize;
        }

        .description-cell {
          max-width: 200px;
        }

        .description-cell div {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .attachments-cell {
          min-width: 120px;
        }

        .attachments-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .attachment-count {
          font-size: 12px;
          color: #007bff;
          font-weight: 500;
        }

        .attachment-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .attachment-link {
          font-size: 12px;
          color: #007bff;
          text-decoration: none;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .attachment-link:hover {
          text-decoration: underline;
        }

        .no-attachments {
          color: #999;
          font-style: italic;
        }

        .official-receipt-cell {
          font-family: monospace;
          font-size: 13px;
          min-width: 160px;
          position: relative;
        }

        .receipt-display-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .receipt-number {
          background: #e8f5e8;
          padding: 4px 8px;
          border-radius: 4px;
          color: #28a745;
          font-weight: 500;
          flex: 1;
        }

        .receipt-edit-trigger {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          width: 20px;
          height: 20px;
          cursor: pointer;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .receipt-edit-trigger:hover {
          opacity: 1;
        }

        .receipt-edit-container {
          display: flex;
          flex-direction: column;
          gap: 5px;
          width: 100%;
        }

        .receipt-edit-input {
          padding: 4px 6px;
          border: 2px solid #007bff;
          border-radius: 4px;
          font-size: 12px;
          font-family: monospace;
          width: 100%;
        }

        .receipt-edit-input:focus {
          outline: none;
          border-color: #0056b3;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
        }

        .receipt-edit-input:disabled {
          background-color: #f8f9fa;
          opacity: 0.7;
        }

        .receipt-edit-actions {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .receipt-save-btn {
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          width: 20px;
          height: 20px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .receipt-save-btn:hover:not(:disabled) {
          background: #218838;
        }

        .receipt-save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .receipt-cancel-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          width: 20px;
          height: 20px;
          cursor: pointer;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .receipt-cancel-btn:hover:not(:disabled) {
          background: #c82333;
        }

        .receipt-cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-pending {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }

        .status-reviewed {
          background-color: #cce7ff;
          color: #004085;
          border: 1px solid #b6d4fe;
        }

        .status-completed {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .status-failed {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .status-processing {
          background-color: #cce7ff;
          color: #004085;
          border: 1px solid #b6d4fe;
        }

        .status-default {
          background-color: #e9ecef;
          color: #495057;
          border: 1px solid #dee2e6;
        }

        .user-cell {
          min-width: 140px;
        }

        .user-email {
          font-size: 13px;
          color: #333;
        }

        .processed-by-cell {
          font-size: 13px;
          color: #666;
          min-width: 140px;
        }

        .date-cell {
          color: #666;
          font-size: 13px;
          min-width: 120px;
        }

        .no-data-cell {
          text-align: center;
          padding: 40px;
        }

        .no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #666;
        }

        .no-data-icon {
          font-size: 24px;
        }

        .pagination-container {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }

        .pagination {
          display: flex;
          align-items: center;
          gap: 15px;
          background: white;
          padding: 15px 20px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .pagination-btn {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background-color: #f8f9fa;
          border-color: #007bff;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-info {
          font-weight: 500;
          color: #333;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #666;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 1200px) {
          .filters-row {
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }

          .search-group {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 768px) {
          .payment-records-container {
            padding: 15px;
          }

          .records-header {
            flex-direction: column;
            gap: 15px;
            padding: 20px;
          }

          .filters-row {
            grid-template-columns: 1fr;
          }

          .table-container {
            overflow-x: auto;
          }

          .payments-table {
            min-width: 1600px;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentRecord;