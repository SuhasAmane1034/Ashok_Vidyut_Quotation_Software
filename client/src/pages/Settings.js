import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Edit2, Check, Eye, EyeOff, Upload } from 'lucide-react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../api/config';
import TermsFormatted from '../components/TermsFormatted';

function ShortcutEditor({ title, items, onChange }) {
  const [editing, setEditing] = useState(null);
  const [newKey, setNewKey]   = useState('');
  const [newVal, setNewVal]   = useState('');
  const add = () => { if (!newKey || !newVal) return; onChange([...items, { key: newKey.toUpperCase(), value: newVal }]); setNewKey(''); setNewVal(''); };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, value) => { const n = [...items]; n[i] = { ...n[i], [field]: value }; onChange(n); };
  return (
    <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, maxHeight: 190, overflowY: 'auto' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {editing === i ? (
              <>
                <input style={{ width: 65 }} value={item.key} onChange={e => update(i, 'key', e.target.value.toUpperCase())} />
                <input style={{ flex: 1 }} value={item.value} onChange={e => update(i, 'value', e.target.value)} />
                <button className="btn btn-success btn-sm btn-icon" onClick={() => setEditing(null)}><Check size={12} /></button>
              </>
            ) : (
              <>
                <span className="tag" style={{ minWidth: 36, justifyContent: 'center', fontFamily: 'monospace' }}>{item.key}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{item.value}</span>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(i)}><Edit2 size={12} /></button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(i)}><Trash2 size={12} /></button>
              </>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={newKey} onChange={e => setNewKey(e.target.value.toUpperCase())} placeholder="Key" style={{ width: 72 }} />
        <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Value" style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn btn-primary btn-sm" onClick={add}><Plus size={12} /></button>
      </div>
    </div>
  );
}

const ALL_COLUMNS = [
  { key: 'sr_no',         label: 'Sr. No',       locked: false },
  { key: 'product_image', label: 'Product Image', locked: false },
  { key: 'product_name',  label: 'Product Name',  locked: true  },
  { key: 'shape',         label: 'Shape',         locked: false },
  { key: 'color',         label: 'Color',         locked: false },
  { key: 'body_color',    label: 'Body Color',    locked: false },
  { key: 'warranty',      label: 'Warranty',      locked: false },
  { key: 'quantity',      label: 'Quantity',      locked: true  },
  { key: 'unit',          label: 'Unit',          locked: false },
  { key: 'rate',          label: 'Rate',          locked: true  },
  { key: 'discount',      label: 'Discount %',    locked: false },
  { key: 'amount',        label: 'Amount',        locked: true  },
];

const ACCENT_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#0ea5e9','#f97316','#14b8a6'];

