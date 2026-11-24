// src/Components/Verify/VerifyPage.jsx
// PUBLIC page opened when someone scans a QR code: /verify/:coaId and /verify/:coaId/:bagId
// Mobile-first, no dashboard, no login.

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../css/verify.css';

const API = import.meta.env.VITE_API_URL || '';

const PARAMS = [
  ['gelThickness', 'Gel Thickness'],
  ['impurity', 'Impurity %'],
  ['rotation', 'Specific Rotation'],
  ['colour', 'Colour'],
  ['moisture', 'Moisture %'],
  ['diameter', 'Diameter (mm)'],
  ['ringTest', 'Ring Test'],
];

const THEME = {
  'Valid':       { bg: '#d1fae5', fg: '#065f46', icon: '✓', title: 'Authentic',
                   text: 'This product is covered by a genuine Certificate of Analysis.' },
  'Invalid Bag': { bg: '#fee2e2', fg: '#991b1b', icon: '✕', title: 'Not recognised',
                   text: 'This bag code does not belong to this certificate. Do not trust this product.' },
  'Unknown COA': { bg: '#fee2e2', fg: '#991b1b', icon: '✕', title: 'Certificate not found',
                   text: 'No certificate with this number exists in our records.' },
  'Recalled':    { bg: '#fef3c7', fg: '#92400e', icon: '!', title: 'Recalled',
                   text: 'This batch has been recalled. Do not use or ship it.' },
};

const styles = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: '1rem', fontFamily: 'system-ui, sans-serif', color: '#111827' },
  card: { maxWidth: 520, margin: '0 auto', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  detail: { padding: '1rem 1.25rem' },
  row: { display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.45rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.95rem' },
  label: { color: '#6b7280' },
  h4: { margin: '1rem 0 0.25rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280' },
  link: { display: 'block', textAlign: 'center', margin: '1rem 1.25rem 1.25rem', padding: '0.8rem', borderRadius: 10, background: '#111827', color: '#fff', textDecoration: 'none', fontWeight: 600 },
};

const VerifyPage = () => {
  const { coaId, bagId } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const firedFor = useRef(null); // one request (= one logged scan) per page load, even in React StrictMode

  useEffect(() => {
    const key = `${coaId}/${bagId || ''}`;
    if (firedFor.current === key) return;
    firedFor.current = key;

    const url = `${API}/api/verify/${encodeURIComponent(coaId)}${bagId ? `/${encodeURIComponent(bagId)}` : ''}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Verification server error');
        return res.json();
      })
      .then((data) => setState({ loading: false, data, error: null }))
      .catch(() => setState({
        loading: false,
        data: null,
        error: 'Could not reach the verification server. Check your connection and scan again.',
      }));
  }, [coaId, bagId]);

  if (state.loading) {
    return <div style={styles.page}><div style={{ ...styles.card, padding: '2rem', textAlign: 'center' }}>Verifying…</div></div>;
  }

  if (state.error) {
    return <div style={styles.page}><div style={{ ...styles.card, padding: '2rem', textAlign: 'center' }}>{state.error}</div></div>;
  }

  const d = state.data;
  const theme = THEME[d.result] || THEME['Unknown COA'];

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Result banner */}
        <div style={{ background: theme.bg, color: theme.fg, padding: '1.5rem 1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', lineHeight: 1 }}>{theme.icon}</div>
          <h2 style={{ margin: '0.4rem 0 0.25rem' }}>{theme.title}</h2>
          <p style={{ margin: 0 }}>{theme.text}</p>
        </div>

        <div style={styles.detail}>
          <div style={styles.row}><span style={styles.label}>Certificate</span><strong>{d.coaId}</strong></div>
          {d.bagId && <div style={styles.row}><span style={styles.label}>Bag</span><strong>{d.bagId}</strong></div>}

          {d.result === 'Valid' && (
            <>
              <div style={styles.row}><span style={styles.label}>Product</span><strong>{d.product}</strong></div>
              <div style={styles.row}><span style={styles.label}>Origin</span><strong>{d.origin}</strong></div>
              <div style={styles.row}><span style={styles.label}>Batch / Lot</span><strong>{d.batchNo} / {d.lotNo}</strong></div>
              <div style={styles.row}><span style={styles.label}>Verdict</span><strong>{d.verdict}</strong></div>
              {d.issuedAt && (
                <div style={styles.row}><span style={styles.label}>Issued</span><strong>{new Date(d.issuedAt).toLocaleDateString()}</strong></div>
              )}
              <div style={styles.row}>
                <span style={styles.label}>Digital signature</span>
                <strong style={{ color: d.signatureValid === false ? '#991b1b' : d.signatureValid ? '#065f46' : '#6b7280' }}>
                  {d.signatureValid === true ? 'Valid' : d.signatureValid === false ? 'Does not match' : 'Not checked'}
                </strong>
              </div>

              <h4 style={styles.h4}>Test results</h4>
              {PARAMS.map(([key, label]) => (
                <div key={key} style={styles.row}>
                  <span style={styles.label}>{label}</span><strong>{d.measurements?.[key] || '—'}</strong>
                </div>
              ))}
            </>
          )}
        </div>

        {d.result === 'Valid' && d.pdfUrl && (
          <a href={d.pdfUrl} target="_blank" rel="noreferrer" style={styles.link}>View full certificate (PDF)</a>
        )}
      </div>
    </div>
  );
};

export default VerifyPage;