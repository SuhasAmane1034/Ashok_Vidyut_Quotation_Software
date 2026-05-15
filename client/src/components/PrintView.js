import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { API_BASE } from '../api/config';
import TermsFormatted from './TermsFormatted';

const ITEMS_PER_PAGE = 10;

function isPhoto(img) {
  return img && (img.startsWith('data:') || img.startsWith('http') || img.startsWith('/uploads'));
}

function ProductImg({ image, size = 58 }) {
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
      borderRadius: 8,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      border: '1px solid #e5e7eb'
    }}>
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.55) }}>💡</span>
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

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

const thStyle = {
  padding: '6px 4px',
  textAlign: 'center',
  fontWeight: 700,
  color: '#374151',
  verticalAlign: 'middle'
};

const tdStyle = {
  padding: '5px 4px',
  textAlign: 'center',
  color: '#374151',
  verticalAlign: 'middle'
};

const smallHeading = {
  fontSize: 9,
  fontWeight: 700,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  marginBottom: 5
};

function PageHeader({ quotation, settings, continued = false }) {
  const logo = settings?.company_logo;
  const logoSrc = logo
    ? logo.startsWith('data:') || logo.startsWith('http')
      ? logo
      : `${API_BASE}${logo}`
    : null;

  return (
    <div className="avoid-break" style={{ borderBottom: '3px solid #f59e0b', paddingBottom: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {logoSrc && !continued && (
            <img
              src={logoSrc}
              alt="Logo"
              style={{ height: 64, maxWidth: 140, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }}
            />
          )}

          <div>
            <div style={{
              fontSize: 22,
              fontWeight: 900,
              color: '#111827',
              letterSpacing: '-0.5px',
              textTransform: 'uppercase'
            }}>
              {quotation.company_name || settings?.company_name || 'YOUR COMPANY'}
            </div>

            {!continued && (
              <>
                {settings?.company_address && (
                  <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2, whiteSpace: 'pre-line' }}>
                    {settings.company_address}
                  </div>
                )}

                {settings?.company_phone && (
                  <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
                    📞 {settings.company_phone}
                  </div>
                )}
              </>
            )}

            {continued && (
              <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
                Continued from previous page…
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 16,
            fontWeight: 900,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: 3,
            marginBottom: 8
          }}>
            {continued ? 'Quotation (Cont.)' : 'Quotation'}
          </div>

          <table style={{ fontSize: 11, marginLeft: 'auto', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ color: '#374151', paddingRight: 10, fontWeight: 700 }}>Quote No:</td>
                <td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#111827', fontSize: 12 }}>
                  {quotation.quote_number}
                </td>
              </tr>

              <tr>
                <td style={{ color: '#374151', paddingRight: 10, fontWeight: 700 }}>Date:</td>
                <td style={{ fontWeight: 600, color: '#111827' }}>{formatDate(quotation.date)}</td>
              </tr>

              {quotation.validity_days && (
                <tr>
                  <td style={{ color: '#374151', paddingRight: 10, fontWeight: 700 }}>Valid Till:</td>
                  <td style={{ fontWeight: 600, color: '#111827' }}>
                    {formatDate(new Date(new Date(quotation.date).getTime() + Number(quotation.validity_days) * 86400000))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ItemsTable({ items, startIndex = 0, colVis = {} }) {
  const show = k => colVis[k] !== false;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
      <thead>
        <tr style={{
          borderTop: '2px solid #e5e7eb',
          borderBottom: '2px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          {show('sr_no') && <th style={{ ...thStyle, width: 28 }}>Sr.</th>}
          {show('product_image') && <th style={{ ...thStyle, width: 68 }}>Image</th>}
          <th style={{ ...thStyle, textAlign: 'left' }}>Product Name</th>
          {show('shape') && <th style={{ ...thStyle, width: 48 }}>Shape</th>}
          {show('color') && <th style={{ ...thStyle, width: 56 }}>Color</th>}
          {show('body_color') && <th style={{ ...thStyle, width: 58 }}>Body</th>}
          {show('warranty') && <th style={{ ...thStyle, width: 58 }}>Warr.</th>}
          <th style={{ ...thStyle, width: 36 }}>Qty</th>
          {show('unit') && <th style={{ ...thStyle, width: 38 }}>Unit</th>}
          <th style={{ ...thStyle, textAlign: 'right', width: 82 }}>Rate</th>
          {show('discount') && <th style={{ ...thStyle, textAlign: 'right', width: 44 }}>Disc.</th>}
          <th style={{ ...thStyle, textAlign: 'right', width: 92 }}>Amount</th>
        </tr>
      </thead>

      <tbody>
        {items.map((item, i) => (
          <tr
            key={i}
            className="avoid-break"
            style={{
              borderBottom: '1px solid #f3f4f6',
              background: i % 2 === 0 ? '#fff' : '#fafafa'
            }}
          >
            {show('sr_no') && <td style={tdStyle}>{startIndex + i + 1}</td>}

            {show('product_image') && (
              <td style={tdStyle}>
                <ProductImg image={item.product_image} />
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

            <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
              {formatINR(item.rate)}
            </td>

            {show('discount') && (
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                {item.discount > 0 ? `${item.discount}%` : '—'}
              </td>
            )}

            <td style={{
              ...tdStyle,
              textAlign: 'right',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#111827'
            }}>
              {formatINR(item.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PrintView({ quotation, settings, onClose }) {
  const printRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#fff';

    return () => {
      document.body.style.background = prev;
    };
  }, []);

  if (!quotation) return null;

  const items = quotation.items ?? [];
  const colVis = settings?.columns_visible || {};

  const pages = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }

  if (pages.length === 0) pages.push([]);

  const signatureRaw = settings?.signature;
  const signatureSrc = signatureRaw
    ? signatureRaw.startsWith('data:') || signatureRaw.startsWith('http')
      ? signatureRaw
      : `${API_BASE}${signatureRaw}`
    : null;

  const subtotal = items.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const discountAmt = Number(quotation.discount) || 0;
  const afterDisc = subtotal - discountAmt;
  const taxAmt = Number(quotation.tax) || 0;
  const grandTotal = afterDisc + taxAmt;

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
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .screen-wrapper {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            .print-page {
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 12px !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              overflow: visible !important;
              page-break-after: always;
              break-after: page;
            }

            .print-page:last-child {
              page-break-after: auto;
              break-after: auto;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }

            thead {
              display: table-header-group;
            }

            tbody {
              display: table-row-group;
            }

            tr,
            .avoid-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            img {
              max-width: 100%;
            }

            button,
            .no-print {
              display: none !important;
            }

            @media print {
              .print-page {
                page-break-after: always;
                break-after: page;
              }

              .print-page:last-child {
                page-break-after: auto;
                break-after: auto;
              }
            }
          </style>
        </head>

        <body>
          ${printContent}

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 700);
            };

            window.onafterprint = function () {
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const TotalsBlock = () => (
    <div className="avoid-break" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 24,
      marginTop: 16
    }}>
      <div style={{ flex: 1, fontSize: 11 }}>
        {quotation.notes && (
          <div style={{ marginBottom: 10 }}>
            <div style={smallHeading}>Notes</div>
            <div style={{ color: '#374151', whiteSpace: 'pre-line' }}>
              {quotation.notes}
            </div>
          </div>
        )}

        {quotation.terms && (
          <div style={{ marginBottom: 10 }}>
            <div style={smallHeading}>Terms & Conditions</div>
            <TermsFormatted
              text={quotation.terms}
              style={{ color: '#6b7280', fontSize: 10 }}
            />
          </div>
        )}

        <div style={{ marginTop: 32, width: 180, textAlign: 'center' }}>
          {signatureSrc ? (
            <img
              src={signatureSrc}
              alt="Signature"
              style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain', marginBottom: 4 }}
            />
          ) : (
            <div style={{ height: 40 }} />
          )}

          <div style={{ borderBottom: '1px solid #9ca3af', marginBottom: 4 }} />
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
            Authorized Signature
          </div>
        </div>
      </div>

      <div style={{
        width: 240,
        maxWidth: '48%',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '14px 16px',
        flexShrink: 0,
        boxSizing: 'border-box'
      }}>
        <div style={{ fontSize: 11, color: '#6b7280' }}>
          {[
            { label: 'Subtotal', value: formatINR(subtotal) },
            discountAmt > 0 && { label: 'Discount', value: `- ${formatINR(discountAmt)}` },
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
                marginBottom: 5,
                alignItems: 'center'
              }}>
                <span>{row.label}</span>
                <span style={{ fontFamily: 'monospace', textAlign: 'right' }}>
                  {row.value}
                </span>
              </div>
            ))}
        </div>

        <div style={{ borderTop: '2px solid #d1d5db', paddingTop: 8, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#111827' }}>
              Grand Total
            </span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: '#111827' }}>
              {formatINR(grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }

          html,
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .screen-wrapper {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-page {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 12px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
          }

          .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }

          thead {
            display: table-header-group !important;
          }

          tbody {
            display: table-row-group !important;
          }

          tr,
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          img {
            max-width: 100% !important;
          }
        }

        body {
          background: #e5e7eb;
        }
      `}</style>

      <div className="no-print" style={{
        position: 'sticky',
        top: 0,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
        boxShadow: '0 1px 6px rgba(0,0,0,0.08)'
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#374151',
            fontWeight: 600,
            fontSize: 14
          }}
        >
          <ArrowLeft size={16} /> Back to Edit
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} · {pages.length} page{pages.length !== 1 ? 's' : ''}
          </span>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f59e0b',
              color: '#fff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <Printer size={15} /> Print
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#111827',
              color: '#fff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <Download size={15} /> Save PDF
          </button>
        </div>
      </div>

      <div
        ref={printRef}
        className="screen-wrapper"
        style={{
          background: '#e5e7eb',
          padding: '24px 16px',
          minHeight: 'calc(100vh - 56px)'
        }}
      >
        {pages.map((pageItems, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === pages.length - 1;

          return (
            <div
              key={pageIndex}
              className="print-page"
              style={{
                background: '#fff',
                width: '100%',
                maxWidth: 794,
                minHeight: 1123,
                margin: '0 auto 24px',
                padding: '32px 36px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                borderRadius: 4,
                boxSizing: 'border-box',
                overflow: 'visible'
              }}
            >
              <PageHeader
                quotation={quotation}
                settings={settings}
                continued={!isFirstPage}
              />

              {isFirstPage && (
                <div className="avoid-break" style={{ marginBottom: 14 }}>
                  <div style={smallHeading}>Quotation For:</div>

                  <div style={{
                    background: '#f9fafb',
                    border: '1px solid #f3f4f6',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>
                        {quotation.customer_name || 'Walk-in Customer'}
                      </div>

                      {quotation.customer_mobile && (
                        <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
                          📞 {quotation.customer_mobile}
                        </div>
                      )}

                      {quotation.customer_address && (
                        <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2, whiteSpace: 'pre-line' }}>
                          {quotation.customer_address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <ItemsTable
                items={pageItems}
                startIndex={pageIndex * ITEMS_PER_PAGE}
                colVis={colVis}
              />

              {isLastPage && (
                <div className="avoid-break" style={{ marginTop: 16 }}>
                  <div style={{ borderTop: '2px solid #f59e0b', marginBottom: 16 }} />
                  <TotalsBlock />
                </div>
              )}

              <div className="avoid-break" style={{
                marginTop: 28,
                paddingTop: 10,
                borderTop: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 9,
                color: '#d1d5db'
              }}>
                <span>QuoteFlow</span>
                <span>
                  Page {pageIndex + 1} of {pages.length}
                  {!isLastPage ? ' — Continued on next page…' : ` · ${quotation.quote_number}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}