export default function Settings() {
  const { settings, updateSettings } = useApp();
  const [form, setForm]   = useState({});
  const [shapes, setShapes]       = useState([]);
  const [colors, setColors]       = useState([]);
  const [bodyColors, setBodyColors] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [colVis, setColVis]       = useState({});
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef();

  useEffect(() => {
    if (settings) {
      setForm({
        company_name:    settings.company_name    || '',
        company_address: settings.company_address || '',
        company_phone:   settings.company_phone   || '',
        currency:        settings.currency        || '₹',
        validity_days:   settings.validity_days   || 30,
        default_unit:    settings.default_unit    || 'Pcs',
        tax_rate:        settings.tax_rate        || 18,
        tax_label:       settings.tax_label       || 'GST',
        accent_color:    settings.accent_color    || '#6366f1',
        dark_mode:       settings.dark_mode       || false,
        terms:           settings.terms           || '',
        company_logo:    settings.company_logo    || '',
      });
      setShapes(Array.isArray(settings.shapes)        ? settings.shapes        : []);
      setColors(Array.isArray(settings.colors)        ? settings.colors        : []);
      setBodyColors(Array.isArray(settings.body_colors) ? settings.body_colors : []);
      setWarranties(Array.isArray(settings.warranties) ? settings.warranties   : []);
      const cv = settings.columns_visible && typeof settings.columns_visible === 'object' ? settings.columns_visible : {};
      const defaults = {};
      ALL_COLUMNS.forEach(c => { defaults[c.key] = cv[c.key] !== false; });
      setColVis(defaults);
    }
  }, [settings]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await axios.post('/api/upload', fd);
      setForm(f => ({ ...f, company_logo: res.data.url }));
    } catch {}
    setUploading(false);
  };

  const handleSave = () => {
    updateSettings({ ...form, shapes, colors, body_colors: bodyColors, warranties, columns_visible: colVis });
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleCol = (key) => setColVis(p => ({ ...p, [key]: !p[key] }));

  return (
    <div>
      <div className="top-header">
        <span className="header-title">Settings</span>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleSave}><Save size={14} /> Save All</button>
        </div>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Company */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Company Details</span></div>
            <div className="card-body">
              {/* Global Logo */}
              <div className="form-group">
                <label>Company Logo (Global — used on all quotes)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {form.company_logo ? (
                    <img src={`${API_BASE}${form.company_logo}`} alt="logo" style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', padding: 3 }} />
                  ) : (
                    <div style={{ width: 60, height: 60, background: 'var(--accent-muted)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: '1.5px dashed var(--border)' }}>🏢</div>
                  )}
                  <div>
                    <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                    <button className="btn btn-secondary btn-sm" onClick={() => logoRef.current?.click()} disabled={uploading}>
                      <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload Logo'}
                    </button>
                    {form.company_logo && (
                      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => f('company_logo', '')}>Remove</button>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>PNG / JPG / SVG</div>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Company Name</label>
                <input value={form.company_name || ''} onChange={e => f('company_name', e.target.value)} placeholder="Your Company" />
              </div>
              <div className="form-group">
                <label>Address (shown on print)</label>
                <textarea value={form.company_address || ''} onChange={e => f('company_address', e.target.value)} rows={2} placeholder="Full address" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.company_phone || ''} onChange={e => f('company_phone', e.target.value)} placeholder="+91 00000 00000" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Billing & Tax</span></div>
            <div className="card-body">
              <div className="grid-2">
                <div className="form-group">
                  <label>Currency Symbol</label>
                  <input value={form.currency || ''} onChange={e => f('currency', e.target.value)} placeholder="₹" />
                </div>
                <div className="form-group">
                  <label>Default Validity (Days)</label>
                  <input type="number" value={form.validity_days || ''} onChange={e => f('validity_days', e.target.value)} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Default Unit</label>
                  <select value={form.default_unit || 'Pcs'} onChange={e => f('default_unit', e.target.value)}>
                    <option>Pcs</option><option>Meter</option><option>Reel</option><option>Set</option><option>Box</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tax Label</label>
                  <input value={form.tax_label || ''} onChange={e => f('tax_label', e.target.value)} placeholder="GST" />
                </div>
              </div>
              <div className="form-group">
                <label>Tax Rate (%)</label>
                <input type="number" value={form.tax_rate || ''} onChange={e => f('tax_rate', e.target.value)} placeholder="18" />
              </div>

              {/* Appearance */}
              <div className="divider" />
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-primary)' }}>Appearance</div>
              <div className="form-group">
                <label>Accent Color</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 4 }}>
                  {ACCENT_COLORS.map(c => (
                    <button key={c} onClick={() => f('accent_color', c)} style={{ width: 30, height: 30, background: c, borderRadius: 8, border: form.accent_color === c ? '3px solid white' : '2px solid transparent', cursor: 'pointer', boxShadow: form.accent_color === c ? `0 0 0 2px ${c}` : 'none', transition: 'all 0.15s' }} />
                  ))}
                  <input type="color" value={form.accent_color || '#6366f1'} onChange={e => f('accent_color', e.target.value)} style={{ width: 30, height: 30, padding: 2, border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer' }} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="toggle-switch">
                  <input type="checkbox" checked={form.dark_mode === true || form.dark_mode === 'true'} onChange={e => f('dark_mode', e.target.checked)} />
                  <span className="toggle-track"></span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Dark Mode</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Column Visibility */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Column Visibility</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Affects quotation table + PDF print</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {ALL_COLUMNS.map(col => {
                const on = colVis[col.key] !== false;
                return (
                  <div key={col.key} onClick={() => !col.locked && toggleCol(col.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-muted)' : 'transparent', cursor: col.locked ? 'default' : 'pointer', transition: 'all 0.15s', opacity: col.locked ? 0.6 : 1 }}>
                    <div style={{ color: on ? 'var(--accent)' : 'var(--text-muted)' }}>{on ? <Eye size={14} /> : <EyeOff size={14} />}</div>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: on ? 'var(--text-primary)' : 'var(--text-muted)' }}>{col.label}</span>
                    {col.locked && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>required</span>}
                    {!col.locked && (
                      <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={on} onChange={() => toggleCol(col.key)} />
                        <span className="toggle-track"></span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* T&C */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Default Terms & Conditions</span>
            <span style={{ fontSize: 11, background: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>ALL CAPS or **bold** → red on print</span>
          </div>
          <div className="card-body">
            <textarea value={form.terms || ''} onChange={e => f('terms', e.target.value)} rows={6} style={{ fontFamily: 'monospace', fontSize: 12.5 }}
              placeholder={"ALL RATES ARE INCLUSIVE OF GST.\nGoods once sold will not be taken back.\n**Payment due within 7 days.**\nWarranty as per company policy."} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              💡 Use <strong>ALL CAPS</strong> for a whole line, or wrap phrases in <code style={{ fontSize: 10 }}>**double asterisks**</code> for red bold — plain textarea cannot show bold while typing; preview below matches print.
            </div>
            <div style={{ marginTop: 10, padding: 12, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Live preview (same as print)</div>
              <TermsFormatted
                text={form.terms || ''}
                style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}
              />
              {!(form.terms || '').trim() && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nothing to preview yet.</span>
              )}
            </div>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Shortcut Key Mappings</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Type shortcut → auto-expands in quotation grid</span>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ShortcutEditor title="🔵 Shape" items={shapes} onChange={setShapes} />
            <ShortcutEditor title="🟡 Color" items={colors} onChange={setColors} />
            <ShortcutEditor title="⚫ Body Color" items={bodyColors} onChange={setBodyColors} />
            <ShortcutEditor title="🛡️ Warranty" items={warranties} onChange={setWarranties} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 60 }}>
          <button className="btn btn-primary btn-lg" onClick={handleSave}><Save size={15} /> Save All Settings</button>
        </div>
      </div>
    </div>
  );
}
