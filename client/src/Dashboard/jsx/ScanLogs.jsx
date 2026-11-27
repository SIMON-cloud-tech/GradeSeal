// src/Components/Dashboard/jsx/ScanLogs.jsx
import { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiMapPin, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import '../css/Scanlogs.css';

// Define the API endpoint for fetching scan logs. 
// This is a relative path to the server's API endpoint.
const API_URL = '/api/scanlogs';
const ROWS_PER_PAGE = 10;

// Inline colours so this works without touching Scanlogs.css
const RESULT_STYLE = {
  'Valid':       { background: '#d1fae5', color: '#065f46' },
  'Invalid Bag': { background: '#fee2e2', color: '#991b1b' },
  'Unknown COA': { background: '#fee2e2', color: '#991b1b' },
  'Recalled':    { background: '#fef3c7', color: '#92400e' },
};

const ScanLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Fetch scan logs (debounced; stale responses are ignored)
  useEffect(() => {
    let cancelled = false;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}?search=${encodeURIComponent(search)}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch scan logs');
        const data = await res.json();
        if (!cancelled) setLogs(data);
      } catch (err) {
        console.error('Failed to load scan logs:', err);
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(fetchLogs, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(logs.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return logs.slice(start, start + ROWS_PER_PAGE);
  }, [logs, currentPage]);

  return (
    <div className="sl-container">
      <div className="sl-header">
        <h2>Scan Logs</h2>
        <p>Real-time verification tracking. See where and when buyers or customs scan your QR codes.</p>
      </div>

      <div className="sl-search-wrapper">
        <FiSearch className="sl-search-icon" />
        <input
          type="text"
          className="sl-search-input"
          placeholder="Search by COA, Bag ID, result or location..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className="sl-table-wrapper">
        <table className="sl-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>COA Reference</th>
              <th>Bag ID</th>
              <th>Result</th>
              <th>Location</th>
              <th>Device</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
            ) : paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.scannedAt).toLocaleString()}</td>
                  <td><span className="sl-coa-ref">{log.coaId || 'N/A'}</span></td>
                  <td>{log.bagId || '— (certificate)'}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.15rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        ...(RESULT_STYLE[log.result] || RESULT_STYLE.Valid),
                      }}
                    >
                      {log.result || 'Valid'}
                    </span>
                  </td>
                  <td className="sl-location">
                    <FiMapPin /> {log.location?.city || 'Unknown'}, {log.location?.country || 'Unknown'}
                  </td>
                  <td>{log.device}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No scan logs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {logs.length > 0 && (
        <div className="sl-pagination" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            <FiChevronLeft />
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default ScanLogs;