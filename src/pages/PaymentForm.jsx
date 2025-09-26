import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';

const PaymentForm = () => {
  const { user, apiCall } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    description: '',
    lead_id: '',
    lead_info: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // File upload states
  const [files, setFiles] = useState([]);
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Lead/Customer search states
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [leadSearchResults, setLeadSearchResults] = useState([]);
  const [leadSearchLoading, setLeadSearchLoading] = useState(false);
  const [showLeadSearch, setShowLeadSearch] = useState(false);

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'tng', label: 'TNG' },
    { value: 'card', label: 'Card' },
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

  // File upload handlers (unchanged)
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError(`File ${file.name} has an unsupported format.`);
        return false;
      }
      
      return true;
    });

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        uploaded: false,
        uploading: false,
        url: null,
        error: null
      }))]);
      setError('');
    }
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFiles = async () => {
    setFileUploadLoading(true);
    const updatedFiles = [...files];

    try {
      for (let i = 0; i < updatedFiles.length; i++) {
        if (!updatedFiles[i].uploaded) {
          updatedFiles[i].uploading = true;
          setFiles([...updatedFiles]);

          try {
            const response = await apiCall('/upload/presigned-url', {
              method: 'POST',
              body: JSON.stringify({
                filename: updatedFiles[i].file.name,
                filetype: updatedFiles[i].file.type,
                filesize: updatedFiles[i].file.size
              })
            });

            if (response.success) {
              const { uploadUrl, fileUrl } = response.data;

              const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: updatedFiles[i].file,
                headers: {
                  'Content-Type': updatedFiles[i].file.type
                }
              });

              if (uploadResponse.ok) {
                updatedFiles[i].uploaded = true;
                updatedFiles[i].url = fileUrl;
                updatedFiles[i].error = null;
              } else {
                throw new Error('Failed to upload file to S3');
              }
            } else {
              throw new Error(response.error?.message || 'Failed to get upload URL');
            }
          } catch (fileError) {
            updatedFiles[i].error = fileError.message;
          } finally {
            updatedFiles[i].uploading = false;
          }
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
      setError('Failed to upload some files. Please try again.');
    } finally {
      setFiles(updatedFiles);
      setFileUploadLoading(false);
    }
  };

  // Enhanced search functionality for both leads and customers
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
      console.error('Search error:', err);
      setLeadSearchResults([]);
    } finally {
      setLeadSearchLoading(false);
    }
  };

  const handleLeadSearchChange = (e) => {
    const value = e.target.value;
    setLeadSearchTerm(value);
    
    clearTimeout(window.leadSearchTimeout);
    window.leadSearchTimeout = setTimeout(() => {
      searchLeads(value);
    }, 300);
  };

  const selectLead = (item) => {
    // Handle both leads and customers consistently
    const itemId = item.source_type === 'lead' ? item.lead_id : item.customer_id;
    
    setFormData(prev => ({
      ...prev,
      lead_id: itemId,
      lead_info: {
        ...item,
        id: itemId
      }
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
      if (files.length > 0 && files.some(f => !f.uploaded)) {
        await uploadFiles();
      }

      const amount = parseFloat(formData.amount);
      if (!amount || amount <= 0) {
        throw new Error('Please enter a valid amount greater than 0');
      }

      const uploadedFiles = files
        .filter(f => f.uploaded && f.url)
        .map(f => ({
          filename: f.file.name,
          url: f.url,
          size: f.file.size,
          type: f.file.type
        }));

      const paymentData = {
        amount: amount,
        payment_method: formData.payment_method,
        description: formData.description.trim(),
        lead_id: formData.lead_id || null,
        attachments: uploadedFiles
      };

      const response = await apiCall('/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (response.success) {
        setSuccess(`Payment created successfully! Payment ID: ${response.data.id} | Official Receipt: ${response.data.official_receipt}`);
        
        // Reset form
        setFormData({
          amount: '',
          payment_method: 'bank_transfer',
          description: '',
          lead_id: '',
          lead_info: null
        });
        setFiles([]);
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
    setFiles([]);
    setError('');
    setSuccess('');
    setLeadSearchTerm('');
    setLeadSearchResults([]);
    setShowLeadSearch(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get the appropriate label for the selected item
  const getSelectedItemLabel = () => {
    if (!formData.lead_info) return '';
    return formData.lead_info.source_type === 'lead' ? 'Selected Lead' : 'Selected Customer';
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
          
          {/* Enhanced Lead/Customer Selection Section */}
          <div className="form-section">
            <h4 className="section-title">Customer Information (Optional)</h4>
            
            {formData.lead_info ? (
              <div className="selected-lead">
                <div className="lead-card">
                  <div className="lead-header">
                    <div className="lead-title-row">
                      <h5>{formData.lead_info.full_name}</h5>
                      <div className="source-type-tag-container">
                        <span className={`source-type-tag ${formData.lead_info.source_type}`}>
                          {formData.lead_info.source_type === 'lead' ? 'Lead' : 'Customer'}
                        </span>
                      </div>
                    </div>
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
                    {formData.lead_info.source && (
                      <div className="lead-detail">
                        <strong>Source:</strong> {formData.lead_info.source}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="lead-search-section">
                <div className="form-group">
                  <label htmlFor="leadSearch" className="form-label">
                    Search Leads & Customers
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
                      {leadSearchResults.map((item) => (
                        <div
                          key={`${item.source_type}-${item.id}`}
                          className="search-result-item"
                          onClick={() => selectLead(item)}
                        >
                          <div className="result-header">
                            <div className="result-name-container">
                              <strong>{item.full_name}</strong>
                              <span className={`source-type-tag ${item.source_type} small`}>
                                {item.source_type === 'lead' ? 'Lead' : 'Customer'}
                              </span>
                            </div>
                            <span className={`status-badge status-${item.status} small`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="result-details">
                            <div>{item.email_address}</div>
                            <div>{item.phone_number}</div>
                            {item.company_name && <div>{item.company_name}</div>}
                            {item.job_title && <div><em>{item.job_title}</em></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showLeadSearch && leadSearchTerm && leadSearchResults.length === 0 && !leadSearchLoading && (
                    <div className="no-results">
                      No leads or customers found matching "{leadSearchTerm}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Details Section (unchanged) */}
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

          {/* File Upload Section (unchanged) */}
          <div className="form-section">
            <h4 className="section-title">Attachments (Optional)</h4>
            
            <div
              className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-input"
                multiple
                onChange={handleFileInput}
                className="file-input"
                disabled={loading || fileUploadLoading}
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              <label htmlFor="file-input" className="file-upload-label">
                <div className="file-upload-icon">📎</div>
                <div className="file-upload-text">
                  <strong>Drop files here or click to browse</strong>
                  <br />
                  <small>Supports: Images, PDF, Word, Excel, Text files (Max 10MB each)</small>
                </div>
              </label>
            </div>

            {files.length > 0 && (
              <div className="file-list">
                {files.map((fileItem) => (
                  <div key={fileItem.id} className="file-item">
                    <div className="file-info">
                      <div className="file-name">{fileItem.file.name}</div>
                      <div className="file-meta">
                        {formatFileSize(fileItem.file.size)} • {fileItem.file.type}
                      </div>
                    </div>
                    <div className="file-status">
                      {fileItem.uploading && <span className="status-uploading">⏳ Uploading...</span>}
                      {fileItem.uploaded && <span className="status-uploaded">✅ Uploaded</span>}
                      {fileItem.error && <span className="status-error">❌ {fileItem.error}</span>}
                      {!fileItem.uploaded && !fileItem.uploading && (
                        <button
                          type="button"
                          onClick={() => removeFile(fileItem.id)}
                          className="remove-file-btn"
                          disabled={loading}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <li><strong>Search:</strong> You can search both leads and customers</li>
              <li><strong>Status:</strong> New payments are created with "pending" status</li>
              <li><strong>Files:</strong> Uploaded files are stored securely in S3</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Enhanced styles for lead/customer search with tags */
        
        .source-type-tag {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-left: 8px;
        }

        .source-type-tag.small {
          padding: 2px 6px;
          font-size: 9px;
        }

        .source-type-tag.lead {
          background-color: #3498db;
          color: white;
        }

        .source-type-tag.customer {
          background-color: #27ae60;
          color: white;
        }

        .lead-title-row {
          display: flex;
          align-items: center;
          flex: 1;
        }

        .source-type-tag-container {
          margin-left: auto;
          margin-right: 15px;
        }

        .result-name-container {
          display: flex;
          align-items: center;
          flex: 1;
        }

        .search-result-item {
          padding: 15px;
          border-bottom: 1px solid #f1f1f1;
          cursor: pointer;
          transition: background-color 0.2s;
          position: relative;
        }

        .search-result-item:hover {
          background-color: #f8f9fa;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .status-badge.small {
          padding: 2px 6px;
          font-size: 9px;
        }

        /* Rest of the existing styles remain the same */
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

        /* File Upload Styles */
        .file-upload-area {
          border: 2px dashed #e1e8ed;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          transition: all 0.2s;
          cursor: pointer;
          background-color: #fafbfc;
        }

        .file-upload-area:hover,
        .file-upload-area.drag-active {
          border-color: #3498db;
          background-color: rgba(52, 152, 219, 0.05);
        }

        .file-input {
          display: none;
        }

        .file-upload-label {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .file-upload-icon {
          font-size: 32px;
          color: #7f8c8d;
        }

        .file-upload-text {
          color: #2c3e50;
        }

        .file-upload-text strong {
          color: #3498db;
        }

        .file-upload-text small {
          color: #7f8c8d;
          margin-top: 5px;
        }

        .file-list {
          margin-top: 20px;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          overflow: hidden;
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #f1f1f1;
          background: white;
        }

        .file-item:last-child {
          border-bottom: none;
        }

        .file-info {
          flex: 1;
        }

        .file-name {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 5px;
        }

        .file-meta {
          font-size: 12px;
          color: #7f8c8d;
        }

        .file-status {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-uploading {
          color: #f39c12;
          font-size: 14px;
        }

        .status-uploaded {
          color: #27ae60;
          font-size: 14px;
        }

        .status-error {
          color: #e74c3c;
          font-size: 12px;
        }

        .remove-file-btn {
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-file-btn:hover {
          background: #c0392b;
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
          max-height: 400px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .search-result-item:last-child {
          border-bottom: none;
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

          .file-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .file-status {
            align-self: flex-end;
          }

          .lead-title-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .source-type-tag-container {
            margin-left: 0;
            margin-right: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentForm;