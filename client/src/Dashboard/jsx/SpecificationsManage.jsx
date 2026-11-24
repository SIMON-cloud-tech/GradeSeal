// src/Components/Dashboard/jsx/SpecificationsManage.jsx

import { useState, useEffect, useCallback, useMemo, memo, useReducer } from 'react';
import { FiPlus, FiX, FiEdit, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import '../css/SpecificationsManage.css';

const API_URL = 'http://localhost:5000/api/specifications';

// ── Constants ──
const ROWS_PER_PAGE = 10;

const GEL_OPTIONS = ['', '+++', '++', '+'];
const GEL_LABEL = { '+++': 'Thick (+++)', '++': 'Medium (++)', '+': 'Thin (+)', '': 'Not specified' };
const RING_OPTIONS = ['', 'Pass', 'Fail'];

const PARAM_FIELDS = [
  { key: 'gelThickness', label: 'Gel Thickness', kind: 'enum',   options: GEL_OPTIONS },
  { key: 'impurity',     label: 'Impurity %',    kind: 'range',  unit: '%'  },
  { key: 'rotation',     label: 'Specific Rotation', kind: 'range', unit: '°' },
  { key: 'colour',       label: 'Colour',        kind: 'text' },
  { key: 'moisture',     label: 'Moisture %',    kind: 'range',  unit: '%'  },
  { key: 'diameter',     label: 'Diameter',      kind: 'range',  unit: 'mm' },
  { key: 'ringTest',     label: 'Ring Test',     kind: 'enum',   options: RING_OPTIONS },
];

const blankSpec = () => ({
  gelThickness: '',
  impurity:  { min: '', max: '' },
  rotation:  { min: '', max: '' },
  colour:    '',
  moisture:  { min: '', max: '' },
  diameter:  { min: '', max: '' },
  ringTest:  '',
});

const INITIAL_GOV_FORM = { type: 'government', authority: '', region: '', product: '', limits: blankSpec() };
const INITIAL_CLIENT_FORM = { type: 'client', client: '', product: '', limits: blankSpec() };

// ── State Reducer ──
const stateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_STANDARDS':     return { ...state, standards: action.payload };
    case 'SET_CLIENT_SPECS':  return { ...state, clientSpecs: action.payload };
    case 'SET_LOADING':       return { ...state, loading: action.payload };
    case 'SET_TAB':           return { ...state, tab: action.payload, page: 1, search: '' };
    case 'SET_SEARCH':        return { ...state, search: action.payload, page: 1 };
    case 'SET_PAGE':          return { ...state, page: action.payload };
    case 'SET_MODAL':         return { ...state, modal: action.payload };
    case 'SET_CONFIRM_DELETE':return { ...state, confirmDeleteId: action.payload };
    default:                  return state;
  }
};

// ── Form Reducer ──
const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_TOP':   
      return { ...state, [action.field]: action.value };
    case 'SET_PARAM': 
      return { ...state, limits: { ...state.limits, [action.field]: action.value } };
    case 'SET_RANGE': 
      return {
        ...state,
        limits: { ...state.limits, [action.field]: { ...state.limits[action.field], [action.bound]: action.value } },
      };
    case 'LOAD':      
      return action.payload;
    case 'RESET':     
      return action.payload;
    default:          
      return state;
  }
};

// ── Row Components ──
const StandardRow = memo(({ row, onEdit, onDelete, confirmDeleteId }) => (
  <tr className="spec-row">
    <td>{row.authority}</td>
    <td>{row.region}</td>
    <td>{row.product}</td>
    <td>
      <div className="row-actions">
        <button className="edit-btn" onClick={() => onEdit(row)} type="button"><FiEdit /> Edit</button>
        <button className="delete-btn" onClick={() => onDelete(row._id)} type="button">
          <FiTrash2 /> {confirmDeleteId === row._id ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </td>
  </tr>
));
StandardRow.displayName = 'StandardRow';

const ClientSpecRow = memo(({ row, onEdit, onDelete, confirmDeleteId }) => (
  <tr className="spec-row">
    <td>{row.client}</td>
    <td>{row.product}</td>
    <td>
      <div className="row-actions">
        <button className="edit-btn" onClick={() => onEdit(row)} type="button"><FiEdit /> Edit</button>
        <button className="delete-btn" onClick={() => onDelete(row._id)} type="button">
          <FiTrash2 /> {confirmDeleteId === row._id ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </td>
  </tr>
));
ClientSpecRow.displayName = 'ClientSpecRow';

// ── Param Inputs ──
const ParamInputs = ({ form, dispatch }) => (
  <div className="param-block">
    <div className="param-block-title">Parameter limits <span>(leave blank = not specified)</span></div>
    {PARAM_FIELDS.map(field => {
      if (field.kind === 'enum') {
        return (
          <div key={field.key} className="form-group">
            <label>{field.label}</label>
            <select
              value={form.limits[field.key] || ''}
              onChange={e => dispatch({ type: 'SET_PARAM', field: field.key, value: e.target.value })}
            >
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt === '' ? 'Not specified' : (field.key === 'gelThickness' ? GEL_LABEL[opt] : opt)}</option>
              ))}
            </select>
          </div>
        );
      }
      if (field.kind === 'text') {
        return (
          <div key={field.key} className="form-group">
            <label>{field.label}</label>
            <input
              type="text"
              value={form.limits[field.key] || ''}
              onChange={e => dispatch({ type: 'SET_PARAM', field: field.key, value: e.target.value })}
              placeholder="e.g. Pale amber"
            />
          </div>
        );
      }
      return (
        <div key={field.key} className="form-group">
          <label>{field.label} {field.unit && `(${field.unit})`}</label>
          <div className="range-row">
            <input
              type="number" step="any" placeholder="Min"
              value={form.limits[field.key]?.min ?? ''}
              onChange={e => dispatch({ type: 'SET_RANGE', field: field.key, bound: 'min', value: e.target.value })}
            />
            <span className="range-sep">to</span>
            <input
              type="number" step="any" placeholder="Max"
              value={form.limits[field.key]?.max ?? ''}
              onChange={e => dispatch({ type: 'SET_RANGE', field: field.key, bound: 'max', value: e.target.value })}
            />
          </div>
        </div>
      );
    })}
  </div>
);

// ── Modal Shell ──
const SpecModal = ({ title, onCancel, onSubmit, form, dispatch, topFields, submitLabel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-content spec-modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>{title}</h3>
        <button className="close-modal" onClick={onCancel} type="button"><FiX /></button>
      </div>
      <form onSubmit={onSubmit}>
        {topFields.map(f => (
          <div key={f.key} className="form-group">
            <label>{f.label} *</label>
            <input
              type="text" required
              value={form[f.key] || ''}
              onChange={e => dispatch({ type: 'SET_TOP', field: f.key, value: e.target.value })}
              placeholder={f.placeholder}
            />
          </div>
        ))}
        <ParamInputs form={form} dispatch={dispatch} />
        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="save-btn">{submitLabel}</button>
        </div>
      </form>
    </div>
  </div>
);

// ── Main Component ──
const SpecificationsManage = () => {
  const [state, dispatch] = useReducer(stateReducer, {
    standards: [], clientSpecs: [], loading: true,
    tab: 'standards', search: '', page: 1, modal: null, confirmDeleteId: null,
  });

  const [form, formDispatch] = useReducer(formReducer, INITIAL_GOV_FORM);
  const [apiError, setApiError] = useState(null);

  // ── API: Fetch Data (Graceful Error Handling) ──
  const fetchData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [resGov, resClient] = await Promise.all([
        fetch(`${API_URL}?type=government`),
        fetch(`${API_URL}?type=client`)
      ]);
      
      if (!resGov.ok || !resClient.ok) throw new Error('Server responded with an error');
      
      const govData = await resGov.json();
      const clientData = await resClient.json();

      dispatch({ type: 'SET_STANDARDS', payload: govData });
      dispatch({ type: 'SET_CLIENT_SPECS', payload: clientData });
      setApiError(null); // Clear any previous errors if successful
    } catch (err) {
      // Log the real error for debugging
      console.error("Failed to connect to backend:", err);
      
      // Fallback to empty arrays so the UI shows "No standards/client specs found"
      dispatch({ type: 'SET_STANDARDS', payload: [] });
      dispatch({ type: 'SET_CLIENT_SPECS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived Data ──
  const activeDataset = state.tab === 'standards' ? state.standards : state.clientSpecs;
  const filtered = useMemo(() => {
    const q = state.search.trim().toLowerCase();
    if (!q) return activeDataset;
    if (state.tab === 'standards') {
      return activeDataset.filter(r => r.authority?.toLowerCase().includes(q) || r.region?.toLowerCase().includes(q) || r.product?.toLowerCase().includes(q));
    }
    return activeDataset.filter(r => r.client?.toLowerCase().includes(q) || r.product?.toLowerCase().includes(q));
  }, [activeDataset, state.search, state.tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows = useMemo(() => filtered.slice((state.page - 1) * ROWS_PER_PAGE, state.page * ROWS_PER_PAGE), [filtered, state.page]);

  // ── Handlers ──
  const switchTab = useCallback((tab) => dispatch({ type: 'SET_TAB', payload: tab }), []);
  const handleSearch = useCallback(e => dispatch({ type: 'SET_SEARCH', payload: e.target.value }), []);
  const handlePrev = useCallback(() => dispatch({ type: 'SET_PAGE', payload: Math.max(1, state.page - 1) }), [state.page]);
  const handleNext = useCallback(() => dispatch({ type: 'SET_PAGE', payload: Math.min(totalPages, state.page + 1) }), [state.page, totalPages]);

  const openCreate = useCallback((type) => {
    formDispatch({ type: 'RESET', payload: type === 'standard' ? INITIAL_GOV_FORM : INITIAL_CLIENT_FORM });
    dispatch({ type: 'SET_MODAL', payload: { type, mode: 'create' } });
  }, []);

  const openEdit = useCallback((type) => (row) => {
    const payload = { ...row }; 
    formDispatch({ type: 'LOAD', payload });
    dispatch({ type: 'SET_MODAL', payload: { type, mode: 'edit', data: row } });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'SET_MODAL', payload: null });
    dispatch({ type: 'SET_CONFIRM_DELETE', payload: null });
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const isEdit = state.modal.mode === 'edit';
    const url = isEdit ? `${API_URL}/${state.modal.data._id}` : API_URL;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save specification');
      }

      await fetchData(); 
      closeModal();
    } catch (err) {
      // Real validation errors (e.g. missing fields) SHOULD be shown via alert or banner
      alert(err.message);
    }
  }, [form, state.modal, fetchData, closeModal]);

  const handleDelete = useCallback((type) => async (id) => {
    if (state.confirmDeleteId !== id) {
      dispatch({ type: 'SET_CONFIRM_DELETE', payload: id });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete specification');
      
      await fetchData(); 
      dispatch({ type: 'SET_CONFIRM_DELETE', payload: null });
    } catch (err) {
      alert(err.message);
    }
    void type;
  }, [state.confirmDeleteId, fetchData]);

  const editStandard = useMemo(() => openEdit('standard'), [openEdit]);
  const editClient   = useMemo(() => openEdit('client'),   [openEdit]);
  const delStandard  = useMemo(() => handleDelete('government'), [handleDelete]);
  const delClient    = useMemo(() => handleDelete('client'),   [handleDelete]);

  // Only show loading spinner on first load
  if (state.loading && state.standards.length === 0 && state.clientSpecs.length === 0) {
    return <div className="spec-manage"><p>Loading specifications...</p></div>;
  }

  return (
    <div className="spec-manage">
      {/* ── Card A: Action bar ── */}
      <div className="spec-actions-card">
        <button className="spec-btn primary" onClick={() => openCreate('standard')} type="button">
          <FiPlus /> New Standard
        </button>
        <button className="spec-btn" onClick={() => openCreate('client')} type="button">
          <FiPlus /> New Client Spec
        </button>
      </div>

      {/* ── Card B: Main ── */}
      <div className="spec-main-card">
        <div className="tab-strip">
          <button className={`tab-btn ${state.tab === 'standards' ? 'active' : ''}`} onClick={() => switchTab('standards')} type="button">
            Government Standards
          </button>
          <button className={`tab-btn ${state.tab === 'clients' ? 'active' : ''}`} onClick={() => switchTab('clients')} type="button">
            Client Specs
          </button>
        </div>

        <div className="search-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={state.tab === 'standards' ? 'Search by authority, region, product…' : 'Search by client, product…'}
            value={state.search}
            onChange={handleSearch}
          />
        </div>

        <div className="table-wrapper">
          <table className="spec-table">
            {state.tab === 'standards' ? (
              <>
                <thead><tr><th>Authority</th><th>Region</th><th>Product</th><th>Action</th></tr></thead>
                <tbody>
                  {pageRows.length ? pageRows.map(row => (
                    <StandardRow key={row._id} row={row} onEdit={editStandard} onDelete={delStandard} confirmDeleteId={state.confirmDeleteId} />
                  )) : <tr><td colSpan={4} className="empty-row">No standards found. Click "New Standard" to add one.</td></tr>}
                </tbody>
              </>
            ) : (
              <>
                <thead><tr><th>Client</th><th>Product</th><th>Action</th></tr></thead>
                <tbody>
                  {pageRows.length ? pageRows.map(row => (
                    <ClientSpecRow key={row._id} row={row} onEdit={editClient} onDelete={delClient} confirmDeleteId={state.confirmDeleteId} />
                  )) : <tr><td colSpan={3} className="empty-row">No client specs found. Click "New Client Spec" to add one.</td></tr>}
                </tbody>
              </>
            )}
          </table>
        </div>

        <div className="pagination">
          <button className="page-btn" onClick={handlePrev} disabled={state.page === 1} type="button"><FiChevronLeft /></button>
          <span className="page-indicator">Page {state.page} of {totalPages}</span>
          <button className="page-btn" onClick={handleNext} disabled={state.page === totalPages} type="button"><FiChevronRight /></button>
        </div>
      </div>

      {/* ── Modals ── */}
      {state.modal && state.modal.type === 'standard' && (
        <SpecModal
          title={state.modal.mode === 'edit' ? 'Edit Government Standard' : 'New Government Standard'}
          submitLabel={state.modal.mode === 'edit' ? 'Update Standard' : 'Save Standard'}
          onCancel={closeModal}
          onSubmit={handleSubmit}
          form={form}
          dispatch={formDispatch}
          topFields={[
            { key: 'authority', label: 'Authority', placeholder: 'e.g. KEBS' },
            { key: 'region',    label: 'Region',    placeholder: 'e.g. Kenya' },
            { key: 'product',   label: 'Product',   placeholder: 'e.g. Gum Arabic' },
          ]}
        />
      )}

      {state.modal && state.modal.type === 'client' && (
        <SpecModal
          title={state.modal.mode === 'edit' ? 'Edit Client Specification' : 'New Client Specification'}
          submitLabel={state.modal.mode === 'edit' ? 'Update Spec' : 'Save Spec'}
          onCancel={closeModal}
          onSubmit={handleSubmit}
          form={form}
          dispatch={formDispatch}
          topFields={[
            { key: 'client',  label: 'Client',  placeholder: 'e.g. Acme EU' },
            { key: 'product', label: 'Product', placeholder: 'e.g. Gum Arabic' },
          ]}
        />
      )}
    </div>
  );
};

export default SpecificationsManage;