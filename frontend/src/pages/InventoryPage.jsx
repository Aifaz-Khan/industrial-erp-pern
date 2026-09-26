import React, { useEffect, useState } from 'react';
import { productApi } from '../services/api';
import { Boxes, RefreshCw } from 'lucide-react';

export const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await productApi.getInventory();
      if (res.success && res.data) {
        setInventory(res.data.inventory);
      }
    } catch (err) {
      setError(err.message || 'Failed to load inventory stock.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const totalPhysical = inventory.reduce((sum, item) => sum + item.physicalQuantity, 0);
  const totalReserved = inventory.reduce((sum, item) => sum + item.reservedQuantity, 0);
  const totalAvailable = inventory.reduce((sum, item) => sum + item.availableQuantity, 0);

  return (
    <div className="container space-y-4">
      {/* Page Title & Controls */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Boxes size={24} className="text-primary" />
            <span>Warehouse Stock & Telemetry</span>
          </h1>
          <p className="page-subtitle">
            Real-time physical, reserved, and available stock levels across warehouse storage bays.
          </p>
        </div>

        <div className="page-actions">
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={13} className={loading ? 'spin text-primary' : ''} />
            <span>Refresh Stock</span>
          </button>
        </div>
      </div>

      {/* Stock Formula Banner */}
      <div className="info-banner">
        <span>
          <strong>Inventory Invariant:</strong> <code>Available Quantity = Physical Quantity - Reserved Quantity</code>
        </span>
        <span className="text-xs text-muted" style={{ display: 'none' }}>
          Reserved stock increments on order confirmation; physical stock decrements on dispatch.
        </span>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Catalog Products</span>
          <span className="metric-value">{inventory.length}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Physical Warehouse Units</span>
          <span className="metric-value">{totalPhysical}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Reserved for Orders</span>
          <span className="metric-value">{totalReserved}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Available to Sell</span>
          <span className="metric-value">{totalAvailable}</span>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="alert-box">
          {error}
        </div>
      )}

      {/* Inventory Stock Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Product Name & Category</th>
                <th>Unit Price</th>
                <th className="text-center">Physical Stock</th>
                <th className="text-center">Reserved</th>
                <th className="text-center">Available Stock</th>
                <th className="text-right">Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono font-semibold text-primary text-xs">
                    {item.productCode}
                  </td>
                  <td>
                    <span className="font-semibold block" style={{ color: 'var(--text-main)' }}>
                      {item.productName}
                    </span>
                    <span className="text-xs text-muted">
                      {item.category} • {item.unit}
                    </span>
                  </td>
                  <td className="font-mono text-xs">
                    ₹{parseFloat(item.basePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-center font-semibold">
                    {item.physicalQuantity}
                  </td>
                  <td className="text-center font-semibold" style={{ color: '#9a3412' }}>
                    {item.reservedQuantity}
                  </td>
                  <td className="text-center font-bold font-mono" style={{ fontSize: '0.95rem', color: '#166534' }}>
                    {item.availableQuantity}
                  </td>
                  <td className="text-right">
                    {item.availableQuantity === 0 ? (
                      <span className="badge badge-danger">
                        Out of Stock
                      </span>
                    ) : item.availableQuantity < 20 ? (
                      <span className="badge badge-pending">
                        Low Availability
                      </span>
                    ) : (
                      <span className="badge badge-success">
                        In Stock
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
