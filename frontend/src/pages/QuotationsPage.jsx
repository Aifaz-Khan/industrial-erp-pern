import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationApi, customerApi, productApi, enquiryApi } from '../services/api';
import { ClipboardList, Plus, X, ArrowRight, Check, Ban, Send } from 'lucide-react';

export const QuotationsPage = () => {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [enquiryId, setEnquiryId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(18);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, unitPrice: '' }]);

  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quoteRes, custRes, prodRes, enqRes] = await Promise.all([
        quotationApi.getAll(statusFilter),
        customerApi.getAll(),
        productApi.getAll(),
        enquiryApi.getAll('NEW'),
      ]);

      if (quoteRes.success) setQuotations(quoteRes.data.quotations);
      if (custRes.success) setCustomers(custRes.data.customers);
      if (prodRes.success) setProducts(prodRes.data.products);
      if (enqRes.success) setEnquiries(enqRes.data.enquiries);
    } catch (err) {
      setError(err.message || 'Failed to fetch quotations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleProductSelect = (index, prodId) => {
    const selectedProd = products.find((p) => p.id === prodId);
    const updated = [...items];
    updated[index].productId = prodId;
    if (selectedProd && !updated[index].unitPrice) {
      updated[index].unitPrice = parseFloat(selectedProd.basePrice);
    }
    setItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleAddItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: '' }]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Live client-side calculation preview
  const previewSubtotal = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
  const previewDiscount = (previewSubtotal * (parseFloat(discountPercentage) || 0)) / 100;
  const previewTaxable = previewSubtotal - previewDiscount;
  const previewGST = (previewTaxable * (parseFloat(taxPercentage) || 18)) / 100;
  const previewGrandTotal = previewTaxable + previewGST;

  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      if (!customerId) throw new Error('Please select a customer.');
      if (!validUntil) throw new Error('Please enter a valid until date.');

      const validItems = items.map((i) => {
        if (!i.productId) throw new Error('All item rows must have a selected product.');
        const qty = parseInt(i.quantity, 10);
        const price = parseFloat(i.unitPrice);
        if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be greater than 0.');
        if (isNaN(price) || price < 0) throw new Error('Unit price must be non-negative.');
        return { productId: i.productId, quantity: qty, unitPrice: price };
      });

      const payload = {
        customerId,
        enquiryId: enquiryId || null,
        validUntil,
        discountPercentage: parseFloat(discountPercentage) || 0,
        taxPercentage: parseFloat(taxPercentage) || 18,
        notes: notes || undefined,
        items: validItems,
      };

      const res = await quotationApi.create(payload);
      if (res.success) {
        setShowModal(false);
        setCustomerId('');
        setEnquiryId('');
        setValidUntil('');
        setDiscountPercentage(0);
        setNotes('');
        setItems([{ productId: '', quantity: 1, unitPrice: '' }]);
        fetchData();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to submit quotation.');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setActionLoading(id);
    try {
      await quotationApi.updateStatus(id, newStatus);
      fetchData();
    } catch (err) {
      alert(err.message || 'Status update failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertToOrder = async (id) => {
    setActionLoading(id);
    try {
      await quotationApi.convertToOrder(id);
      navigate('/sales-orders');
    } catch (err) {
      alert(err.message || 'Order conversion failed.');
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <span className="badge badge-draft">DRAFT</span>;
      case 'SENT':
        return <span className="badge badge-sent">SENT</span>;
      case 'ACCEPTED':
        return <span className="badge badge-accepted">ACCEPTED</span>;
      case 'REJECTED':
        return <span className="badge badge-rejected">REJECTED</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="container space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ClipboardList size={28} className="text-primary" />
            <span>Commercial Quotations</span>
          </h1>
          <p className="page-subtitle">
            Generate and manage binding quotations with server-calculated GST, line items, and lifecycle approvals.
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
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Generate Quotation</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-box">
          {error}
        </div>
      )}

      {/* Quotations Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Quotation Number</th>
                <th>Customer</th>
                <th className="text-right">Subtotal</th>
                <th className="text-right">Discount</th>
                <th className="text-right">GST (18%)</th>
                <th className="text-right">Grand Total</th>
                <th className="text-center">Status</th>
                <th className="text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-muted" style={{ padding: '2rem 1rem' }}>
                    No quotations found. Click "Generate Quotation" to create one.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span className="font-mono font-semibold text-primary text-xs block">
                        {q.quotationNumber}
                      </span>
                      {q.enquiry && (
                        <span className="text-xs text-muted">
                          Ref: {q.enquiry.enquiryNumber}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="font-semibold block" style={{ color: 'var(--text-main)' }}>
                        {q.customer?.companyName}
                      </span>
                      <span className="text-xs text-muted">{q.customer?.city}</span>
                    </td>
                    <td className="text-right font-mono text-xs">
                      ₹{parseFloat(q.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right font-mono text-xs">
                      {parseFloat(q.discountPercentage) > 0 ? (
                        <span style={{ color: '#9a3412' }}>
                          -{parseFloat(q.discountPercentage)}% (₹{parseFloat(q.discountAmount).toLocaleString('en-IN')})
                        </span>
                      ) : (
                        '₹0.00'
                      )}
                    </td>
                    <td className="text-right font-mono text-xs">
                      ₹{parseFloat(q.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right font-bold font-mono text-sm" style={{ color: 'var(--text-main)' }}>
                      ₹{parseFloat(q.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center">
                      {getStatusBadge(q.status)}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {q.status === 'DRAFT' && (
                          <button
                            onClick={() => handleStatusUpdate(q.id, 'SENT')}
                            disabled={actionLoading === q.id}
                            className="btn btn-secondary btn-sm"
                          >
                            <Send size={12} />
                            <span>Mark Sent</span>
                          </button>
                        )}

                        {q.status === 'SENT' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(q.id, 'ACCEPTED')}
                              disabled={actionLoading === q.id}
                              className="btn btn-success btn-sm"
                            >
                              <Check size={12} />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(q.id, 'REJECTED')}
                              disabled={actionLoading === q.id}
                              className="btn btn-danger btn-sm"
                            >
                              <Ban size={12} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {q.status === 'ACCEPTED' && !q.salesOrder && (
                          <button
                            onClick={() => handleConvertToOrder(q.id)}
                            disabled={actionLoading === q.id}
                            className="btn btn-primary btn-sm"
                          >
                            <span>Convert to Order</span>
                            <ArrowRight size={12} />
                          </button>
                        )}

                        {q.salesOrder && (
                          <span className="badge badge-success">
                            Converted ({q.salesOrder.orderNumber})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Quotation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                Generate Commercial Quotation
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

            <form onSubmit={handleSubmitQuotation} className="space-y-4">
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    Customer
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select Customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Enquiry Reference (Optional)
                  </label>
                  <select
                    value={enquiryId}
                    onChange={(e) => setEnquiryId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Direct Quotation (No Enquiry Link)</option>
                    {enquiries.map((enq) => (
                      <option key={enq.id} value={enq.id}>
                        {enq.enquiryNumber} - {enq.customer?.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row form-row-3">
                <div className="form-group">
                  <label className="form-label">
                    Valid Until Date
                  </label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    GST / Tax %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="form-group">
                <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Quotation Line Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="btn btn-secondary btn-sm"
                  >
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="items-container">
                  {items.map((row, idx) => (
                    <div key={idx} className="item-row">
                      <select
                        required
                        value={row.productId}
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className="form-select"
                        style={{ flex: 1, fontSize: '0.8125rem' }}
                      >
                        <option value="">Select Industrial Product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.productCode} - {p.productName}
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
                        style={{ width: '70px', fontSize: '0.8125rem' }}
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="Price"
                        value={row.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="form-input font-mono text-right"
                        style={{ width: '100px', fontSize: '0.8125rem' }}
                      />

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="item-remove-btn"
                          title="Remove item"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Live Preview Box */}
              <div className="calc-preview-card">
                <div className="calc-row">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{previewSubtotal.toFixed(2)}</span>
                </div>
                {previewDiscount > 0 && (
                  <div className="calc-row discount">
                    <span>Discount ({discountPercentage}%):</span>
                    <span className="font-mono">-₹{previewDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="calc-row">
                  <span>GST ({taxPercentage}%):</span>
                  <span className="font-mono">₹{previewGST.toFixed(2)}</span>
                </div>
                <div className="calc-row total">
                  <span>Calculated Grand Total:</span>
                  <span className="font-mono total-val">₹{previewGrandTotal.toFixed(2)}</span>
                </div>
                <span className="calc-footnote">
                  Authoritatively computed & validated server-side upon saving.
                </span>
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
                  className="btn btn-primary"
                >
                  Save Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
