import React, { useEffect, useState } from 'react';
import { orderApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart,
  CheckCircle,
  Truck,
  XCircle,
  RefreshCw,
  X,
  AlertCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export const SalesOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Dispatch Modal
  const [dispatchModalOrder, setDispatchModalOrder] = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchError, setDispatchError] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  const { isAdmin } = useAuth();

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await orderApi.getAll(statusFilter);
      if (res.success && res.data) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      setError(err.message || 'Failed to load Sales Orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleConfirmOrder = async (orderId) => {
    if (!isAdmin) {
      alert('Action Restricted: Only users with the ADMIN role can confirm orders and reserve warehouse stock.');
      return;
    }
    setActionLoading(orderId);
    try {
      await orderApi.confirm(orderId);
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Confirmation failed. Possible stock deficit.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenDispatchModal = (order) => {
    setDispatchModalOrder(order);
    setVehicleNumber('');
    setDriverName('');
    setDispatchNotes('');
    setDispatchError('');
  };

  const handleSubmitDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchModalOrder) return;
    setIsDispatching(true);
    setDispatchError('');

    try {
      await orderApi.dispatch(dispatchModalOrder.id, {
        vehicleNumber,
        driverName,
        notes: dispatchNotes || undefined,
      });
      setDispatchModalOrder(null);
      fetchOrders();
    } catch (err) {
      setDispatchError(err.message || 'Dispatch processing failed.');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order? Any reserved inventory will be released back to stock.')) {
      return;
    }
    setActionLoading(orderId);
    try {
      await orderApi.cancel(orderId);
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Order cancellation failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-pending">PENDING</span>;
      case 'CONFIRMED':
        return <span className="badge badge-confirmed">CONFIRMED</span>;
      case 'DISPATCHED':
        return <span className="badge badge-dispatched">DISPATCHED</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">CANCELLED</span>;
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
            <ShoppingCart size={28} className="text-primary" />
            <span>Sales Orders & Warehouse Dispatch</span>
          </h1>
          <p className="page-subtitle">
            Track confirmed sales contracts, execute concurrency-safe inventory reservations, and log dispatches.
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
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={loading ? 'spin text-primary' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-box">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer & City</th>
                <th>Order Date</th>
                <th className="text-right">Contract Amount</th>
                <th className="text-center">Status</th>
                <th className="text-right">Fulfillment Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: '2rem 1rem' }}>
                    No sales orders found matching filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <span className="font-mono font-semibold text-primary text-xs block">
                        {ord.orderNumber}
                      </span>
                      {ord.dispatch && (
                        <span className="text-xs text-muted" style={{ display: 'block' }}>
                          Dispatch: {ord.dispatch.dispatchNumber}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="font-semibold block" style={{ color: 'var(--text-main)' }}>
                        {ord.customer?.companyName}
                      </span>
                      <span className="text-xs text-muted">{ord.customer?.city}</span>
                    </td>
                    <td className="text-xs text-muted">
                      {new Date(ord.orderDate).toLocaleDateString()}
                    </td>
                    <td className="text-right font-bold font-mono text-sm" style={{ color: 'var(--text-main)' }}>
                      ₹{parseFloat(ord.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center">
                      {getStatusBadge(ord.status)}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {ord.status === 'PENDING' && (
                          <>
                            {isAdmin ? (
                              <button
                                onClick={() => handleConfirmOrder(ord.id)}
                                disabled={actionLoading === ord.id}
                                className="btn btn-primary btn-sm"
                                title="Checks stock with FOR UPDATE lock and increments reserved stock"
                              >
                                <CheckCircle size={14} />
                                <span>Confirm & Reserve Stock</span>
                              </button>
                            ) : (
                              <span className="badge badge-pending flex items-center gap-1">
                                <Clock size={12} />
                                <span>Awaiting Admin Confirm</span>
                              </span>
                            )}
                          </>
                        )}

                        {ord.status === 'CONFIRMED' && (
                          <>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleOpenDispatchModal(ord)}
                                  className="btn btn-success btn-sm"
                                >
                                  <Truck size={14} />
                                  <span>Dispatch</span>
                                </button>
                                <button
                                  onClick={() => handleCancelOrder(ord.id)}
                                  disabled={actionLoading === ord.id}
                                  className="btn btn-danger btn-sm"
                                >
                                  <XCircle size={14} />
                                  <span>Cancel</span>
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {ord.status === 'DISPATCHED' && (
                          <span className="badge badge-dispatched flex items-center gap-1">
                            <Truck size={12} />
                            <span>Fulfilled ({ord.dispatch?.vehicleNumber || 'Vehicle Assigned'})</span>
                          </span>
                        )}

                        {ord.status === 'CANCELLED' && (
                          <span className="badge badge-danger">
                            Order Cancelled
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

      {/* Dispatch Modal */}
      {dispatchModalOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title flex items-center gap-2">
                  <Truck size={18} className="text-primary" />
                  <span>Process Order Dispatch</span>
                </h3>
                <span className="text-xs text-muted">
                  {dispatchModalOrder.orderNumber} • {dispatchModalOrder.customer?.companyName}
                </span>
              </div>
              <button
                onClick={() => setDispatchModalOrder(null)}
                className="modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <div className="info-banner" style={{ marginBottom: '1rem' }}>
              <span>
                Dispatching will atomically decrement both <strong>Physical Stock</strong> and <strong>Reserved Stock</strong> by order quantities.
              </span>
            </div>

            {dispatchError && (
              <div className="alert-box flex items-center gap-2">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{dispatchError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDispatch} className="space-y-3">
              <div className="form-group">
                <label className="form-label">
                  Vehicle Registration Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-12-AB-9876"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="form-input font-mono"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Driver Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Logistics Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="LR number, gate pass notes..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="form-textarea"
                ></textarea>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setDispatchModalOrder(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="btn btn-success"
                >
                  {isDispatching ? 'Processing Dispatch...' : 'Confirm Dispatch & Deduct Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
