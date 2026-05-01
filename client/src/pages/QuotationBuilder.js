import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Save, Printer, Trash2, Plus, X, Upload, Eye, EyeOff, FileText, Store, User, Settings as SettingsIcon, ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import PrintView from '../components/PrintView';
import { API_BASE } from '../api/config';

const emptyRow = () => ({
  _id: Math.random().toString(36).slice(2),
  product_id: '', product_name: '', product_image: '',
  shape: '', color: '', body_color: '', warranty: '',
  quantity: '', unit: 'Pcs', rate: '', discount: 0, amount: 0,
  _inlineDraft: {
    name: '',
    price: '',
    category: '',
    imageFile: null,
    imagePreview: '',
  },
});

/* ── Inline Product Creation Form ─────────────────────── */
function InlineProductForm({ draft, onDraftChange, onSaved, onCancel, addToast }) {
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onDraftChange({
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    });
  };

  const handleSave = async () => {
    if (!draft.name.trim()) { addToast('Product name is required', 'error'); return; }
    if (!draft.price || isNaN(Number(draft.price))) { addToast('Enter a valid price', 'error'); return; }
    setSaving(true);
    try {
      let imageUrl = '';
      if (draft.imageFile) {
        const fd = new FormData();
        fd.append('file', draft.imageFile);
        const up = await axios.post('/api/upload', fd);
        imageUrl = up.data.url;
      }
      const res = await axios.post('/api/products', {
        name: draft.name.trim(),
        code: '',
        rate: Number(draft.price),
        unit: 'Pcs',
        image: imageUrl,
        category: draft.category,
        stock: 0, min_stock: 5, track_stock: false,
      });
      addToast(`Product "${draft.name}" created!`, 'success');
      onSaved({ id: res.data.id, name: draft.name.trim(), rate: Number(draft.price), unit: 'Pcs', image: imageUrl, category: draft.category });
    } catch (e) {
      addToast('Failed to create product', 'error');
    }
    setSaving(false);
  };

  // MODIFIED: use correct CSS vars (--bg-card, --bg-input, --border, --text-primary, --text-muted)
  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: 7,
    border: '1.5px solid var(--border)',
    background: 'var(--bg-input)', color: 'var(--text-primary)',
    fontSize: 13, boxSizing: 'border-box', outline: 'none',
    fontFamily: 'var(--font-body)',
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--bg-card), rgba(99,102,241,0.04))',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      marginTop: 4,
      animation: 'slideDown 0.22s cubic-bezier(.4,0,.2,1)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--accent)' }}>Create New Product</span>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Name *</label>
          <input value={draft.name} onChange={e => onDraftChange({ name: e.target.value })}
            style={inputStyle} placeholder="e.g. LED Panel 18W" autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</label>
          <input value={draft.category} onChange={e => onDraftChange({ category: e.target.value })}
            style={inputStyle} placeholder="Panel, Spot, Bulb…" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Price (₹) *</label>
          <input type="number" value={draft.price} onChange={e => onDraftChange({ price: e.target.value })}
            style={{ ...inputStyle, textAlign: 'right' }} placeholder="0" min="0" />
        </div>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            This product will be created and inserted back into the same quotation row.
          </div>
        </div>
      </div>

      {/* Image Upload — ADDED: improved with drag feel */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Image</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', flexShrink: 0 }}>
            {draft.imagePreview
              ? <img src={draft.imagePreview} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 9, border: '2px solid var(--accent)' }} />
              : <div style={{ width: 56, height: 56, borderRadius: 9, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--accent-muted)', color: 'var(--accent)', gap: 2 }}>
                  <Upload size={16} />
                  <span style={{ fontSize: 9, fontWeight: 600 }}>UPLOAD</span>
                </div>
            }
          </div>
          <div>
            <button onClick={() => fileRef.current?.click()}
              style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--accent-muted)', border: '1px solid var(--accent)', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Upload size={12} /> {draft.imagePreview ? 'Change' : 'Upload Image'}
            </button>
            {draft.imagePreview && (
              <button onClick={() => onDraftChange({ imageFile: null, imagePreview: '' })}
                style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', padding: '5px 8px', cursor: 'pointer', marginLeft: 4 }}>
                Remove
              </button>
            )}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>PNG, JPG up to 10MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ flex: 1, background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 12px var(--accent-glow)' }}>
          {saving ? '⏳ Saving…' : <><Plus size={14} /> Save & Use Product</>}
        </button>
        <button onClick={onCancel}
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Product Autocomplete Cell (with Create option) ──── */
function ProductCell({ value, onChange, onSelect, onKeyDown, rowIdx, addToast, onInlineToggle, showInline, inlineTyped }) {
  const [query, setQuery]     = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const [idx, setIdx]         = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    if (query.length < 1) { setResults([]); setOpen(false); return; }
    clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/products?search=${encodeURIComponent(query)}`);
        setResults(res.data);
        setOpen(true);
        setIdx(0);
      } catch {}
      setLoading(false);
    }, 200);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const pick = (p) => { setQuery(p.name); setOpen(false); onSelect(p); };

  const handleKey = (e) => {
    if (open) {
      // MODIFIED: idx now ranges over results only (create option is always last via mouse)
      if (e.key === 'ArrowDown')  { e.preventDefault(); setIdx(i => Math.min(i+1, results.length - 1)); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setIdx(i => Math.max(i-1, 0)); return; }
      if (e.key === 'Enter' && results[idx]) { e.preventDefault(); pick(results[idx]); return; }
      if (e.key === 'Escape') { setOpen(false); return; }
    }
    onKeyDown?.(e);
  };

  // MODIFIED: show dropdown when we have results OR have typed something (for the create option)
  const showDropdown = open && query.length >= 1;

  return (
    <div style={{ position: 'relative' }}>
      <div className="autocomplete-wrapper">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input className="grid-input" value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
          onKeyDown={handleKey}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search product…" autoComplete="off" />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onMouseDown={(e) => {
              e.preventDefault();
              onInlineToggle(query);
              setOpen(false);
            }}
            title="Create new product in this row"
            style={{ whiteSpace: 'nowrap', padding: '6px 8px' }}
          >
            <Plus size={12} /> {showInline ? 'Close' : 'Create'}
          </button>
        </div>
        {loading && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>⏳</div>
        )}
        {/* MODIFIED: show dropdown when typing (for results + create option) */}
        {showDropdown && (
          <div className="autocomplete-dropdown product-dropdown">
            {results.length > 0 ? (
              results.map((p, i) => (
                <div key={p.id} className={`autocomplete-item product-item ${i === idx ? 'selected' : ''}`}
                  onMouseDown={() => pick(p)}>
                  {p.image
                    ? <img src={`${API_BASE}${p.image}`} alt="" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    : <div style={{ width: 42, height: 42, background: 'var(--accent-muted)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>💡</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)', marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                      {p.code && <span style={{ background: 'var(--accent-muted)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>{p.code}</span>}
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>₹{Number(p.rate).toLocaleString('en-IN')}/{p.unit}</span>
                      {p.category && <span>{p.category}</span>}
                      {p.track_stock ? <span style={{ color: p.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>Stock: {p.stock}</span> : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              /* ADDED: No results message */
              !loading && (
                <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                  No products found for "<strong style={{ color: 'var(--text)' }}>{query}</strong>"
                </div>
              )
            )}
            {/* MODIFIED: Sticky Create option — always shown when typing */}
            <div className="autocomplete-item create-item"
              onMouseDown={() => { setOpen(false); onInlineToggle(query); }}>
              <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>✨</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>➕ Create new product</div>
                {query && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>"{query}"</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Shortcut Cell ─────────────────────────────────────── */
function ShortcutCell({ value, options = [], onChange, onKeyDown, placeholder }) {
  const [input, setInput] = useState(value || '');
  const [open, setOpen]   = useState(false);
  useEffect(() => { setInput(value || ''); }, [value]);

  const resolve = (raw) => {
    const v = raw.trim().toUpperCase();
    const m = options.find(o => o.key?.toUpperCase() === v);
    return m ? m.value : raw;
  };

  const pick = (v) => { setInput(v); onChange(v); setOpen(false); };

  const filtered = options.filter(o =>
    o.value.toLowerCase().includes(input.toLowerCase()) ||
    o.key.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div className="autocomplete-wrapper">
      <input className="grid-input" value={input}
        onChange={e => { setInput(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => { const r = resolve(input); setInput(r); onChange(r); setOpen(false); }, 180)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{ minWidth: 70 }} />
      {open && filtered.length > 0 && (
        <div className="autocomplete-dropdown" style={{ minWidth: 150 }}>
          {filtered.map(o => (
            <div key={o.key} className="autocomplete-item" onMouseDown={() => pick(o.value)}>
              <span className="tag" style={{ fontSize:10, minWidth:30, justifyContent:'center', fontFamily:'monospace' }}>{o.key}</span>
              <span className="autocomplete-item-name">{o.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Amt({ value, currency }) {
  if (!value || Number(value) === 0) return <span style={{ color:'var(--text-muted)' }}>—</span>;
  const formatted = Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <span>
      <span style={{ color:'var(--text-muted)', fontSize:11, marginRight:1 }}>{currency}</span>
      <span style={{ fontVariantNumeric:'tabular-nums' }}>{formatted}</span>
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN BUILDER
══════════════════════════════════════════════════════════ */
export default function QuotationBuilder() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { settings, addToast } = useApp();
  const [saving, setSaving]     = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [showDiscount, setShowDiscount] = useState(true);
  const loaded = useRef(false);

  const [header, setHeader] = useState({
    company_name:'', company_logo:'',
    customer_name:'', customer_mobile:'', customer_address:'',
    date: new Date().toISOString().split('T')[0],
    validity_days: 30, notes:'', terms:'', status:'draft',
    subtotal:0, discount:0, tax:0, tax_rate:18, total:0,
  });
  const [rows, setRows]                 = useState([emptyRow()]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [applyTax, setApplyTax]         = useState(false);
  const [quoteNumber, setQuoteNumber]   = useState('');
  const [inlineRowIdx, setInlineRowIdx] = useState(null); // which row has inline form open

  useEffect(() => {
    if (settings && !loaded.current && !id) {
      setHeader(h => ({
        ...h,
        company_name:  settings.company_name  || '',
        company_logo:  settings.company_logo  || '',
        validity_days: Number(settings.validity_days) || 30,
        terms:         settings.terms         || '',
        tax_rate:      Number(settings.tax_rate) || 18,
      }));
    }
  }, [settings, id]);

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/quotations/${id}`).then(res => {
      const q = res.data;
      setQuoteNumber(q.quote_number);
      setHeader({
        company_name: q.company_name,
        company_logo: q.company_logo || settings?.company_logo || '',
        customer_name: q.customer_name, customer_mobile: q.customer_mobile,
        customer_address: q.customer_address, date: q.date,
        validity_days: q.validity_days, notes: q.notes, terms: q.terms,
        status: q.status, subtotal: q.subtotal, discount: q.discount,
        tax: q.tax, tax_rate: q.tax_rate, total: q.total,
      });
      setOverallDiscount(q.discount || 0);
      setApplyTax(q.tax > 0);
      setRows(q.items?.length
        ? [...q.items.map(it => ({ ...it, _id: it.id || Math.random().toString(36).slice(2) })), emptyRow()]
        : [emptyRow()]);
      loaded.current = true;
    }).catch(() => addToast('Failed to load quotation', 'error'));
  }, [id]);

  const calcTotals = useCallback((rowList, disc, taxOn, taxRate) => {
    const sub      = rowList.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const discAmt  = Math.min(Number(disc) || 0, sub);
    const after    = sub - discAmt;
    const taxAmt   = taxOn ? after * ((Number(taxRate) || 0) / 100) : 0;
    return { subtotal: sub, discount: discAmt, tax: taxAmt, total: after + taxAmt };
  }, []);

  const pushTotals = useCallback((rowList, disc, taxOn) => {
    const taxRate = Number(header.tax_rate || settings?.tax_rate || 18);
    setHeader(h => ({ ...h, ...calcTotals(rowList, disc, taxOn, taxRate), tax_rate: taxRate }));
  }, [header.tax_rate, settings, calcTotals]);

  const updateRow = useCallback((i, field, value) => {
    setRows(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      const r   = next[i];
      const qty  = Number(r.quantity) || 0;
      const rate = Number(r.rate)     || 0;
      const disc = Math.min(Number(r.discount) || 0, 100);
      next[i].amount = qty * rate * (1 - disc / 100);
      if (i === next.length - 1 && String(value).trim() !== '') next.push(emptyRow());
      pushTotals(next, overallDiscount, applyTax);
      return next;
    });
  }, [overallDiscount, applyTax, pushTotals]);

  const updateInlineDraft = useCallback((i, patch) => {
    setRows(prev => {
      const next = [...prev];
      const current = next[i]?._inlineDraft || emptyRow()._inlineDraft;
      next[i] = { ...next[i], _inlineDraft: { ...current, ...patch } };
      return next;
    });
  }, []);

  const selectProduct = useCallback((i, p) => {
    setRows(prev => {
      const next = [...prev];
      const qty  = Number(next[i].quantity) || 1;
      next[i] = { ...next[i], product_id: p.id, product_name: p.name, rate: p.rate, unit: p.unit || 'Pcs', product_image: p.image || '', quantity: qty };
      next[i].amount = qty * p.rate * (1 - (Number(next[i].discount) || 0) / 100);
      if (i === next.length - 1) next.push(emptyRow());
      pushTotals(next, overallDiscount, applyTax);
      return next;
    });
    setInlineRowIdx(null);
  }, [overallDiscount, applyTax, pushTotals]);

  const deleteRow = (i) => {
    if (rows.length === 1) return;
    if (inlineRowIdx === i) setInlineRowIdx(null);
    setRows(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      pushTotals(next, overallDiscount, applyTax);
      return next;
    });
  };

  useEffect(() => { pushTotals(rows, overallDiscount, applyTax); }, [overallDiscount, applyTax]);

  const handleKeyNav = (e, rowIdx, field) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const fields = ['product_name','shape','color','body_color','warranty','quantity','unit','rate','discount'];
    const fi = fields.indexOf(field);
    if (fi < fields.length - 1) {
      document.querySelector(`[data-row="${rowIdx}"][data-field="${fields[fi+1]}"] input`)?.focus();
    } else {
      document.querySelector(`[data-row="${rowIdx+1}"][data-field="product_name"] input`)?.focus();
    }
  };

  const handleSave = async (forcedStatus) => {
    setSaving(true);
    try {
      const validRows = rows.filter(r => r.product_name && r.quantity && r.rate);
      if (!validRows.length) { addToast('Add at least one product', 'error'); setSaving(false); return; }
      const payload = {
        ...header,
        status: forcedStatus || header.status,
        items: validRows.map((r, i) => ({ ...r, sr_no: i + 1 }))
      };
      if (id) {
        await axios.put(`/api/quotations/${id}`, payload);
        addToast('Quotation saved!', 'success');
      } else {
        const res = await axios.post('/api/quotations', payload);
        addToast('Quotation created!', 'success');
        navigate(`/quotations/${res.data.id}/edit`, { replace: true });
      }
    } catch { addToast('Save failed — check connection', 'error'); }
    setSaving(false);
  };

  const shapes     = settings?.shapes      || [];
  const colors     = settings?.colors      || [];
  const bodyColors = settings?.body_colors || [];
  const warranties = settings?.warranties  || [];
  const currency   = settings?.currency    || '₹';
  const colVis     = settings?.columns_visible || {};
  const taxRate    = Number(header.tax_rate || settings?.tax_rate || 18);
  const validRows  = rows.filter(r => r.product_name && r.quantity && r.rate);
  const totalSaved = validRows.reduce((sum, row) => {
    const qty = Number(row.quantity) || 0;
    const rate = Number(row.rate) || 0;
    const disc = Math.min(Number(row.discount) || 0, 100);
    return sum + (qty * rate * (disc / 100));
  }, 0);
  const halfTax = (Number(header.tax) || 0) / 2;
  const show = (k) => colVis[k] !== false;

  const validTill = header.date && header.validity_days
    ? new Date(new Date(header.date).getTime() + Number(header.validity_days) * 86400000)
        .toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    : null;

  if (showPrint) {
    return (
      <PrintView
        quotation={{ ...header, quote_number: quoteNumber || 'PREVIEW', items: validRows }}
        onClose={() => setShowPrint(false)}
        settings={settings}
      />
    );
  }

  const TABS = [
    { id: 'items', label: 'Items', icon: FileText },
    { id: 'shop', label: 'Shop Details', icon: Store },
    { id: 'customer', label: 'Customer', icon: User },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div>
      <div className="top-header">
        <span className="header-title">{id ? `Edit · ${quoteNumber}` : 'New Quotation'}</span>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/quotations')}>
            <ArrowLeft size={14} /> Back
          </button>
          <button className="btn btn-secondary" onClick={() => handleSave('draft')} disabled={saving}>
            Save Draft
          </button>
          {id && (
            <button className="btn btn-secondary" onClick={() => setShowPrint(true)}>
              <Printer size={14} /> Print / PDF
            </button>
          )}
          <button className="btn btn-primary" onClick={() => handleSave()} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'items' && (
        <>
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-header"><span className="card-title">Customer Details</span></div>
          <div className="card-body">
            <div className="grid-2">
              <div className="form-group">
                <label>Customer Name</label>
                <input value={header.customer_name}
                  onChange={e => setHeader(h => ({ ...h, customer_name: e.target.value }))}
                  placeholder="Customer / Company name" />
              </div>
              <div className="form-group">
                <label>Mobile</label>
                <input value={header.customer_mobile}
                  onChange={e => setHeader(h => ({ ...h, customer_mobile: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Address / City</label>
              <input value={header.customer_address}
                onChange={e => setHeader(h => ({ ...h, customer_address: e.target.value }))}
                placeholder="City, State" />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-header">
            <div>
              <span className="card-title">Products</span>
              {validRows.length > 0 && (
                <span style={{ marginLeft:10, fontSize:12, color:'var(--text-muted)' }}>
                  {validRows.length} item{validRows.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
              ⌨ <strong>Enter</strong> = next field &nbsp;·&nbsp; type shortcut in Shape / Color / Warranty
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowDiscount(v => !v)}>
              {showDiscount ? <Eye size={13} /> : <EyeOff size={13} />} Discount {showDiscount ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="qt-table-wrap">
            <table className="qt-table">
              <colgroup>
                {show('sr_no')         && <col className="col-sr" />}
                {show('product_image') && <col className="col-img" />}
                <col className="col-name" />
                {show('shape')         && <col className="col-shape" />}
                {show('color')         && <col className="col-color" />}
                {show('body_color')    && <col className="col-body" />}
                {show('warranty')      && <col className="col-warr" />}
                <col className="col-qty" />
                {show('unit')          && <col className="col-unit" />}
                <col className="col-rate" />
                {show('discount') && showDiscount && <col className="col-disc" />}
                <col className="col-amt" />
                <col className="col-del" />
              </colgroup>
              <thead>
                <tr>
                  {show('sr_no')         && <th className="ctr">#</th>}
                  {show('product_image') && <th className="ctr">IMG</th>}
                  <th>PRODUCT NAME</th>
                  {show('shape')         && <th>SHAPE</th>}
                  {show('color')         && <th>COLOR</th>}
                  {show('body_color')    && <th>BODY</th>}
                  {show('warranty')      && <th>WARRANTY</th>}
                  <th className="num">QTY</th>
                  {show('unit')          && <th>UNIT</th>}
                  <th className="num">RATE</th>
                  {show('discount') && showDiscount && <th className="num">DISC%</th>}
                  <th className="num">AMOUNT</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isEmpty = !row.product_name && !row.quantity && !row.rate;
                  const showForm = inlineRowIdx === i;
                  const totalCols =
                    (show('sr_no') ? 1 : 0) + (show('product_image') ? 1 : 0) +
                    1 + (show('shape') ? 1 : 0) + (show('color') ? 1 : 0) +
                    (show('body_color') ? 1 : 0) + (show('warranty') ? 1 : 0) +
                    1 + (show('unit') ? 1 : 0) + 1 + (show('discount') ? 1 : 0) + 1 + 1;

                  return (
                    <React.Fragment key={row._id}>
                      <tr className={isEmpty ? 'empty-row' : ''}>
                        {show('sr_no') && (
                          <td className="ctr">
                            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{i + 1}</span>
                          </td>
                        )}
                        {show('product_image') && (
                          <td className="qt-img-cell">
                            {row.product_image
                              ? <img src={`${API_BASE}${row.product_image}`} alt="" />
                              : <div className="img-placeholder">💡</div>
                            }
                          </td>
                        )}
                        <td data-row={i} data-field="product_name">
                          <ProductCell
                            value={row.product_name}
                            onChange={v => updateRow(i, 'product_name', v)}
                            onSelect={p => selectProduct(i, p)}
                            onKeyDown={e => handleKeyNav(e, i, 'product_name')}
                            rowIdx={i}
                            addToast={addToast}
                            showInline={showForm}
                            onInlineToggle={(typed) => {
                              updateRow(i, 'product_name', typed);
                              updateInlineDraft(i, { name: typed });
                              setInlineRowIdx(showForm ? null : i);
                            }}
                          />
                        </td>
                        {show('shape') && (
                          <td data-row={i} data-field="shape">
                            <ShortcutCell value={row.shape} options={shapes}
                              onChange={v => updateRow(i, 'shape', v)}
                              onKeyDown={e => handleKeyNav(e, i, 'shape')} placeholder="R/S…" />
                          </td>
                        )}
                        {show('color') && (
                          <td data-row={i} data-field="color">
                            <ShortcutCell value={row.color} options={colors}
                              onChange={v => updateRow(i, 'color', v)}
                              onKeyDown={e => handleKeyNav(e, i, 'color')} placeholder="W/NW…" />
                          </td>
                        )}
                        {show('body_color') && (
                          <td data-row={i} data-field="body_color">
                            <ShortcutCell value={row.body_color} options={bodyColors}
                              onChange={v => updateRow(i, 'body_color', v)}
                              onKeyDown={e => handleKeyNav(e, i, 'body_color')} placeholder="B/W…" />
                          </td>
                        )}
                        {show('warranty') && (
                          <td data-row={i} data-field="warranty">
                            <ShortcutCell value={row.warranty} options={warranties}
                              onChange={v => updateRow(i, 'warranty', v)}
                              onKeyDown={e => handleKeyNav(e, i, 'warranty')} placeholder="1/NW…" />
                          </td>
                        )}
                        <td data-row={i} data-field="quantity">
                          <input className="grid-input num-input" type="number" value={row.quantity} min="0"
                            onChange={e => updateRow(i, 'quantity', e.target.value)}
                            onKeyDown={e => handleKeyNav(e, i, 'quantity')} />
                        </td>
                        {show('unit') && (
                          <td data-row={i} data-field="unit">
                            <input className="grid-input" value={row.unit}
                              onChange={e => updateRow(i, 'unit', e.target.value)}
                              onKeyDown={e => handleKeyNav(e, i, 'unit')} />
                          </td>
                        )}
                        <td data-row={i} data-field="rate">
                          <input className="grid-input num-input" type="number" value={row.rate} min="0"
                            onChange={e => updateRow(i, 'rate', e.target.value)}
                            onKeyDown={e => handleKeyNav(e, i, 'rate')} />
                        </td>
                        {show('discount') && showDiscount && (
                          <td data-row={i} data-field="discount">
                            <input className="grid-input num-input" type="number" value={row.discount} min="0" max="100"
                              onChange={e => updateRow(i, 'discount', e.target.value)}
                              onKeyDown={e => handleKeyNav(e, i, 'discount')} />
                          </td>
                        )}
                        <td className="qt-amt-cell">
                          <Amt value={row.amount} currency={currency} />
                        </td>
                        <td className="ctr">
                          <button className="btn btn-ghost btn-icon"
                            style={{ color:'var(--danger)', opacity: rows.length === 1 ? 0.25 : 0.7, padding:'5px' }}
                            onClick={() => deleteRow(i)} disabled={rows.length === 1}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>

                      {/* Inline product creation form row — MODIFIED: uses class for clean styling */}
                      {showForm && (
                        <tr className="inline-form-row">
                          <td colSpan={totalCols}>
                            <div className="inline-form-inner" style={{ padding: 6, background: 'rgba(99,102,241,0.05)', borderTop: '1px dashed var(--border)' }}>
                              <InlineProductForm
                                draft={row._inlineDraft || emptyRow()._inlineDraft}
                                onDraftChange={(patch) => updateInlineDraft(i, patch)}
                                addToast={addToast}
                                onCancel={() => setInlineRowIdx(null)}
                                onSaved={(newProduct) => {
                                  selectProduct(i, newProduct);
                                  updateInlineDraft(i, {
                                    name: newProduct.name || '',
                                    price: newProduct.rate || '',
                                    category: newProduct.category || '',
                                    imageFile: null,
                                    imagePreview: '',
                                  });
                                  setInlineRowIdx(null);
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {validRows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={
                      (show('sr_no') ? 1 : 0) +
                      (show('product_image') ? 1 : 0) +
                      1 +
                      (show('shape') ? 1 : 0) +
                      (show('color') ? 1 : 0) +
                      (show('body_color') ? 1 : 0) +
                      (show('warranty') ? 1 : 0) +
                      1 +
                      (show('unit') ? 1 : 0) +
                      1
                    } />
                    {show('discount') && showDiscount && <td />}
                    <td className="qt-subtotal-label">Subtotal</td>
                    <td className="qt-subtotal-value">
                      <Amt value={header.subtotal} currency={currency} />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── NOTES + TOTALS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:14, alignItems:'start' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Notes & Terms</span></div>
            <div className="card-body">
              <div className="form-group">
                <label>Notes</label>
                <textarea value={header.notes}
                  onChange={e => setHeader(h => ({ ...h, notes: e.target.value }))}
                  placeholder="Thank you for your business!" rows={2} />
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Terms & Conditions</label>
                <textarea value={header.terms}
                  onChange={e => setHeader(h => ({ ...h, terms: e.target.value }))}
                  rows={4} />
              </div>
            </div>
          </div>

          <div className="totals-panel">
            <div className="totals-panel-head">Order Summary</div>
            <table>
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td><Amt value={header.subtotal} currency={currency} /></td>
                </tr>
                <tr>
                  <td><span>Discount</span></td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                      <input type="number" value={overallDiscount}
                        onChange={e => setOverallDiscount(Number(e.target.value))}
                        style={{ width:72, textAlign:'right', padding:'4px 8px', fontSize:13, fontWeight:700 }}
                        min="0" />
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>{currency}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <label className="toggle-switch" style={{ gap:7 }}>
                      <input type="checkbox" checked={applyTax} onChange={e => setApplyTax(e.target.checked)} />
                      <span className="toggle-track"></span>
                      <span style={{ fontSize:13, color:'var(--text-secondary)' }}>
                        {settings?.tax_label || 'GST'} ({taxRate}%)
                      </span>
                    </label>
                  </td>
                  <td>
                    {applyTax
                      ? <Amt value={halfTax} currency={currency} />
                      : <span style={{ color:'var(--text-muted)', fontSize:12 }}>Not applied</span>
                    }
                  </td>
                </tr>
                {applyTax && (
                  <tr>
                    <td>SGST ({taxRate / 2}%)</td>
                    <td><Amt value={halfTax} currency={currency} /></td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="grand-row">
                  <td>Grand Total</td>
                  <td>
                    <span style={{ fontVariantNumeric:'tabular-nums' }}>
                      {currency}{Number(header.total).toLocaleString('en-IN', { minimumFractionDigits:2 })}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
            {totalSaved > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', color: 'var(--success)', fontWeight: 700 }}>
                Customer Saved: {currency}{Number(totalSaved).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <div style={{ padding:'14px 16px', borderTop:'1px solid var(--border)' }}>
              <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving}
                style={{ justifyContent:'center', padding:'11px' }}>
                <Save size={15} /> {saving ? 'Saving…' : 'Save Quotation'}
              </button>
            </div>
          </div>
        </div>
        </>
        )}

        {activeTab === 'shop' && (
          <div className="card" style={{ maxWidth: 900 }}>
            <div className="card-header"><span className="card-title">Shop Details</span></div>
            <div className="card-body">
              <div className="form-group">
                <label>Company Name</label>
                <input value={header.company_name}
                  onChange={e => setHeader(h => ({ ...h, company_name: e.target.value }))}
                  placeholder="From Settings" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Quote Date</label>
                  <input type="date" value={header.date}
                    onChange={e => setHeader(h => ({ ...h, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Validity (Days)</label>
                  <input type="number" value={header.validity_days}
                    onChange={e => setHeader(h => ({ ...h, validity_days: e.target.value }))} />
                </div>
              </div>
              {validTill && (
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--accent-muted)', borderRadius:7, padding:'8px 12px', fontSize:12.5, color:'var(--accent)', fontWeight:600 }}>
                  <span>📅</span>
                  <span>Valid Till: <strong>{validTill}</strong></span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'customer' && (
          <div className="card" style={{ maxWidth: 900 }}>
            <div className="card-header"><span className="card-title">Customer & Notes</span></div>
            <div className="card-body">
              <div className="grid-2">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input value={header.customer_name}
                    onChange={e => setHeader(h => ({ ...h, customer_name: e.target.value }))}
                    placeholder="Customer / Company name" />
                </div>
                <div className="form-group">
                  <label>Mobile</label>
                  <input value={header.customer_mobile}
                    onChange={e => setHeader(h => ({ ...h, customer_mobile: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
              <div className="form-group">
                <label>Address / City</label>
                <input value={header.customer_address}
                  onChange={e => setHeader(h => ({ ...h, customer_address: e.target.value }))}
                  placeholder="City, State" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={header.notes}
                  onChange={e => setHeader(h => ({ ...h, notes: e.target.value }))}
                  placeholder="Thank you for your business!" rows={2} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Terms & Conditions</label>
                <textarea value={header.terms}
                  onChange={e => setHeader(h => ({ ...h, terms: e.target.value }))}
                  rows={4} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card" style={{ maxWidth: 700 }}>
            <div className="card-header"><span className="card-title">Quotation Settings</span></div>
            <div className="card-body">
              <div className="form-group">
                <label>Status</label>
                <select value={header.status}
                  onChange={e => setHeader(h => ({ ...h, status: e.target.value }))}
                  style={{ width:'auto', padding:'6px 10px', fontSize:12, fontWeight:600 }}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>Apply {settings?.tax_label || 'GST'}</label>
                <label className="toggle-switch" style={{ marginTop: 8 }}>
                  <input type="checkbox" checked={applyTax} onChange={e => setApplyTax(e.target.checked)} />
                  <span className="toggle-track"></span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {applyTax ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Select Tax Rate</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {[0, 5, 12, 18, 28].map(rate => (
                    <button
                      key={rate}
                      className={`btn btn-sm ${taxRate === rate ? 'btn-primary' : 'btn-secondary'}`}
                      disabled={!applyTax}
                      onClick={() => setHeader(h => ({ ...h, tax_rate: rate }))}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
