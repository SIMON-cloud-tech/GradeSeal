// src/Components/Dashboard/jsx/PrintQueueDetailPage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPrinter, FiCheckCircle, FiFileText, FiTag, FiDownload } from 'react-icons/fi';
import '../css/PrintQueueDetailPage.css';

const COA_API = 'http://localhost:5000/api/coas';
const BATCH_API = 'http://localhost:5000/api/batches';

const PARAMS = [
  ['gelThickness', 'Gel Thickness'],
  ['impurity', 'Impurity %'],
  ['rotation', 'Specific Rotation'],
  ['colour', 'Colour'],
  ['moisture', 'Moisture %'],
  ['diameter', 'Diameter (mm)'],
  ['ringTest', 'Ring Test'],
];

// limits are either a string (exact match) or { min, max }
const formatLimit = (l) => {
  if (l === undefined || l === null || l === '') return '—';
  if (typeof l === 'object') {
    const min = l.min ?? '';
    const max = l.max ?? '';
    if (min === '' && max === '') return '—';
    if (min !== '' && max !== '') return `${min} – ${max}`;
    return min !== '' ? `≥ ${min}` : `≤ ${max}`;
  }
  return String(l);
};

const readError = async (res, fallback) => {
  try { return (await res.json()).message || fallback; } catch { return fallback; }
};

const secondaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
  padding: '0.55rem 0.9rem', borderRadius: '8px', cursor: 'pointer',
  background: '#fff', border: '1px solid #d1d5db', fontWeight: 600, textDecoration: 'none', color: 'inherit',
};

const PrintQueueDetailPage = () => {
  const { coaId } = useParams(); // despite the name, this is the batch's MongoDB _id
  const navigate = useNavigate();

  const [data, setData] = useState(null);       // certificate details
  const [manifest, setManifest] = useState(null); // what will be printed (identifiers only)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resCoa, resManifest] = await Promise.all([
          fetch(`${COA_API}/${coaId}`),
          fetch(`${BATCH_API}/${coaId}/manifest`),
        ]);
        if (!resCoa.ok) throw new Error(await readError(resCoa, 'Failed to fetch COA details'));
        if (!resManifest.ok) throw new Error(await readError(resManifest, 'Failed to fetch print manifest'));

        const [coaJson, manifestJson] = await Promise.all([resCoa.json(), resManifest.json()]);
        if (cancelled) return;
        setData(coaJson);
        setManifest(manifestJson);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [coaId]);

  // Opens the label sheet (generated on the server, not stored). The user prints from the PDF viewer.
  const handleOpenLabels = () => {
    window.open(`${BATCH_API}/${coaId}/labels`, '_blank');
  };

  const handleMarkPrinted = async () => {
    if (!window.confirm('Confirm that the labels were printed?')) return;
    setMarking(true);
    try {
      const res = await fetch(`${BATCH_API}/${coaId}/printed`, { method: 'PATCH' });
      if (!res.ok) throw new Error(await readError(res, 'Failed to mark as printed'));
      setData((prev) => ({ ...prev, status: 'Printed', lastPrintedAt: new Date().toISOString() }));
    } catch (err) {
      alert(err.message);
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <div className="pq-detail-container">Loading COA...</div>;
  if (error || !data || !manifest) {
    return (
      <div className="pq-detail-container">
        <button className="pq-back-btn" onClick={() => navigate('/dashboard/print-queue')}>
          <FiArrowLeft /> Back
        </button>
        <p>Error: {error || 'COA not found'}</p>
      </div>
    );
  }

  const isPrinted = data.status === 'Printed';

  return (
    <div className="pq-detail-container">

      {/* Header */}
      <div className="pq-detail-header">
        <div className="pq-detail-title-area">
          <button className="pq-back-btn" onClick={() => navigate('/dashboard/print-queue')}>
            <FiArrowLeft /> Back
          </button>
          <div>
            <h2>{data.coaId}</h2>
            <p>Batch {data.batch?.batchNo} · {data.batch?.client || 'No client'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {data.coaPdfUrl && (
            <a href={data.coaPdfUrl} target="_blank" rel="noreferrer" style={secondaryBtn}>
              <FiDownload /> COA PDF
            </a>
          )}
          <button className="pq-btn-print" onClick={handleOpenLabels}>
            <FiPrinter size={18} /> Open Label Sheet ({manifest.total} labels)
          </button>
          <button
            type="button"
            style={{ ...secondaryBtn, opacity: marking ? 0.6 : 1 }}
            onClick={handleMarkPrinted}
            disabled={marking}
          >
            <FiCheckCircle /> {isPrinted ? 'Mark as printed again' : 'Mark as printed'}
          </button>
        </div>
      </div>

      {manifest.localUrlWarning && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', margin: '0.75rem 0' }}>
          These QR codes point to <strong>{manifest.verifyBaseUrl}</strong>, which only works on the computer running the app.
          Set PUBLIC_URL to your real domain before approving batches you intend to ship.
        </div>
      )}

      {/* Main Content Split */}
      <div className="pq-detail-layout">

        {/* Left Column: The COA Document Preview */}
        <div className="pq-detail-col-left">
          <div className="pq-section-title">Certificate of Analysis (COA)</div>

          <div className="pq-coa-preview">
            <div className="pq-coa-preview-header">
              <h3>Certificate of Analysis</h3>
              <span className="pq-verified-badge">
                <FiCheckCircle /> {isPrinted ? 'Printed' : 'Ready to print'}
              </span>
            </div>
            <p className="pq-coa-meta">
              {data.productName} · {data.origin} · Lot {data.batch?.lotNo}
            </p>
            <p className="pq-coa-meta">Sampled Bag: <strong>{data.sampledBagId}</strong></p>
            {data.issuedAt && (
              <p className="pq-coa-meta">Issued: {new Date(data.issuedAt).toLocaleString()}</p>
            )}
            {data.lastPrintedAt && (
              <p className="pq-coa-meta">Last printed: {new Date(data.lastPrintedAt).toLocaleString()}</p>
            )}

            <table className="pq-coa-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Result</th>
                  <th>Client Limit</th>
                  <th>{data.standardName || 'Standard'} Limit</th>
                </tr>
              </thead>
              <tbody>
                {PARAMS.map(([key, label]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{data.measurements?.[key] || '—'}</td>
                    <td>{formatLimit(data.clientLimits?.[key])}</td>
                    <td>{formatLimit(data.standardLimits?.[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pq-coa-comments">
              <strong>Visual Comments:</strong> "{data.comments || 'None'}"
            </div>
          </div>
        </div>

        {/* Right Column: The Manifest Table */}
        <div className="pq-detail-col-right">
          <div className="pq-section-title">Print Manifest ({manifest.total} items)</div>

          <div className="pq-manifest-wrapper" style={{ maxHeight: '520px', overflowY: 'auto' }}>
            <table className="pq-manifest-table">
              <thead>
                <tr><th>Type</th><th>Identifier</th></tr>
              </thead>
              <tbody>
                {manifest.items.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className={item.type === 'COA' ? 'pq-row-coa' : undefined}>
                    <td>
                      {item.type === 'COA' ? (
                        <span className="pq-type-badge pq-badge-coa"><FiFileText /> COA</span>
                      ) : (
                        <span className="pq-type-badge pq-badge-bag"><FiTag /> Bag</span>
                      )}
                    </td>
                    <td>{item.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
            The sampled bag ({data.sampledBagId}) gets no label. QR images are generated when you open the label sheet and are not stored.
          </p>
        </div>

      </div>
    </div>
  );
};

export default PrintQueueDetailPage;