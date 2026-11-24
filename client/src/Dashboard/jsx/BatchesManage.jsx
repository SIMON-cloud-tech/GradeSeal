// src/Components/Dashboard/jsx/BatchesManage.jsx

import { useState, useEffect, useCallback, useMemo, memo, useReducer, useRef } from 'react';
import { FiPlus, FiX, FiChevronLeft, FiChevronRight, FiSearch, FiCheckCircle } from 'react-icons/fi';
import SampleModal from './SampleModal.jsx';
import '../css/BatchesManage.css';

const BATCH_API = 'http://localhost:5000/api/batches';
const SPEC_API = 'http://localhost:5000/api/specifications';

const INITIAL_FORM = {
  productName: '', palletNumber: '', startingBagId: '', batchNo: '', lotNo: '', origin: '', numberOfBags: '', comments: '',
  clientSpecId: '', standardId: ''
};

const FORM_FIELDS = [
  { name: 'productName',   label: 'Product Name',              type: 'text',     required: true },
  { name: 'palletNumber',  label: 'Pallet Number',             type: 'text',     required: true },
  { name: 'startingBagId', label: 'Starting Bag ID',           type: 'text',     required: true },
  { name: 'batchNo',       label: 'Batch No',                  type: 'text',     required: true },
  { name: 'lotNo',         label: 'Lot No',                    type: 'text',     required: true },
  { name: 'origin',        label: 'Origin / Supplier County',  type: 'text',     required: true },
  { name: 'numberOfBags',  label: 'Number of Bags',            type: 'number',   required: true },
  { name: 'clientSpecId',  label: 'Client Specification',      type: 'select',   required: true },
  { name: 'standardId',    label: 'Government Standard',       type: 'select',   required: true },
  { name: 'comments',      label: 'Comments',                  type: 'textarea', rows: 3 },
];

const ROWS_PER_PAGE = 10;

// Read a JSON error message without crashing if the body isn't JSON
const readError = async (res, fallback) => {
  try {
    const body = await res.json();
    return body.message || fallback;
  } catch {
    return fallback;
  }
};

// ── Reducers ──
const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.field]: action.value };
    case 'RESET':     return INITIAL_FORM;
    default:          return state;
  }
};

const stateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_BATCHES':        return { ...state, batches: action.payload };
    case 'SET_CLIENTS':        return { ...state, clients: action.payload };
    case 'SET_STANDARDS':      return { ...state, standards: action.payload };
    case 'SET_LOADING':        return { ...state, loading: action.payload };
    case 'SET_SHOW_FORM':      return { ...state, showForm: action.payload };
    case 'SET_SEARCH':         return { ...state, search: action.payload, page: 1 };
    case 'SET_PAGE':           return { ...state, page: action.payload };
    case 'RESET_FORM_STATE':   return { ...state, showForm: false };
    default:                   return state;
  }
};

// ── Batch Row ──
const BatchRow = memo(({ batch, busy, onSample, onApprove, onViewCoa }) => (
  <tr className="batch-row">
    <td>{batch.batchNo}</td>
    <td>{batch.lotNo}</td>
    <td>{batch.productName}</td>
    <td>{batch.origin}</td>
    <td>{batch.clientSpecId?.client || 'N/A'}</td>
    <td>
      <span className={`qc-pill qc-${batch.qcStatus?.toLowerCase().replace(/\s+/g, '-')}`}>
        {batch.qcStatus}
      </span>
    </td>
    <td>
      <div className="row-actions">
        {batch.qcStatus === 'Awaiting Sample' && (
          <button className="sample-btn" type="button" disabled={busy} onClick={() => onSample(batch)}>
            {busy ? 'Drawing bag...' : 'Sample'}
          </button>
        )}
        {batch.qcStatus === 'Pending Approval' && (
          <button className="approve-btn" type="button" disabled={busy} onClick={() => onApprove(batch)}>
            <FiCheckCircle /> {busy ? 'Approving...' : 'Approve'}
          </button>
        )}
        {batch.qcStatus === 'Approved' && (
          <button
            className="view-coa-btn"
            type="button"
            disabled={!batch.coaDetails?.pdfUrl}
            onClick={() => onViewCoa(batch)}
          >
            View COA
          </button>
        )}
      </div>
    </td>
  </tr>
));
BatchRow.displayName = 'BatchRow';

// ── Main Component ──
const BatchesManage = () => {
  const [state, dispatch] = useReducer(stateReducer, {
    batches: [], clients: [], standards: [], loading: true, showForm: false, search: '', page: 1,
  });

  const [formData, formDispatch] = useReducer(formReducer, INITIAL_FORM);
  const [selectedBatchForSample, setSelectedBatchForSample] = useState(null);
  const [busyBatchId, setBusyBatchId] = useState(null); // blocks double-clicks on Sample / Approve

  // Ignore responses from older requests (fast typing can return them out of order)
  const latestRequest = useRef(0);

  // ── API: Fetch Batches ──
  const fetchBatches = useCallback(async (searchQuery = '') => {
    const requestId = ++latestRequest.current;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${BATCH_API}?search=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Failed to fetch batches');
      const data = await res.json();
      if (requestId !== latestRequest.current) return; // a newer request is in flight
      dispatch({ type: 'SET_BATCHES', payload: data });
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      console.error('Failed to connect to backend:', err);
      dispatch({ type: 'SET_BATCHES', payload: [] });
    } finally {
      if (requestId === latestRequest.current) dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // ── API: Fetch Specs for dropdowns ──
  const fetchSpecs = useCallback(async () => {
    try {
      const [resClients, resStandards] = await Promise.all([
        fetch(`${SPEC_API}?type=client`),
        fetch(`${SPEC_API}?type=government`)
      ]);
      if (resClients.ok) dispatch({ type: 'SET_CLIENTS', payload: await resClients.json() });
      if (resStandards.ok) dispatch({ type: 'SET_STANDARDS', payload: await resStandards.json() });
    } catch (err) {
      console.error('Failed to fetch specs:', err);
    }
  }, []);

  useEffect(() => { fetchSpecs(); }, [fetchSpecs]);

  // Debounced fetch: runs on first load (search = '') and after the user stops typing
  useEffect(() => {
    const delay = state.search ? 300 : 0;
    const t = setTimeout(() => fetchBatches(state.search), delay);
    return () => clearTimeout(t);
  }, [state.search, fetchBatches]);

  // ── API: Create Batch ──
  const submitBatch = async (batchData) => {
    try {
      const res = await fetch(BATCH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData),
      });
      if (!res.ok) throw new Error(await readError(res, 'Failed to create batch'));
      await fetchBatches(state.search);
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  };

  // ── API: Draw the random bag, then open the modal ──
  // The server picks the bag from startingBagId + numberOfBags and saves it,
  // so closing and reopening the modal always shows the same bag.
  const handleOpenSampleModal = useCallback(async (batch) => {
    if (busyBatchId) return;
    setBusyBatchId(batch._id);
    try {
      const res = await fetch(`${BATCH_API}/${batch._id}/assign-sample`, { method: 'POST' });
      if (!res.ok) throw new Error(await readError(res, 'Could not draw a bag for sampling'));
      const batchWithBag = await res.json(); // includes sampledBagId + populated spec limits
      setSelectedBatchForSample(batchWithBag);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyBatchId(null);
    }
  }, [busyBatchId]);

  const handleCloseSampleModal = useCallback(() => setSelectedBatchForSample(null), []);

  const handleSaveSample = useCallback(async () => {
    await fetchBatches(state.search);
    handleCloseSampleModal();
  }, [state.search, fetchBatches, handleCloseSampleModal]);

  // ── API: Approve Batch ──
  const handleApprove = useCallback(async (batch) => {
    if (busyBatchId) return;
    setBusyBatchId(batch._id);
    try {
      const res = await fetch(`${BATCH_API}/${batch._id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error(await readError(res, 'Failed to approve batch'));
      await fetchBatches(state.search);
    } catch (err) {
      console.error('Failed to approve:', err);
      alert(err.message);
    } finally {
      setBusyBatchId(null);
    }
  }, [busyBatchId, state.search, fetchBatches]);

  const handleViewCoa = useCallback((batch) => {
    const url = batch.coaDetails?.pdfUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  // Derived State
  const totalPages = Math.max(1, Math.ceil(state.batches.length / ROWS_PER_PAGE));
  const currentPage = Math.min(state.page, totalPages); // never sit on a page that no longer exists
  const pageRows = useMemo(
    () => state.batches.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE),
    [state.batches, currentPage]
  );

  // Handlers
  const handleSearch = useCallback((e) => {
    dispatch({ type: 'SET_SEARCH', payload: e.target.value }); // the debounced effect does the fetch
  }, []);

  const handlePrevPage = useCallback(() => dispatch({ type: 'SET_PAGE', payload: Math.max(1, currentPage - 1) }), [currentPage]);
  const handleNextPage = useCallback(() => dispatch({ type: 'SET_PAGE', payload: Math.min(totalPages, currentPage + 1) }), [currentPage, totalPages]);

  const handleOpenForm = useCallback(() => dispatch({ type: 'SET_SHOW_FORM', payload: true }), []);
  const handleCancel = useCallback(() => { dispatch({ type: 'RESET_FORM_STATE' }); formDispatch({ type: 'RESET' }); }, []);
  const handleChange = useCallback((e) => formDispatch({ type: 'SET_FIELD', field: e.target.name, value: e.target.value }), []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const success = await submitBatch(formData);
    if (success) handleCancel();
  }, [formData, handleCancel, state.search]);

  return (
    <div className="batches-manage">
      {/* ── Card A: Header ── */}
      <div className="batches-header-card">
        <h2 className="batches-title">Batches</h2>
        <button className="new-batch-btn" onClick={handleOpenForm}><FiPlus /> New Batch</button>
      </div>

      {/* ── Card B: Batches Table ── */}
      <div className="batches-recents-card">
        <h3 className="recents-title">Recent Batches</h3>
        <div className="search-wrapper">
          <FiSearch className="search-icon" />
          <input type="text" className="search-input" placeholder="Search batches..." value={state.search} onChange={handleSearch} />
        </div>
        <div className="table-wrapper">
          <table className="batches-table">
            <thead><tr><th>Batch ID</th><th>Lot ID</th><th>Product Name</th><th>Origin</th><th>Client</th><th>QC Status</th><th>Action</th></tr></thead>
            <tbody>
              {pageRows.length ? pageRows.map(batch => (
                <BatchRow
                  key={batch._id}
                  batch={batch}
                  busy={busyBatchId === batch._id}
                  onSample={handleOpenSampleModal}
                  onApprove={handleApprove}
                  onViewCoa={handleViewCoa}
                />
              )) : (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {state.loading
                      ? 'Loading batches...'
                      : 'No batches found. Click "New Batch" to add one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button className="page-btn" onClick={handlePrevPage} disabled={currentPage === 1}><FiChevronLeft /></button>
          <span className="page-indicator">Page {currentPage} of {totalPages}</span>
          <button className="page-btn" onClick={handleNextPage} disabled={currentPage === totalPages}><FiChevronRight /></button>
        </div>
      </div>

      {/* ── New Batch Modal ── */}
      {state.showForm && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Batch</h3>
              <button type="button" className="close-modal" onClick={handleCancel}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>

              {/* ── SCROLLABLE BODY (2-Column Grid) ── */}
              <div className="modal-body-scroll">
                <div className="form-grid">
                  {FORM_FIELDS.map(field => {
                    if (field.type === 'select') {
                      const options = field.name === 'clientSpecId' ? state.clients : state.standards;
                      return (
                        <div key={field.name} className="form-group">
                          <label>{field.label}</label>
                          <select name={field.name} value={formData[field.name]} onChange={handleChange} required={field.required}>
                            <option value="">-- Select --</option>
                            {options.map(opt => (
                              <option key={opt._id} value={opt._id}>
                                {field.name === 'clientSpecId'
                                  ? `${opt.client} (${opt.product})`
                                  : `${opt.authority} - ${opt.region}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    if (field.type === 'textarea') {
                      return (
                        <div key={field.name} className="form-group full-width">
                          <label>{field.label}</label>
                          <textarea name={field.name} value={formData[field.name] || ''} onChange={handleChange} rows={field.rows || 3} required={field.required} />
                        </div>
                      );
                    }

                    return (
                      <div key={field.name} className="form-group">
                        <label>{field.label}</label>
                        <input
                          type={field.type}
                          name={field.name}
                          value={formData[field.name] || ''}
                          onChange={handleChange}
                          required={field.required}
                          min={field.type === 'number' ? 1 : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── FIXED FOOTER ── */}
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCancel}>Cancel</button>
                <button type="submit" className="save-btn">Save Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sample Modal ── */}
      {selectedBatchForSample && (
        <SampleModal
          batch={selectedBatchForSample}
          onClose={handleCloseSampleModal}
          onSave={handleSaveSample}
        />
      )}
    </div>
  );
};

export default BatchesManage;