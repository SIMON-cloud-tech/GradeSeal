// src/Components/Dashboard/jsx/SampleModal.jsx
// NOTE: BatchesManage.jsx imports './SampleModal.jsx', so this file must sit in the same
// folder as BatchesManage.jsx (jsx/). If you keep it in jsx/modals/, change that import
// to './modals/SampleModal.jsx' and check the CSS path below.

import { useState, useMemo } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiCamera } from 'react-icons/fi';
import '../css/Modal.css'; // Make sure this matches your CSS file name

const BATCH_API = 'http://localhost:5000/api/batches';

const PARAM_FIELDS = [
  { key: 'gelThickness', label: 'Gel Thickness',     kind: 'enum', options: ['', '+++', '++', '+'] },
  { key: 'impurity',     label: 'Impurity %',        kind: 'number' },
  { key: 'rotation',     label: 'Specific Rotation', kind: 'number' },
  { key: 'colour',       label: 'Colour',            kind: 'text' },
  { key: 'moisture',     label: 'Moisture %',        kind: 'number' },
  { key: 'diameter',     label: 'Diameter (mm)',     kind: 'number' },
  { key: 'ringTest',     label: 'Ring Test',         kind: 'enum', options: ['', 'Pass', 'Fail'] },
];

const INITIAL_FORM = {
  gelThickness: '', impurity: '', rotation: '', colour: '', moisture: '', diameter: '', ringTest: '', comments: '', photo: null
};

const hasValue = (v) => v !== undefined && v !== null && v !== '';

// A spec only counts if it actually has something to compare against
function hasSpec(spec, kind) {
  if (kind === 'enum' || kind === 'text') return hasValue(spec);
  return !!spec && (hasValue(spec.min) || hasValue(spec.max));
}

// Same rules as the backend (case-insensitive for enum/text). The backend is the real judge.
function checkLimit(val, spec, kind) {
  if (!hasSpec(spec, kind) || !hasValue(val)) return true;
  if (kind === 'enum' || kind === 'text') {
    return String(spec).trim().toLowerCase() === String(val).trim().toLowerCase();
  }
  const num = parseFloat(val);
  if (Number.isNaN(num)) return false;
  if (hasValue(spec.min) && num < parseFloat(spec.min)) return false;
  if (hasValue(spec.max) && num > parseFloat(spec.max)) return false;
  return true;
}

const SampleModal = ({ batch, onClose, onSave }) => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. Specs come from the populated batch (they were chosen when the batch was created)
  const { clientSpec, govStandard } = useMemo(() => ({
    clientSpec: batch.clientSpecId?.limits || {},
    govStandard: batch.standardId?.limits || {},
  }), [batch]);

  // 2. Live comparison against both specs (for the ticks only; the server re-checks on save)
  const comparisons = useMemo(() => {
    const results = {};
    let allPassed = true;
    PARAM_FIELDS.forEach((field) => {
      const val = formData[field.key];
      const hasClientSpec = hasSpec(clientSpec[field.key], field.kind);
      const hasGovSpec = hasSpec(govStandard[field.key], field.kind);
      const client = checkLimit(val, clientSpec[field.key], field.kind);
      const gov = checkLimit(val, govStandard[field.key], field.kind);
      results[field.key] = { client, gov, hasClientSpec, hasGovSpec };
      if (hasClientSpec && !client) allPassed = false;
      if (hasGovSpec && !gov) allPassed = false;
    });
    return { results, overallPass: allPassed };
  }, [formData, clientSpec, govStandard]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!batch.sampledBagId) { setError('No bag has been drawn for this batch. Close this window and click Sample again.'); return; }
    if (!comparisons.overallPass) { setError('Cannot save: One or more parameters are outside specs.'); return; }

    setIsSaving(true);
    setError('');

    try {
      // The bag is NOT sent: the server already drew it and saved it on the batch.
      // The verdict is NOT sent either: the server works it out from the measurements and specs.
      const data = new FormData();
      data.append('comments', formData.comments);
      data.append('measurements', JSON.stringify({
        gelThickness: formData.gelThickness,
        impurity: formData.impurity,
        rotation: formData.rotation,
        colour: formData.colour,
        moisture: formData.moisture,
        diameter: formData.diameter,
        ringTest: formData.ringTest,
      }));

      if (formData.photo) data.append('photo', formData.photo);

      const res = await fetch(`${BATCH_API}/${batch._id}/sample`, {
        method: 'POST',
        body: data, // No headers: the browser sets multipart/form-data itself
      });

      if (!res.ok) {
        let message = 'Failed to save sample';
        try { message = (await res.json()).message || message; } catch { /* non-JSON error body */ }
        throw new Error(message);
      }

      const updatedBatch = await res.json();
      onSave(updatedBatch); // Parent refetches and closes this modal
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  const renderTick = (ok, present) => {
    if (!present) return <span style={{ color: '#d1d5db' }}>—</span>;
    return ok ? <FiCheckCircle color="#10b981" /> : <FiAlertCircle color="#ef4444" />;
  };

  return (
    <div className="sm-overlay" onClick={onClose}>
      <div className="sm-content" onClick={(e) => e.stopPropagation()}>

        {/* Fixed Header */}
        <div className="sm-header">
          <h3>Record Results: {batch.batchNo}</h3>
          <button type="button" className="sm-close-btn" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {/* Form wrapper */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          <div className="sm-body">
            {error && <div className="sm-error-banner">{error}</div>}

            {/* Bag ID: drawn by the server when Sample was clicked, read-only here */}
            <div className="sm-group">
              <label>Sampled Bag ID (randomly assigned)</label>
              <input type="text" value={batch.sampledBagId || ''} readOnly />
            </div>

            {/* Measurements Grid */}
            <div className="sm-section-title">Wet-Chem Analysis</div>
            <div className="sm-grid">
              <div className="sm-grid-header">
                <div>Parameter</div>
                <div>Measured</div>
                <div>Client</div>
                <div>Gov</div>
              </div>

              {PARAM_FIELDS.map((field) => {
                const r = comparisons.results[field.key];
                return (
                  <div key={field.key} className="sm-grid-row">
                    <div className="sm-grid-label">{field.label}</div>
                    <div className="sm-grid-input">
                      {field.kind === 'enum' ? (
                        <select name={field.key} value={formData[field.key]} onChange={handleChange} required>
                          {field.options.map((o) => <option key={o} value={o}>{o || 'Select'}</option>)}
                        </select>
                      ) : (
                        <input type={field.kind} name={field.key} value={formData[field.key]} onChange={handleChange} step="any" required />
                      )}
                    </div>
                    <div className="sm-grid-status">{renderTick(r?.client, r?.hasClientSpec)}</div>
                    <div className="sm-grid-status">{renderTick(r?.gov, r?.hasGovSpec)}</div>
                  </div>
                );
              })}
            </div>

            {/* Visuals */}
            <div className="sm-section-title">Visual Inspection</div>

            <div className="sm-group">
              <label>Product Photo</label>
              <div className="sm-upload-row">
                <input type="file" accept="image/*" onChange={handlePhoto} id="photo-upload" hidden />
                <label htmlFor="photo-upload" className="sm-upload-btn">
                  <FiCamera size={18} /> {formData.photo ? 'Change Photo' : 'Upload Photo'}
                </label>
                {photoPreview && <img src={photoPreview} alt="Preview" className="sm-photo-preview" />}
              </div>
            </div>

            <div className="sm-group">
              <label>Visual Observations / Comments</label>
              <textarea
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., Slight amber tint, no foreign matter..."
              />
            </div>
          </div>

          <div className="sm-footer">
            <button type="button" className="sm-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="sm-btn-save" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Results'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default SampleModal;