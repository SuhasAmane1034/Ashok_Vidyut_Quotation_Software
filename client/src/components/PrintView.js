import React, { useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { API_BASE } from '../api/config';

const ITEMS_PER_PAGE = 10;

function isPhoto(img) {
  return img && (img.startsWith('data:') || img.startsWith('http') || img.startsWith('/uploads'));
}

function ProductImg({ image, size = 68 }) {
  const src = isPhoto(image)
    ? (image.startsWith('/') ? `${API_BASE}${image}` : image)
    : null;
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: Math.round(size * 0.55) }}>💡</span>}
    </div>
  );
}

function formatINR(v) {
  return '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PageHeader({ quotation, settings, continued = false }) {
  const logo = settings?.company_logo;
  const logoSrc = logo
    ? (logo.startsWith('data:') || logo.startsWith('http') ? logo : `${API_BASE}${logo}`)
    : null;

  return (
    <div style={{ borderBottom: '3px solid #f59e0b', paddingBottom: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {logoSrc && !continued && (
            <img src={logoSrc} alt="Logo" style={{ height: 64, maxWidth: 140, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} />
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
              {quotation.company_name || settings?.company_name || 'YOUR COMPANY'}
            </div>
            {!continued && (
              <>
                {settings?.company_address && <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2, whiteSpace: 'pre-line' }}>{settings.company_address}</div>}
                {settings?.company_phone && <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>📞 {settings.company_phone}</div>}
              </>
            )}
            {continued && <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>Continued from previous page…</div>}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 8 }}>
            {continued ? 'Quotation (Cont.)' : 'Quotation'}
          </div>
          <table style={{ fontSize: 11, marginLeft: 'auto', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={{ color: '#374151', paddingRight: 10, fontWeight: 700 }}>Quote No:</td><td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#111827', fontSize: 12 }}>{quotation.quote_number}</td></tr>
              <tr><td style={{ color: '#374151', paddingRight: 10, fontWeight: 700 }}>Date:</td><td style={{ fontWeight: 600, color: '#111827' }}>{formatDate(quotation.date)}</td></tr>
              {quotation.validity_days && <tr><td style={{ color: '#374151', paddingRight: 10, fontWeight: 700 }}>Valid Till:</td><td style={{ fontWeight: 600, color: '#111827' }}>{formatDate(new Date(new Date(quotation.date).getTime() + Number(quotation.validity_days) * 86400000))}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ItemsTable({ items, startIndex = 0, currency = '₹', colVis = {} }) {
  const show = k => colVis[k] !== false;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr style={{ borderTop: '2px solid #e5e7eb', borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
          {show('sr_no') && <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 700, color: '#374151', width: 28 }}>Sr.</th>}
          {show('product_image') && <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 700, color: '#374151', width: 76 }}>Image</th>}
          <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Product Name</th>
          {show('shape') && <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#374151', width: 48 }}>Shape</th>}
          {show('color') && <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#374151', width: 56 }}>Color</th>}
          {show('body_color') && <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#374151', width: 58 }}>Body</th>}
          {show('warranty') && <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#374151', width: 58 }}>Warr.</th>}
          <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#374151', width: 36 }}>Qty</th>
          {show('unit') && <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#374151', width: 38 }}>Unit</th>}
          <th style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#374151', width: 86 }}>Rate</th>
          {show('discount') && <th style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#374151', width: 44 }}>Disc.</th>}
          <th style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#374151', width: 96 }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
            {show('sr_no') && <td style={{ padding: '5px 4px', color: '#9ca3af', verticalAlign: 'middle' }}>{startIndex + i + 1}</td>}
            {show('product_image') && <td style={{ padding: '5px 4px', verticalAlign: 'middle' }}><ProductImg image={item.product_image} /></td>}
            <td style={{ padding: '5px 4px', verticalAlign: 'middle' }}>
              <div style={{ fontWeight: 600, color: '#111827' }}>{item.product_name}</div>
            </td>
            {show('shape') && <td style={{ padding: '5px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
              {item.shape ? <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', background: '#eef2ff', borderRadius: 4, padding: '2px 5px' }}>{item.shape}</span> : <span style={{ color: '#d1d5db' }}>—</span>}
            </td>}
            {show('color') && <td style={{ padding: '5px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
              {item.color ? <span style={{ fontSize: 9, fontWeight: 700, color: '#d97706', background: '#fffbeb', borderRadius: 4, padding: '2px 5px' }}>{item.color}</span> : <span style={{ color: '#d1d5db' }}>—</span>}
            </td>}
            {show('body_color') && <td style={{ padding: '5px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
              {item.body_color ? <span style={{ fontSize: 9, fontWeight: 700, color: '#374151', background: '#f3f4f6', borderRadius: 4, padding: '2px 5px' }}>{item.body_color}</span> : <span style={{ color: '#d1d5db' }}>—</span>}
            </td>}
            {show('warranty') && <td style={{ padding: '5px 4px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10, color: '#374151' }}>{item.warranty || '—'}</td>}
            <td style={{ padding: '5px 4px', textAlign: 'center', color: '#374151', verticalAlign: 'middle', fontWeight: 600 }}>{item.quantity}</td>
            {show('unit') && <td style={{ padding: '5px 4px', textAlign: 'center', color: '#6b7280', verticalAlign: 'middle', fontSize: 10 }}>{item.unit || '—'}</td>}
            <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'monospace', color: '#374151', verticalAlign: 'middle' }}>{formatINR(item.rate)}</td>
            {show('discount') && <td style={{ padding: '5px 4px', textAlign: 'right', color: item.discount > 0 ? '#16a34a' : '#9ca3af', fontWeight: item.discount > 0 ? 700 : 400, verticalAlign: 'middle' }}>
              {item.discount > 0 ? `${item.discount}%` : '—'}
            </td>}
            <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#111827', verticalAlign: 'middle' }}>{formatINR(item.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PrintView({ quotation, settings, onClose }) {
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#fff';
    return () => { document.body.style.background = prev; };
  }, []);

  if (!quotation) return null;

  const items = quotation.items ?? [];
  const page1Items = items.slice(0, ITEMS_PER_PAGE);
  const page2Items = items.slice(ITEMS_PER_PAGE);
  const hasPage2 = page2Items.length > 0;
  const colVis = settings?.columns_visible || {};
  const currency = settings?.currency || '₹';

  const signatureRaw = settings?.signature;
  const signatureSrc = signatureRaw
    ? (signatureRaw.startsWith('data:') || signatureRaw.startsWith('http') ? signatureRaw : `${API_BASE}${signatureRaw}`)
    : null;

  const subtotal = items.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const discountAmt = Number(quotation.discount) || 0;
  const afterDisc = subtotal - discountAmt;
  const taxAmt = Number(quotation.tax) || 0;
  const grandTotal = afterDisc + taxAmt;

  const TotalsBlock = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginTop: 16 }}>
      {/* Notes + Terms + Signature */}
      <div style={{ flex: 1, fontSize: 11 }}>
        {quotation.notes && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, fontSize: 9, marginBottom: 3 }}>Notes</div>
            <div style={{ color: '#374151', whiteSpace: 'pre-line' }}>{quotation.notes}</div>
          </div>
        )}
        {quotation.terms && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, fontSize: 9, marginBottom: 3 }}>Terms & Conditions</div>
            <div style={{ color: '#6b7280', whiteSpace: 'pre-line', lineHeight: 1.5, fontSize: 10 }}>{quotation.terms}</div>
          </div>
        )}
        <div style={{ marginTop: 32, width: 180, textAlign: 'center' }}>
          {signatureSrc
            ? <img src={signatureSrc} alt="Signature" style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain', marginBottom: 4 }} />
            : <div style={{ height: 40 }} />}
          <div style={{ borderBottom: '1px solid #9ca3af', marginBottom: 4 }}></div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Authorized Signature</div>
        </div>
      </div>

      {/* Totals box */}
      <div style={{ width: 240, maxWidth: '48%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', flexShrink: 0, boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, color: '#6b7280' }}>
          {[
            { label: 'Subtotal', value: formatINR(subtotal) },
            discountAmt > 0 && { label: 'Discount', value: `- ${formatINR(discountAmt)}` },
            taxAmt > 0 && { label: `${settings?.tax_label || 'GST'} (${quotation.tax_rate || 18}%)`, value: formatINR(taxAmt) },
          ].filter(Boolean).map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5, alignItems: 'center' }}>
              <span style={{ whiteSpace: 'nowrap' }}>{row.label}</span>
              <span style={{ fontFamily: 'monospace', textAlign: 'right', flexShrink: 0 }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '2px solid #d1d5db', paddingTop: 8, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#111827', whiteSpace: 'nowrap' }}>Grand Total</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: '#111827' }}>{formatINR(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-page { page-break-after: always; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 16px !important; box-shadow: none !important; border-radius: 0 !important; box-sizing: border-box !important; }
          .print-page:last-child { page-break-after: avoid; }
          button, [role="button"] { display: none !important; }
        }
        body { background: #e5e7eb; }
      `}</style>

      {/* Top bar */}
      <div className="no-print" style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontWeight: 600, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back to Edit
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{items.length} item{items.length !== 1 ? 's' : ''} · {hasPage2 ? '2 pages' : '1 page'}</span>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* Pages wrapper */}
      <div style={{ background: '#e5e7eb', padding: '24px 16px', minHeight: 'calc(100vh - 56px)' }}>

        {/* PAGE 1 */}
        <div className="print-page" style={{ background: '#fff', width: '100%', maxWidth: 794, minHeight: hasPage2 ? 1123 : 'auto', margin: '0 auto 24px', padding: '32px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: 4, boxSizing: 'border-box', overflow: 'hidden' }}>
          <PageHeader quotation={quotation} settings={settings} />

          {/* Customer */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 5 }}>Quotation For:</div>
            <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{quotation.customer_name || 'Walk-in Customer'}</div>
                {quotation.customer_mobile && <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>📞 {quotation.customer_mobile}</div>}
                {quotation.customer_address && <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2, whiteSpace: 'pre-line' }}>{quotation.customer_address}</div>}
              </div>
            </div>
          </div>

          <ItemsTable items={page1Items} startIndex={0} currency={currency} colVis={colVis} />

          {!hasPage2 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ borderTop: '2px solid #f59e0b', marginBottom: 16 }} />
              <TotalsBlock />
            </div>
          )}

          <div style={{ marginTop: 28, paddingTop: 10, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#d1d5db' }}>
            <span>QuoteFlow</span>
            {hasPage2 ? <span>Page 1 of 2 — Continued on next page…</span> : <span>{quotation.quote_number}</span>}
          </div>
        </div>

        {/* PAGE 2 */}
        {hasPage2 && (
          <div className="print-page" style={{ background: '#fff', width: '100%', maxWidth: 794, margin: '0 auto', padding: '32px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: 4, boxSizing: 'border-box', overflow: 'hidden' }}>
            <PageHeader quotation={quotation} settings={settings} continued />
            <ItemsTable items={page2Items} startIndex={ITEMS_PER_PAGE} currency={currency} colVis={colVis} />
            <div style={{ marginTop: 16 }}>
              <div style={{ borderTop: '2px solid #f59e0b', marginBottom: 16 }} />
              <TotalsBlock />
            </div>
            <div style={{ marginTop: 28, paddingTop: 10, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#d1d5db' }}>
              <span>QuoteFlow</span><span>Page 2 of 2 · {quotation.quote_number}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
