import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AlertTriangle, Package, TrendingDown, Plus, Minus, DollarSign, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../api/config';

const resolveImageUrl = (img) => {
  if (!img) return '';
  if (/^https?:\/\//i.test(img) || img.startsWith('data:')) return img;
  return `${API_BASE}${img}`;
};

function StockAdjustModal({ product, onClose, onSave }) {
  const [adj, setAdj]   = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState('add');

  const handleSave = () => {
    const val = Number(adj);
    if (!val || val < 0) return;
    onSave(type === 'add' ? val : -val, note);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Adjust Stock — {product.name}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className={`btn flex-1 ${type === 'add' ? 'btn-success' : 'btn-secondary'}`} onClick={() => setType('add')}>
              <Plus size={14} /> Add Stock
            </button>
            <button className={`btn flex-1 ${type === 'remove' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setType('remove')}>
              <Minus size={14} /> Remove Stock
            </button>
          </div>
          <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
            Current Stock: <strong>{product.stock} {product.unit}</strong>
          </div>
          <div className="form-group">
            <label>Quantity to {type === 'add' ? 'Add' : 'Remove'}</label>
            <input type="number" value={adj} onChange={e => setAdj(e.target.value)} placeholder="0" min="0" autoFocus />
          </div>
          <div className="form-group">
            <label>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Purchase from supplier" />
          </div>
          {adj && (
            <div style={{ background: type === 'add' ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: type === 'add' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
              New stock will be: {Math.max(0, (product.stock || 0) + (type === 'add' ? Number(adj) : -Number(adj)))} {product.unit}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className={`btn ${type === 'add' ? 'btn-success' : 'btn-danger'}`} onClick={handleSave} disabled={!adj || Number(adj) <= 0}>
            Confirm Adjustment
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const { addToast, settings } = useApp();
  const [adjusting, setAdjusting] = useState(null);
  const [filter, setFilter]       = useState('all');
  const qc = useQueryClient();
  const currency = settings?.currency || '₹';

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['inventory-dash'],
    queryFn: () => axios.get('/api/inventory/dashboard').then(r => r.data)
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => axios.get('/api/products').then(r => r.data)
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, adjustment, note }) => axios.post(`/api/products/${id}/stock`, { adjustment, note }),
    onSuccess: () => {
      qc.invalidateQueries(['products']);
      qc.invalidateQueries(['inventory-dash']);
      setAdjusting(null);
      addToast('Stock updated!', 'success');
    },
    onError: () => addToast('Failed to update stock', 'error')
  });

  const tracked = products.filter(p => p.track_stock);
  const displayed = filter === 'low'
    ? tracked.filter(p => p.stock <= p.min_stock && p.stock > 0)
    : filter === 'out'
    ? tracked.filter(p => p.stock === 0)
    : tracked;

  const getStockPct = (p) => Math.min(100, ((p.stock || 0) / Math.max(1, (p.min_stock || 5) * 3)) * 100);
  const getStockColor = (p) => {
    if (p.stock === 0) return 'var(--danger)';
    if (p.stock <= p.min_stock) return 'var(--warning)';
    return 'var(--success)';
  };

  return (
    <div>
      <div className="top-header">
        <span className="header-title">Inventory</span>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => { qc.invalidateQueries(['inventory-dash']); qc.invalidateQueries(['products']); }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Summary Cards */}
        <div className="stats-grid" style={{ marginBottom: 18 }}>
          {[
            { icon: <Package size={18} />, label: 'Total Products',  value: dashLoading ? '…' : dash?.total_products ?? 0,        color: 'var(--accent)' },
            { icon: <AlertTriangle size={18} />, label: 'Low Stock', value: dashLoading ? '…' : dash?.low_stock?.length ?? 0,      color: 'var(--warning)' },
            { icon: <TrendingDown size={18} />, label: 'Out of Stock', value: dashLoading ? '…' : dash?.out_of_stock?.length ?? 0, color: 'var(--danger)' },
            { icon: <DollarSign size={18} />, label: 'Stock Value',   value: dashLoading ? '…' : `${currency}${Number(dash?.stock_value||0).toLocaleString('en-IN')}`, color: 'var(--success)' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-card-glow" />
              <div className="stat-icon" style={{ background: s.color + '22', color: s.color }}>{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Alert Banner */}
        {(dash?.low_stock?.length > 0 || dash?.out_of_stock?.length > 0) && (
          <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
              Stock Alert: {dash?.out_of_stock?.length || 0} items out of stock · {dash?.low_stock?.length || 0} items running low
            </span>
          </div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[['all','All Products'],['low','Low Stock'],['out','Out of Stock']].map(([val, label]) => (
            <button key={val} className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(val)}>
              {label}
              {val === 'low' && dash?.low_stock?.length > 0 && (
                <span style={{ background: 'var(--warning)', color: 'white', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{dash.low_stock.length}</span>
              )}
              {val === 'out' && dash?.out_of_stock?.length > 0 && (
                <span style={{ background: 'var(--danger)', color: 'white', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{dash.out_of_stock.length}</span>
              )}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>{displayed.length} items</span>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="inventory-grid">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140 }} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No products in this category</h3>
            <p>Enable stock tracking in Product Library for your products</p>
          </div>
        ) : (
          <div className="inventory-grid">
            {displayed.map(p => {
              const stockColor = getStockColor(p);
              const pct = getStockPct(p);
              const isLow = p.stock <= p.min_stock && p.stock > 0;
              const isOut = p.stock === 0;
              return (
                <div key={p.id} className={`inventory-card ${isOut ? 'out-stock' : isLow ? 'low-stock' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    {p.image
                      ? <img src={resolveImageUrl(p.image)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 7, flexShrink: 0 }} />
                      : <div style={{ width: 36, height: 36, background: 'var(--accent-muted)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>💡</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{p.category} · {p.code || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 22, fontWeight: 800, color: stockColor, fontFamily: 'var(--font-display)' }}>{p.stock}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{p.unit}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {isOut && <span className="badge badge-danger" style={{ fontSize: 10 }}>Out of Stock</span>}
                      {isLow && !isOut && <span className="badge badge-warning" style={{ fontSize: 10 }}>Low Stock</span>}
                      {!isLow && !isOut && <span className="badge" style={{ fontSize: 10, background: 'var(--success-bg)', color: 'var(--success)' }}>In Stock</span>}
                    </div>
                  </div>

                  <div className="stock-bar-bg">
                    <div className="stock-bar" style={{ width: `${pct}%`, background: stockColor }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5 }}>
                    <span>Min: {p.min_stock}</span>
                    <span>{currency}{Number(p.rate).toLocaleString('en-IN')}/{p.unit}</span>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm w-full"
                    style={{ marginTop: 10, justifyContent: 'center' }}
                    onClick={() => setAdjusting(p)}
                  >
                    Adjust Stock
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {adjusting && (
        <StockAdjustModal
          product={adjusting}
          onClose={() => setAdjusting(null)}
          onSave={(adj, note) => adjustMutation.mutate({ id: adjusting.id, adjustment: adj, note })}
        />
      )}
    </div>
  );
}
