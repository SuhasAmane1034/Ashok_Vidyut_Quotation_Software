import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, X, Save, Download, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../api/config';

const emptyProduct = {
  name: '',
  code: '',
  rate: '',
  unit: 'Pcs',
  category: '',
  mrp: '',
  image: '',
  stock: 0,
  min_stock: 5,
  track_stock: false
};

const resolveImageUrl = (img) => {
  if (!img) return '';
  if (/^https?:\/\//i.test(img) || img.startsWith('data:')) return img;
  return `${API_BASE}${img}`;
};

export default function ProductLibrary() {
  const { addToast } = useApp();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [importing, setImporting] = useState(false);
  const [editingRate, setEditingRate] = useState({ id: null, val: '' });

  const importRef = useRef();
  const imgRef = useRef();
  const qc = useQueryClient();

  // ---------------- PRODUCTS ----------------
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => axios.get('/api/products').then(res => res.data)
  });

  // ---------------- SAVE ----------------
  const saveMutation = useMutation({
    mutationFn: (p) =>
      p.id
        ? axios.put(`/api/products/${p.id}`, p)
        : axios.post('/api/products', p),

    onSuccess: () => {
      qc.invalidateQueries(['products']);
      setModal(null);
      addToast('Product saved!');
    },
    onError: () => addToast('Save failed', 'error')
  });

  // ---------------- DELETE ----------------
  const deleteMutation = useMutation({
    mutationFn: (id) => axios.delete(`/api/products/${id}`),

    onSuccess: () => {
      qc.invalidateQueries(['products']);
      addToast('Product deleted');
    },
    onError: () => addToast('Delete failed', 'error')
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (category) => axios.delete(`/api/products/category/${encodeURIComponent(category)}`),

    onSuccess: () => {
      qc.invalidateQueries(['products']);
      setCatFilter('');
      addToast('Category products deleted');
    },
    onError: () => addToast('Delete category failed', 'error')
  });

  // ---------------- EXPORT (FIXED) ----------------
  const handleExport = async () => {
    try {
      const res = await axios.get('/api/products/export', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();

      addToast('Excel downloaded!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Export failed', 'error');
    }
  };

  // Helper to escape values for CSV
  const escapeCsv = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadErrorReportCSV = (errors) => {
    if (!errors || errors.length === 0) return;
    const headers = ['Row Number', 'Product Code', 'Product Name', 'Error'];
    const csvContent = [
      headers.join(','),
      ...errors.map(err => [
        err.row,
        escapeCsv(err.code),
        escapeCsv(err.name),
        escapeCsv(err.message)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `import_errors_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------- IMPORT (FIXED) ----------------
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await axios.post('/api/products/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      qc.invalidateQueries(['products']);

      const { created, updated, skipped, errors } = res.data;

      const toastMessage = (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '13px' }}>Import Completed Successfully</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '12px', opacity: 0.9 }}>
            <div>✓ {updated} Products Updated</div>
            <div>✓ {created} Products Added</div>
            <div>⚠ {skipped} Rows Skipped</div>
          </div>
          {errors && errors.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: 0
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  downloadErrorReportCSV(errors);
                }}
              >
                View Error Report
              </button>
            </div>
          )}
        </div>
      );

      addToast(toastMessage, 'success');
    } catch (err) {
      console.error(err);
      addToast('Import failed', 'error');
    }

    setImporting(false);
    e.target.value = '';
  };

  // ---------------- IMAGE UPLOAD ----------------
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await axios.post('/api/upload', fd);

      setModal((m) => ({
        ...m,
        data: { ...m.data, image: res.data.url }
      }));

      addToast('Image uploaded!');
    } catch {
      addToast('Image upload failed', 'error');
    }
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const filtered = products.filter(p => {
    const s = search.toLowerCase();
    return (
      (!search ||
        p.name?.toLowerCase().includes(s) ||
        p.code?.toLowerCase().includes(s) ||
        p.category?.toLowerCase().includes(s)) &&
      (!catFilter || p.category === catFilter)
    );
  });

  return (
    <div>
      <div className="top-header">
        <span className="header-title">Product Library</span>
        <div className="header-actions">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 200 }} />
          </div>
          <button className="btn btn-secondary" onClick={handleExport} title="Export all products to Excel">
            <Download size={14} /> Export
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
          <button className="btn btn-secondary" onClick={() => importRef.current?.click()} disabled={importing}
            style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
            <Upload size={14} /> {importing ? 'Importing…' : 'Import'}
          </button>
          <button className="btn btn-primary" onClick={() => setModal({ mode: 'add', data: { ...emptyProduct } })}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Category pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} products</span>
          <button className={`btn btn-sm ${!catFilter ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter('')}>All</button>
          {categories.map(c => (
            <button key={c} className={`btn btn-sm ${catFilter === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter(c === catFilter ? '' : c)}>{c}</button>
          ))}
          {(search || catFilter) && <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setCatFilter(''); }}><X size={12} /> Clear</button>}
          {catFilter && (
            <button 
              className="btn btn-danger btn-sm" 
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }} 
              onClick={() => window.confirm(`Are you sure you want to delete ALL products in category "${catFilter}"? This cannot be undone.`) && deleteCategoryMutation.mutate(catFilter)}
            >
              <Trash2 size={13} style={{ marginRight: 4 }} /> Delete Category
            </button>
          )}
        </div>

        {/* Import hint */}
        <div style={{ background: 'var(--accent-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', marginBottom: 14, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📊</span>
          <span>Excel import columns: <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>name</code> <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>code</code> <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>rate</code> <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>unit</code> <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>mrp</code> <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>category</code> <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>imageUrl</code> <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>stock</code> <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>min_stock</code> <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>track_stock</code> — use <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>1/yes/true</code> to add into Inventory — <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={handleExport}>Export first to see format ↗</span></span>
        </div>

        <div className="card">
          {isLoading ? (
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <h3>No products found</h3>
              <p>{search ? 'Try a different search' : 'Add your first LED product or import from Excel'}</p>
              <br />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setModal({ mode: 'add', data: { ...emptyProduct } })}><Plus size={14} /> Add Product</button>
                <button className="btn btn-secondary" onClick={() => importRef.current?.click()}><Upload size={14} /> Import Excel</button>
              </div>
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 46 }}>Image</th>
                    <th>Product Name</th>
                    <th>Code</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ textAlign: 'right' }}>MRP (₹)</th>
                    <th>Unit</th>
                    <th>Stock</th>
                    <th style={{ width: 80 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td>
                        {p.image
                          ? <img src={resolveImageUrl(p.image)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 7, border: '1px solid var(--border)' }} />
                          : <div style={{ width: 36, height: 36, background: 'var(--accent-muted)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💡</div>
                        }
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.code ? <span className="badge badge-accent">{p.code}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p.category || '—'}</td>
                      <td style={{ textAlign: 'right', width: 130 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>₹</span>
                          <input
                            type="number"
                            className="no-spin"
                            min="0"
                            step="any"
                            value={editingRate.id === p.id ? editingRate.val : (p.rate ?? 0)}
                            onChange={(e) => setEditingRate({ id: p.id, val: e.target.value })}
                            onFocus={() => setEditingRate({ id: p.id, val: String(p.rate ?? 0) })}
                            onBlur={() => {
                              const newRate = Number(editingRate.val);
                              if (editingRate.id === p.id && newRate !== p.rate && !isNaN(newRate) && newRate >= 0) {
                                saveMutation.mutate({
                                  ...p,
                                  rate: newRate
                                });
                              }
                              setEditingRate({ id: null, val: '' });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            style={{
                              width: 90,
                              textAlign: 'right',
                              background: editingRate.id === p.id ? 'var(--bg-input)' : 'transparent',
                              border: editingRate.id === p.id ? '1px solid var(--accent)' : '1px solid transparent',
                              borderRadius: 4,
                              padding: '2px 6px',
                              fontWeight: 700,
                              fontSize: 13,
                              color: 'var(--text-primary)',
                              outline: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Click to edit rate"
                          />
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{p.mrp ? `₹${Number(p.mrp).toLocaleString('en-IN')}` : '—'}</td>
                      <td><span className="tag">{p.unit}</span></td>
                      <td>
                        {p.track_stock
                          ? <span className={`badge ${p.stock === 0 ? 'badge-rejected' : p.stock <= p.min_stock ? 'badge-warning' : 'badge-approved'}`} style={{ fontSize: 11 }}>
                              {p.stock === 0 ? 'Out' : `${p.stock}`}
                            </span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal({ mode: 'edit', data: { ...p, track_stock: !!p.track_stock } })}><Edit2 size={13} /></button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => window.confirm(`Delete "${p.name}"?`) && deleteMutation.mutate(p.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <span className="modal-title">{modal.mode === 'add' ? '➕ Add Product' : '✏️ Edit Product'}</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {/* Image */}
              <div className="form-group">
                <label>Product Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {modal.data.image
                    ? <img src={resolveImageUrl(modal.data.image)} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 9, border: '1px solid var(--border)' }} />
                    : <div style={{ width: 56, height: 56, background: 'var(--accent-muted)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: '1.5px dashed var(--border)' }}>💡</div>
                  }
                  <div>
                    <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    <button className="btn btn-secondary btn-sm" onClick={() => imgRef.current?.click()}>
                      <Upload size={12} /> Upload
                    </button>
                    {modal.data.image && (
                      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => setModal(m => ({ ...m, data: { ...m.data, image: '' } }))}>Remove</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Product Name *</label>
                <input value={modal.data.name} onChange={e => setModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} placeholder="e.g. LED Panel Light 18W" autoFocus />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Code</label>
                  <input value={modal.data.code} onChange={e => setModal(m => ({ ...m, data: { ...m.data, code: e.target.value } }))} placeholder="PL18W" />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input value={modal.data.category} onChange={e => setModal(m => ({ ...m, data: { ...m.data, category: e.target.value } }))} placeholder="Panel / Spot / Strip…" list="cat-list" />
                  <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label>Rate (₹) *</label>
                  <input className="no-spin" type="number" value={modal.data.rate} onChange={e => setModal(m => ({ ...m, data: { ...m.data, rate: e.target.value } }))} min="0" />
                </div>
                <div className="form-group">
                  <label>MRP (₹)</label>
                  <input className="no-spin" type="number" value={modal.data.mrp} onChange={e => setModal(m => ({ ...m, data: { ...m.data, mrp: e.target.value } }))} min="0" />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select value={modal.data.unit} onChange={e => setModal(m => ({ ...m, data: { ...m.data, unit: e.target.value } }))}>
                    <option>Pcs</option><option>Meter</option><option>Reel</option><option>Set</option><option>Box</option><option>Kg</option>
                  </select>
                </div>
              </div>

              {/* Stock tracking */}
              <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '12px 14px', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: modal.data.track_stock ? 12 : 0 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>📦 Track Stock</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Manage inventory for this product</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={!!modal.data.track_stock}
                      onChange={e => setModal(m => ({ ...m, data: { ...m.data, track_stock: e.target.checked } }))} />
                    <span className="toggle-track"></span>
                  </label>
                </div>
                {modal.data.track_stock && (
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Current Stock</label>
                      <input type="number" value={modal.data.stock} min="0" onChange={e => setModal(m => ({ ...m, data: { ...m.data, stock: e.target.value } }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Min Stock (alert threshold)</label>
                      <input type="number" value={modal.data.min_stock} min="0" onChange={e => setModal(m => ({ ...m, data: { ...m.data, min_stock: e.target.value } }))} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => saveMutation.mutate(modal.data)} disabled={!modal.data.name || saveMutation.isPending}>
                <Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}