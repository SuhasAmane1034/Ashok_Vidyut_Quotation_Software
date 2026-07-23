import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { ToWords } from 'to-words';
import { API_BASE } from '../api/config';
import TermsFormatted from './TermsFormatted';

const toWords = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true
  }
});

const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 10mm 12mm;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    font-family: 'Inter', 'Segoe UI', sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .screen-wrapper {
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .print-document {
    width: 100%;
    max-width: 794px;
    margin: 0 auto;
    padding: 0;
    background: #ffffff;
    box-shadow: none;
    border-radius: 0;
    min-height: auto !important;
    height: auto !important;
  }

  .print-document-screen {
    padding: 32px 36px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    border-radius: 4px;
    margin: 24px auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: auto;
  }

  thead { display: table-header-group; }
  tbody { display: table-row-group; }
  tfoot { display: table-footer-group; }

  tr { page-break-inside: avoid; break-inside: avoid; }

  .avoid-break,
  .totals-block,
  .print-footer {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .totals-block {
    page-break-before: auto;
  }

  .print-header-block {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .customer-block {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  img { max-width: 100%; }

  @media print {
    .print-toolbar,
    button {
      display: none !important;
    }

    .print-document-screen {
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
  }
`;

const SCREEN_TOOLBAR_STYLES = `
  .print-toolbar {
    position: fixed;
    top: var(--header-h, 60px);
    left: var(--sidebar-w, 230px);
    right: 0;
    z-index: 200;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 1px 6px rgba(0,0,0,0.08);
  }

  .print-view-body {
    padding-top: 56px;
  }
`;

function isPhoto(img) {
  return img && (img.startsWith('data:') || img.startsWith('http') || img.startsWith('/uploads'));
}

function ProductImg({ image, size = 42 }) {
  const src = isPhoto(image)
    ? image.startsWith('/')
      ? `${API_BASE}${image}`
      : image
    : null;

  return (
    <div style={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: 6,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      border: '1px solid #e5e7eb',
      margin: '0 auto'
    }}>
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.5) }}>💡</span>
      )}
    </div>
  );
}

function formatINR(v) {
  return '₹' + Number(v || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const numStyle = {
  fontFamily: "'Inter', sans-serif",
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1'
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

const thStyle = {
  padding: '5px 4px',
  textAlign: 'center',
  fontWeight: 600,
  color: '#374151',
  verticalAlign: 'middle',
  fontFamily: "'Inter', sans-serif",
  fontSize: 10
};

const tdStyle = {
  padding: '4px 4px',
  textAlign: 'center',
  color: '#374151',
  verticalAlign: 'middle',
  fontFamily: "'Inter', sans-serif",
  fontSize: 10.5,
  lineHeight: 1.35
};

const smallHeading = {
  fontSize: 9,
  fontWeight: 700,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  marginBottom: 5,
  fontFamily: "'Poppins', sans-serif"
};

function PageHeader({ quotation, settings }) {
  const logo = settings?.company_logo;
  const logoSrc = logo
    ? logo.startsWith('data:') || logo.startsWith('http')
      ? logo
      : `${API_BASE}${logo}`
    : null;

  return (
    <div className="print-header-block" style={{ borderBottom: '3px solid #f59e0b', paddingBottom: 10, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {logoSrc && (
            <img
              src={logoSrc}
              alt="Logo"
              style={{ height: 56, maxWidth: 120, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }}
            />
          )}

          <div>
            <div style={{
              fontSize: 20,
              fontWeight: 350,
              color: '#111827',
              letterSpacing: '-0.5px',
              textTransform: 'uppercase',
              fontFamily: "'Poppins', sans-serif"
            }}>
              {quotation.company_name || settings?.company_name || 'YOUR COMPANY'}
            </div>

            {settings?.company_address && (
              <div style={{ color: '#6b7280', fontSize: 10.5, marginTop: 2, whiteSpace: 'pre-line', fontFamily: "'Inter', sans-serif" }}>
                {settings.company_address}
              </div>
            )}

            {settings?.company_phone && (
              <div style={{ color: '#6b7280', fontSize: 10.5, marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                📞 {settings.company_phone}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 15,
            fontWeight: 900,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: 3,
            marginBottom: 6,
            fontFamily: "'Poppins', sans-serif"
          }}>
            Quotation
          </div>

          <table style={{ fontSize: 10.5, marginLeft: 'auto', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
            <tbody>
              <tr>
                <td style={{ color: '#374151', paddingRight: 8, fontWeight: 700 }}>Quote No:</td>
                <td style={{ fontWeight: 800, color: '#111827', fontSize: 11.5, ...numStyle }}>
                  {quotation.quote_number}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#374151', paddingRight: 8, fontWeight: 700 }}>Date:</td>
                <td style={{ fontWeight: 600, color: '#111827' }}>{formatDate(quotation.date)}</td>
              </tr>
              {quotation.validity_days && (
                <tr>
                  <td style={{ color: '#374151', paddingRight: 8, fontWeight: 700 }}>Valid Till:</td>
                  <td style={{ fontWeight: 600, color: '#111827' }}>
                    {formatDate(new Date(new Date(quotation.date).getTime() + Number(quotation.validity_days) * 86400000))}
                  </td>
                </tr>
              )}
              {quotation.salesperson && (
                <tr>
                  <td style={{ color: '#374151', paddingRight: 8, fontWeight: 700 }}>Sales Person:</td>
                  <td style={{ fontWeight: 600, color: '#111827' }}>{quotation.salesperson}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ItemsTable({ items, colVis = {} }) {
  const show = k => colVis[k] !== false;
  const showImage = show('product_image');

  return (
    <table className="items-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
      <thead>
        <tr style={{
          borderTop: '2px solid #e5e7eb',
          borderBottom: '2px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          {show('sr_no') && <th style={{ ...thStyle, width: 26 }}>Sr.</th>}
          {showImage && <th style={{ ...thStyle, width: 50 }}>Image</th>}
          <th style={{ ...thStyle, textAlign: 'left' }}>Product Name</th>
          {show('shape') && <th style={{ ...thStyle, width: 44 }}>Shape</th>}
          {show('color') && <th style={{ ...thStyle, width: 52 }}>Color</th>}
          {show('body_color') && <th style={{ ...thStyle, width: 52 }}>Body</th>}
          {show('warranty') && <th style={{ ...thStyle, width: 52 }}>Warr.</th>}
          <th style={{ ...thStyle, width: 32 }}>Qty</th>
          {show('unit') && <th style={{ ...thStyle, width: 36 }}>Unit</th>}
          {show('mrp') && <th style={{ ...thStyle, textAlign: 'right', width: 60 }}>MRP</th>}
          <th style={{ ...thStyle, textAlign: 'right', width: 76 }}>Rate</th>
          {show('discount') && <th style={{ ...thStyle, textAlign: 'right', width: 40 }}>Disc.</th>}
          <th style={{ ...thStyle, textAlign: 'right', width: 84 }}>Amount</th>
        </tr>
      </thead>

      <tbody>
        {items.map((item, i) => (
          <tr
            key={item.id || item._id || i}
            style={{
              borderBottom: '1px solid #f3f4f6',
              background: i % 2 === 0 ? '#fff' : '#fafafa'
            }}
          >
            {show('sr_no') && <td style={tdStyle}>{i + 1}</td>}

            {showImage && (
              <td style={{ ...tdStyle, padding: '3px 2px' }}>
                <ProductImg image={item.product_image} size={showImage ? 38 : 0} />
              </td>
            )}

            <td style={{ ...tdStyle, textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: '#111827' }}>
                {item.product_name || '—'}
              </div>
            </td>

            {show('shape') && <td style={tdStyle}>{item.shape || '—'}</td>}
            {show('color') && <td style={tdStyle}>{item.color || '—'}</td>}
            {show('body_color') && <td style={tdStyle}>{item.body_color || '—'}</td>}
            {show('warranty') && <td style={tdStyle}>{item.warranty || '—'}</td>}
            <td style={{ ...tdStyle, fontWeight: 600 }}>{item.quantity}</td>
            {show('unit') && <td style={tdStyle}>{item.unit || '—'}</td>}

            {show('mrp') && (
              <td style={{ ...tdStyle, textAlign: 'right', ...numStyle }}>
                {item.mrp ? formatINR(item.mrp) : '—'}
              </td>
            )}

            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, ...numStyle }}>
              {formatINR(item.rate)}
            </td>

            {show('discount') && (
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                {item.discount > 0 ? `${item.discount}%` : '—'}
              </td>
            )}

            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#111827', ...numStyle }}>
              {formatINR(item.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TotalsBlock({
  quotation,
  settings,
  subtotal,
  itemDiscountAmt,
  discountAmt,
  totalMoneySaved,
  taxAmt,
  grandTotal
}) {
  return (
    <div className="avoid-break totals-block" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 20,
      marginTop: 12,
      paddingTop: 12,
      borderTop: '2px solid #f59e0b'
    }}>
      <div style={{ flex: 1, fontSize: 10.5, minWidth: 0 }}>
        {quotation.notes && (
          <div style={{ marginBottom: 8 }}>
            <div style={smallHeading}>Notes</div>
            <div style={{ color: '#374151', whiteSpace: 'pre-line' }}>{quotation.notes}</div>
          </div>
        )}

        {quotation.terms && (
          <div>
            <div style={smallHeading}>Terms & Conditions</div>
            <div className="avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <TermsFormatted text={quotation.terms} style={{ color: '#6b7280', fontSize: 9.5 }} />
            </div>
          </div>
        )}
      </div>

      <div style={{
        width: 230,
        maxWidth: '46%',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '12px 14px',
        flexShrink: 0,
        boxSizing: 'border-box'
      }}>
        <div style={{ fontSize: 10.5, color: '#6b7280' }}>
          {[
            { label: 'Subtotal', value: formatINR(subtotal) },
            itemDiscountAmt > 0 && { label: 'Item Discount', value: `- ${formatINR(itemDiscountAmt)}` },
            discountAmt > 0 && { label: 'Additional Discount', value: `- ${formatINR(discountAmt)}` },
            totalMoneySaved > 0 && { label: 'Total Money Saved', value: formatINR(totalMoneySaved), highlight: true },
            taxAmt > 0 && {
              label: `${settings?.tax_label || 'GST'} (${quotation.tax_rate || 18}%)`,
              value: formatINR(taxAmt)
            }
          ]
            .filter(Boolean)
            .map(row => (
              <div key={row.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: row.highlight ? 6 : 4,
                alignItems: 'center',
                paddingBottom: row.highlight ? 6 : 0,
                borderBottom: row.highlight ? '1px solid #d1d5db' : 'none',
                fontWeight: row.highlight ? 700 : 400,
                color: row.highlight ? '#059669' : '#6b7280'
              }}>
                <span>{row.label}</span>
                <span style={{ ...numStyle, textAlign: 'right' }}>{row.value}</span>
              </div>
            ))}
        </div>

        <div style={{ borderTop: '2px solid #d1d5db', paddingTop: 6, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 12.5, color: '#111827' }}>Grand Total</span>
            <span style={{ ...numStyle, fontWeight: 900, fontSize: 14, color: '#111827' }}>
              {formatINR(grandTotal)}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #d1d5db' }}>
          <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
            Amount In Words
          </div>
          <div style={{ marginTop: 3, fontSize: 10.5, lineHeight: 1.5, fontWeight: 600, color: '#111827' }}>
            {toWords.convert(Number(grandTotal || 0))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintView({ quotation, settings, onClose }) {
  const printRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#fff';
    return () => { document.body.style.background = prev; };
  }, []);

  if (!quotation) return null;

  const items = quotation.items ?? [];
  const colVis = settings?.columns_visible || {};

  const subtotal = items.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const itemDiscountAmt = items.reduce((s, r) => {
    const rate = Number(r.rate) || 0;
    const quantity = Number(r.quantity) || 0;
    const discount = Number(r.discount) || 0;
    return s + (rate * quantity * discount / 100);
  }, 0);
  const discountAmt = Number(quotation.discount) || 0;
  const totalMoneySaved = itemDiscountAmt + discountAmt;
  const taxAmt = Number(quotation.tax) || 0;
  const grandTotal = subtotal - discountAmt + taxAmt;

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      alert('Please allow popups to print or save PDF.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation ${quotation.quote_number || ''}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>${PRINT_STYLES}</style>
        </head>
        <body>
          <div class="print-document">${printContent}</div>
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 500);
            };
            window.onafterprint = function () { window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPdf = () => {
    const el = printRef.current;
    if (!el) return;

    el.classList.add('generating-pdf');

    const customer = (quotation.customer_name || 'Walk-in-Customer').trim().replace(/[\/\\?%*:|"<>]/g, '-');
    const quoteNo = (quotation.quote_number || 'PREVIEW').trim().replace(/[\/\\?%*:|"<>]/g, '-');
    const filename = `${customer}-Quotation-${quoteNo}.pdf`;

    html2pdf()
      .set({
        filename: filename,
        margin: [10, 12, 12, 12],
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          logging: false,
          scrollY: 0,
          windowWidth: 794
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.totals-block', '.print-header-block', '.customer-block'] }
      })
      .from(el)
      .save()
      .then(() => {
        el.classList.remove('generating-pdf');
      })
      .catch((err) => {
        console.error(err);
        el.classList.remove('generating-pdf');
      });
  };

  return (
    <>
      <style>{`
        ${PRINT_STYLES}
        ${SCREEN_TOOLBAR_STYLES}
        body { background: #e5e7eb; }

        /* Styles for clean A4 PDF generation */
        .generating-pdf {
          background: #ffffff !important;
          padding: 0 !important;
          margin: 0 !important;
          min-height: auto !important;
        }
        .generating-pdf .print-document-screen {
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
      `}</style>

      <div className="print-toolbar">
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#374151', fontWeight: 600, fontSize: 14
          }}
        >
          <ArrowLeft size={16} /> Back to Edit
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#f59e0b', color: '#fff', border: 'none',
              padding: '8px 18px', borderRadius: 8, fontWeight: 700,
              cursor: 'pointer', fontSize: 13
            }}
          >
            <Printer size={15} /> Print
          </button>

          <button
            onClick={handleDownloadPdf}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#111827', color: '#fff', border: 'none',
              padding: '8px 18px', borderRadius: 8, fontWeight: 700,
              cursor: 'pointer', fontSize: 13
            }}
          >
            <Download size={15} /> Save PDF
          </button>
        </div>
      </div>

      <div
        ref={printRef}
        className="screen-wrapper print-view-body"
        style={{ background: '#e5e7eb', padding: '16px', minHeight: 'calc(100vh - var(--header-h, 60px))' }}
      >
        <div className="print-document print-document-screen" style={{ background: '#fff' }}>
          <PageHeader quotation={quotation} settings={settings} />

          <div className="customer-block" style={{ marginBottom: 12 }}>
            <div style={smallHeading}>Quotation For:</div>
            <div style={{
              background: '#f9fafb',
              border: '1px solid #f3f4f6',
              borderRadius: 8,
              padding: '7px 12px'
            }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#111827' }}>
                {quotation.customer_name || 'Walk-in Customer'}
              </div>
              {quotation.customer_mobile && (
                <div style={{ color: '#6b7280', fontSize: 10.5, marginTop: 2 }}>
                  📞 {quotation.customer_mobile}
                </div>
              )}
              {(quotation.customer_city || quotation.customer_address) && (
                <div style={{ color: '#6b7280', fontSize: 10.5, marginTop: 2, whiteSpace: 'pre-line' }}>
                  {[quotation.customer_city, quotation.customer_address].filter(Boolean).join('\n')}
                </div>
              )}
            </div>
          </div>

          <ItemsTable items={items} colVis={colVis} />

          <TotalsBlock
            quotation={quotation}
            settings={settings}
            subtotal={subtotal}
            itemDiscountAmt={itemDiscountAmt}
            discountAmt={discountAmt}
            totalMoneySaved={totalMoneySaved}
            taxAmt={taxAmt}
            grandTotal={grandTotal}
          />

          <div
            className="print-footer"
            style={{
              marginTop: 16,
              paddingTop: 8,
              borderTop: '1px solid #e5e7eb',
              fontSize: 9.5,
              color: '#9ca3af',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <span>Generated by Ashok Vidyut Quotation Software</span>
            <span>{quotation.quote_number}</span>
          </div>
        </div>
      </div>
    </>
  );
}
