import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';

const PaymentForm = () => {
  const { user, apiCall } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'bank_transfer', // Updated default
    description: '',
    lead_id: '',
    lead_info: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Lead search states
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [leadSearchResults, setLeadSearchResults] = useState([]);
  const [leadSearchLoading, setLeadSearchLoading] = useState(false);
  const [showLeadSearch, setShowLeadSearch] = useState(false);

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'tng', label: 'TNG' },
    { value: 'cash', label: 'Cash' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  // Lead search functionality
  const searchLeads = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setLeadSearchResults([]);
      return;
    }

    setLeadSearchLoading(true);
    try {
      const response = await apiCall(`/leads/search?q=${encodeURIComponent(searchTerm)}`);
      if (response.success) {
        setLeadSearchResults(response.data || []);
      } else {
        setLeadSearchResults([]);
      }
    } catch (err) {
      console.error('Lead search error:', err);
      setLeadSearchResults([]);
    } finally {
      setLeadSearchLoading(false);
    }
  };

  const handleLeadSearchChange = (e) => {
    const value = e.target.value;
    setLeadSearchTerm(value);
    
    // Debounce the search
    clearTimeout(window.leadSearchTimeout);
    window.leadSearchTimeout = setTimeout(() => {
      searchLeads(value);
    }, 300);
  };

  const selectLead = (lead) => {
    setFormData(prev => ({
      ...prev,
      lead_id: lead.lead_id,
      lead_info: lead
    }));
    setShowLeadSearch(false);
    setLeadSearchTerm('');
    setLeadSearchResults([]);
  };

  const clearSelectedLead = () => {
    setFormData(prev => ({
      ...prev,
      lead_id: '',
      lead_info: null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate amount
      const amount = parseFloat(formData.amount);
      if (!amount || amount <= 0) {
        throw new Error('Please enter a valid amount greater than 0');
      }

      // Prepare payment data
      const paymentData = {
        amount: amount,
        currency: 'MYR', // Fixed currency
        payment_method: formData.payment_method,
        description: formData.description.trim(),
        lead_id: formData.lead_id || null
      };

      // Create payment
      const response = await apiCall('/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (response.success) {
        setSuccess(`Payment created successfully! Payment ID: ${response.data.id} | Reference: ${response.data.reference_number}`);
        // Reset form
        setFormData({
          amount: '',
          payment_method: 'bank_transfer',
          description: '',
          lead_id: '',
          lead_info: null
        });
      } else {
        throw new Error(response.error?.message || 'Failed to create payment');
      }

    } catch (err) {
      console.error('Payment creation error:', err);
      setError(err.message || 'Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      payment_method: 'bank_transfer',
      description: '',
      lead_id: '',
      lead_info: null
    });
    setError('');
    setSuccess('');
    setLeadSearchTerm('');
    setLeadSearchResults([]);
    setShowLeadSearch(false);
  };

  return (
    <div className="payment-form-container">
      <div className="form-header">
        <h2>Create New Payment</h2>
        <p className="form-description">
          Fill in the payment details below to create a new payment record.
        </p>
      </div>

      <div className="payment-form-card">
        <form onSubmit={handleSubmit} className="payment-form">
          
          {/* Lead Selection Section */}
          <div className="form-section">
            <h4 className="section-title">Customer Information (Optional)</h4>
            
            {formData.lead_info ? (
              <div className="selected-lead">
                <div className="lead-card">
                  <div className="lead-header">
                    <h5>{formData.lead_info.full_name}</h5>
                    <button 
                      type="button" 
                      onClick={clearSelectedLead}
                      className="clear-lead-btn"
                      title="Clear selection"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="lead-details">
                    <div className="lead-detail">
                      <strong>Email:</strong> {formData.lead_info.email_address}
                    </div>
                    <div className="lead-detail">
                      <strong>Phone:</strong> {formData.lead_info.phone_number}
                    </div>
                    {formData.lead_info.company_name && (
                      <div className="lead-detail">
                        <strong>Company:</strong> {formData.lead_info.company_name}
                      </div>
                    )}
                    {formData.lead_info.job_title && (
                      <div className="lead-detail">
                        <strong>Position:</strong> {formData.lead_info.job_title}
                      </div>
                    )}
                    <div className="lead-detail">
                      <strong>Status:</strong> 
                      <span className={`status-badge status-${formData.lead_info.status}`}>
                        {formData.lead_info.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="lead-search-section">
                <div className="form-group">
                  <label htmlFor="leadSearch" className="form-label">
                    Search Customer
                  </label>
                  <div className="search-input-container">
                    <input
                      type="text"
                      id="leadSearch"
                      value={leadSearchTerm}
                      onChange={handleLeadSearchChange}
                      onFocus={() => setShowLeadSearch(true)}
                      placeholder="Search by name, email, phone, or company..."
                      className="form-input search-input"
                    />
                    {leadSearchLoading && (
                      <div className="search-spinner">⏳</div>
                    )}
                  </div>
                  
                  {showLeadSearch && leadSearchResults.length > 0 && (
                    <div className="search-results">
                      {leadSearchResults.map((lead) => (
                        <div
                          key={lead.lead_id}
                          className="search-result-item"
                          onClick={() => selectLead(lead)}
                        >
                          <div className="result-header">
                            <strong>{lead.full_name}</strong>
                            <span className={`status-badge status-${lead.status}`}>
                              {lead.status}
                            </span>
                          </div>
                          <div className="result-details">
                            <div>{lead.email_address}</div>
                            <div>{lead.phone_number}</div>
                            {lead.company_name && <div>{lead.company_name}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showLeadSearch && leadSearchTerm && leadSearchResults.length === 0 && !leadSearchLoading && (
                    <div className="no-results">
                      No customers found matching "{leadSearchTerm}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Details Section */}
          <div className="form-section">
            <h4 className="section-title">Payment Details</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="amount" className="form-label">
                  Amount (MYR) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={loading}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="payment_method" className="form-label">
                  Payment Method <span className="required">*</span>
                </label>
                <select
                  id="payment_method"
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="form-select"
                >
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter payment description or notes..."
                rows="3"
                disabled={loading}
                className="form-textarea"
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span className="alert-icon">✅</span>
              <span>{success}</span>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={resetForm}
              disabled={loading}
              className="btn btn-secondary"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount}
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Creating Payment...
                </>
              ) : (
                'Create Payment'
              )}
            </button>
          </div>
        </form>

        <div className="form-info">
          <div className="info-card">
            <h4>Payment Information</h4>
            <ul>
              <li><strong>User:</strong> {user.fullName}</li>
              <li><strong>Email:</strong> {user.email}</li>
              <li><strong>Department:</strong> {user.department}</li>
              <li><strong>Currency:</strong> Fixed to MYR (Malaysian Ringgit)</li>
              <li><strong>Status:</strong> New payments are created with "pending" status</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .payment-form-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }

        .form-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .form-header h2 {
          color: #2c3e50;
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 600;
        }

        .form-description {
          color: #7f8c8d;
          margin: 0;
          font-size: 16px;
        }

        .payment-form-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 30px;
          border: 1px solid #e1e8ed;
        }

        .payment-form {
          margin-bottom: 30px;
        }

        .form-section {
          margin-bottom: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }

        .section-title {
          margin: 0 0 20px 0;
          color: #2c3e50;
          font-size: 18px;
          font-weight: 600;
        }

        .form-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          color: #2c3e50;
          font-weight: 600;
          font-size: 14px;
        }

        .required {
          color: #e74c3c;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
          background-color: white;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .form-input:disabled,
        .form-select:disabled,
        .form-textarea:disabled {
          background-color: #f8f9fa;
          color: #6c757d;
          cursor: not-allowed;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        /* Lead Search Styles */
        .lead-search-section {
          position: relative;
        }

        .search-input-container {
          position: relative;
        }

        .search-input {
          padding-right: 40px;
        }

        .search-spinner {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
        }

        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e1e8ed;
          border-top: none;
          border-radius: 0 0 8px 8px;
          max-height: 300px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .search-result-item {
          padding: 15px;
          border-bottom: 1px solid #f1f1f1;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .search-result-item:hover {
          background-color: #f8f9fa;
        }

        .search-result-item:last-child {
          border-bottom: none;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .result-details {
          font-size: 13px;
          color: #6c757d;
        }

        .result-details div {
          margin-bottom: 3px;
        }

        .no-results {
          padding: 15px;
          text-align: center;
          color: #6c757d;
          font-style: italic;
          background: white;
          border: 1px solid #e1e8ed;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }

        /* Selected Lead Styles */
        .selected-lead {
          margin-bottom: 20px;
        }

        .lead-card {
          background: white;
          border: 2px solid #27ae60;
          border-radius: 8px;
          padding: 20px;
        }

        .lead-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .lead-header h5 {
          margin: 0;
          color: #27ae60;
          font-size: 18px;
          font-weight: 600;
        }

        .clear-lead-btn {
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .clear-lead-btn:hover {
          background: #c0392b;
        }

        .lead-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .lead-detail {
          font-size: 14px;
          color: #2c3e50;
        }

        .lead-detail strong {
          color: #27ae60;
        }

        /* Status Badge */
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-new { background: #3498db; color: white; }
        .status-contacted { background: #f39c12; color: white; }
        .status-qualified { background: #9b59b6; color: white; }
        .status-proposal { background: #e67e22; color: white; }
        .status-negotiation { background: #e74c3c; color: white; }
        .status-closed-won { background: #27ae60; color: white; }
        .status-closed-lost { background: #95a5a6; color: white; }

        .alert {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .alert-icon {
          margin-right: 10px;
          font-size: 16px;
        }

        .alert-error {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
        }

        .alert-success {
          background-color: #efe;
          border: 1px solid #cfc;
          color: #363;
        }

        .form-actions {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-top: 30px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
        }

        .btn-primary {
          background-color: #3498db;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2980b9;
          transform: translateY(-1px);
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
          transform: none;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .form-info {
          border-top: 1px solid #e1e8ed;
          padding-top: 20px;
        }

        .info-card {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }

        .info-card h4 {
          margin: 0 0 15px 0;
          color: #2c3e50;
          font-size: 16px;
        }

        .info-card ul {
          margin: 0;
          padding-left: 20px;
        }

        .info-card li {
          margin-bottom: 8px;
          color: #5a6c7d;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .payment-form-card {
            padding: 20px;
            margin: 10px;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }

          .lead-details {
            grid-template-columns: 1fr;
          }

          .search-results {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            max-height: none;
            z-index: 9999;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentForm;