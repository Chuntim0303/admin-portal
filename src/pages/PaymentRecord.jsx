import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';

const PaymentRecord = () => {
  const { user, apiCall } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    payment_method: '',
    search: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Check if user has access to payment records
  if (user.role !== 'account') {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>Access Denied</h2>
          <p>You don't have permission to view payment records.</p>
          <p>Only users with 'account' role can access this page.</p>
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
        payment.user_details?.full_name?.toLowerCase().includes(searchLower) ||
        payment.reference_number?.toLowerCase().includes(searchLower) ||
        payment.transaction_id?.toLowerCase().includes(searchLower)
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
            View and manage all payment transactions
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
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search by ID, description, user, reference..."
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
              <th>User</th>
              <th onClick={() => handleSort('amount')} className="sortable">
                Amount {getSortIcon('amount')}
              </th>
              <th>Currency</th>
              <th>Payment Method</th>
              <th>Description</th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {getSortIcon('status')}
              </th>
              <th>Reference #</th>
              <th>Transaction ID</th>
              <th onClick={() => handleSort('created_at')} className="sortable">
                Created {getSortIcon('created_at')}
              </th>
              <th onClick={() => handleSort('updated_at')} className="sortable">
                Updated {getSortIcon('updated_at')}
              </th>
              <th>Processed At</th>
              <th>Processed By</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPayments.length > 0 ? (
              paginatedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="id-cell">{payment.id}</td>
                  <td className="user-cell">
                    <div className="user-info">
                      <div className="user-name">{payment.user_details?.full_name || 'N/A'}</div>
                      <div className="user-email">{payment.user_details?.email || ''}</div>
                    </div>
                  </td>
                  <td className="amount-cell">
                    {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                  </td>
                  <td>{payment.currency}</td>
                  <td className="payment-method-cell">
                    {payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  <td className="description-cell">
                    <div title={payment.description}>
                      {payment.description || '-'}
                    </div>
                  </td>
                  <td className="status-cell">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="reference-cell">
                    {payment.reference_number || '-'}
                  </td>
                  <td className="transaction-cell">
                    {payment.transaction_id || '-'}
                  </td>
                  <td className="date-cell">{formatDate(payment.created_at)}</td>
                  <td className="date-cell">{formatDate(payment.updated_at)}</td>
                  <td className="date-cell">{formatDate(payment.processed_at)}</td>
                  <td>{payment.processed_by || '-'}</td>
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

      <style jsx>{`
        .payment-records-container {
          padding: 20px;
          max-width: 100%;
          margin: 0 auto;
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
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e1e8ed;
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
          padding-bottom: 15px;
          border-bottom: 2px solid #e1e8ed;
        }

        .header-content h2 {
          margin: 0 0 5px 0;
          color: #2c3e50;
          font-size: 28px;
          font-weight: 600;
        }

        .header-subtitle {
          margin: 0;
          color: #7f8c8d;
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
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background-color: #95a5a6;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #7f8c8d;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .filters-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
          border: 1px solid #e1e8ed;
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
          font-weight: 600;
          color: #2c3e50;
          font-size: 14px;
        }

        .filter-select,
        .filter-input {
          padding: 8px 12px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: #3498db;
        }

        .results-info {
          color: #7f8c8d;
          font-size: 14px;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 12px 16px;
          border-radius: 8px;
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
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          border: 1px solid #e1e8ed;
        }

        .payments-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .payments-table th {
          background-color: #f8f9fa;
          color: #2c3e50;
          font-weight: 600;
          padding: 15px 12px;
          text-align: left;
          border-bottom: 2px solid #e1e8ed;
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
          border-bottom: 1px solid #e1e8ed;
          vertical-align: top;
        }

        .payments-table tr:hover {
          background-color: #f8f9fa;
        }

        .id-cell {
          font-weight: 600;
          color: #3498db;
        }

        .user-cell {
          min-width: 150px;
        }

        .user-name {
          font-weight: 600;
          color: #2c3e50;
        }

        .user-email {
          font-size: 12px;
          color: #7f8c8d;
        }

        .amount-cell {
          font-weight: 600;
          text-align: right;
          color: #27ae60;
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

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-pending {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
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

        .reference-cell,
        .transaction-cell {
          font-family: monospace;
          font-size: 13px;
        }

        .date-cell {
          color: #6c757d;
          font-size: 13px;
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
          color: #7f8c8d;
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
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .pagination-btn {
          padding: 8px 16px;
          border: 1px solid #e1e8ed;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background-color: #f8f9fa;
          border-color: #3498db;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-info {
          font-weight: 600;
          color: #2c3e50;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #7f8c8d;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
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
            padding: 10px;
          }

          .records-header {
            flex-direction: column;
            gap: 15px;
          }

          .filters-row {
            grid-template-columns: 1fr;
          }

          .table-container {
            overflow-x: auto;
          }

          .payments-table {
            min-width: 1200px;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentRecord;