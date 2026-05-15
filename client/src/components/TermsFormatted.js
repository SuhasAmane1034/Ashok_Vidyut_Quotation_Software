import React from 'react';

/** Shown on quotes / print — matches Settings helper text */
const HIGHLIGHT = { color: '#b91c1c', fontWeight: 700 };

function segmentLine(line, lineKey) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const wrapped = part.match(/^\*\*(.+)\*\*$/);
    if (wrapped) {
      return (
        <span key={`${lineKey}-${i}`} style={HIGHLIGHT}>
          {wrapped[1]}
        </span>
      );
    }
    const letters = part.replace(/[^a-zA-Z]/g, '');
    const allCaps =
      letters.length > 0 &&
      part === part.toUpperCase() &&
      /[A-Z]/.test(part);
    if (allCaps) {
      return (
        <span key={`${lineKey}-${i}`} style={HIGHLIGHT}>
          {part}
        </span>
      );
    }
    return <span key={`${lineKey}-${i}`}>{part}</span>;
  });
}

/**
 * Renders default terms / quotation terms with red bold for:
 * - Entire segments in ALL CAPS (with at least one A–Z letter)
 * - Segments wrapped in **double asterisks** (markdown-style bold)
 */
export default function TermsFormatted({ text, style, className }) {
  if (text == null || String(text).trim() === '') return null;
  const lines = String(text).split('\n');
  return (
    <div style={{ whiteSpace: 'pre-line', lineHeight: 1.5, ...style }} className={className}>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 ? '\n' : null}
          {segmentLine(line, idx)}
        </React.Fragment>
      ))}
    </div>
  );
}
