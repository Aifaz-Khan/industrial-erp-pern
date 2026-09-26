import React, { useEffect, useState } from 'react';
import { enquiryApi, customerApi, productApi } from '../services/api';
import { FileText, Plus, X, Search, Calendar, Building, Layers } from 'lucide-react';

export const EnquiriesPage = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, targetPrice: '' }]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [enqRes, custRes, prodRes] = await Promise.all([
        enquiryApi.getAll(statusFilter),
        customerApi.getAll(),
        productApi.getAll(),
      ]);

      if (enqRes.success) setEnquiries(enqRes.data.enquiries);
      if (custRes.success) setCustomers(custRes.data.customers);
      if (prodRes.success) setProducts(prodRes.data.products);
    } catch (err) {
      setError(err.message || 'Failed to fetch enquiries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleAddItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, targetPrice: '' }]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmitEnquiry = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    try {
      if (!customerId) throw new Error('Please select a customer.');
      const validItems = items.map((i) => {
        if (!i.productId) throw new Error('All item rows must have a selected product.');
        const qty = parseInt(i.quantity, 10);
        if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be greater than 0.');
        return {
          productId: i.productId,
          quantity: qty,
          ...(i.targetPrice ? { targetPrice: parseFloat(i.targetPrice) } : {}),
        };
      });

      const payload = {
        customerId,
        ...(requiredDate ? { requiredDate } : {}),
        ...(notes ? { notes } : {}),
        items: validItems,
      };

      const res = await enquiryApi.create(payload);
      if (res.success) {
        setShowModal(false);
        setCustomerId('');
        setRequiredDate('');
        setNotes('');
        setItems([{ productId: '', quantity: 1, targetPrice: '' }]);
        fetchData();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to submit enquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return <span className="badge badge-new">NEW</span>;
      case 'QUOTED':
        return <span className="badge badge-quoted">QUOTED</span>;
      case 'WON':
        return <span className="badge badge-won">WON</span>;
      case 'LOST':
        return <span className="badge badge-lost">LOST</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  return (
    <div className="container space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FileText size={28} className="text-primary" />
            <span>Customer Enquiries</span>
          </h1>
          <p className="page-subtitle">
            Capture B2B customer requirement enquiries and convert them into competitive quotations.
          </p>
        </div>

        <div className="page-actions">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: 'auto' }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="QUOTED">QUOTED</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>New Customer Enquiry</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-box">
          {error}
        </div>
      )}

      {/* Enquiries Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Enquiry Number</th>
                <th>Customer & City</th>
                <th>Product Requirements</th>
                <th>Date Created</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted" style={{ padding: '2rem 1rem' }}>
                    No customer enquiries found matching the selected filter.
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr key={enq.id}>
                    <td className="font-mono font-semibold text-primary text-xs">
                      {enq.enquiryNumber}
                    </td>
                    <td>
                      <span className="font-semibold block" style={{ color: 'var(--text-main)' }}>
                        {enq.customer?.companyName}
                      </span>
                      <span className="text-xs text-muted">
                        {enq.customer?.contactPerson} • {enq.customer?.city}
                      </span>
                    </td>
                    <td>
                      <div className="space-y-1">
                        {enq.items?.map((item) => (
                          <div key={item.id} className="text-xs" style={{ color: '#334155' }}>
                            <span className="font-semibold">{item.quantity}x</span>{' '}
                            {item.product?.productName} ({item.product?.productCode})
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="text-xs text-muted">
                      {new Date(enq.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-center">
                      {getStatusBadge(enq.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Enquiry Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                Create New Customer Enquiry
              </h3>
              <button onClick={() => setShowModal(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="alert-box">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitEnquiry} className="space-y-4">
              <div className="form-group">
                <label className="form-label">
                  Customer Company
                </label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Corporate Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Required By Date (Optional)
                </label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Dynamic Product Rows */}
              <div className="form-group">
                <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Products & Quantities
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="btn btn-secondary btn-sm"
                  >
                    <Plus size={14} />
                    <span>Add Product</span>
                  </button>
                </div>

                <div className="items-container">
                  {items.map((row, idx) => (
                    <div key={idx} className="item-row">
                      <select
                        required
                        value={row.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="form-select"
                        style={{ flex: 1, fontSize: '0.8125rem' }}
                      >
                        <option value="">Select Industrial Product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.productCode} - {p.productName} (₹{parseFloat(p.basePrice)})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="form-input text-center font-bold"
                        style={{ width: '80px', fontSize: '0.8125rem' }}
                      />

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="item-remove-btn"
                          title="Remove product"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Project Notes
                </label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specify application details, delivery dock constraints, etc."
                  className="form-textarea"
                ></textarea>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? 'Saving Enquiry...' : 'Create Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
