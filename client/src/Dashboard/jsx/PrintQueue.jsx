// src/Components/Dashboard/jsx/PrintQueue.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import '../css/PrintQueue.css';

const API_URL = 'http://localhost:5000/api/coas';

const PrintQueue = () => {
  const navigate = useNavigate();
  const [coas, setCoas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    let cancelled = false;

    const fetchCOAs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}?search=${encodeURIComponent(search)}`);
        if (!res.ok) throw new Error('Server responded with an error');
        const data = await res.json();
        if (!cancelled) setCoas(data);
      } catch (err) {
        console.error('Failed to connect to backend:', err);
        if (!cancelled) setCoas([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(fetchCOAs, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setVisibleCount(3);
  };

  const visibleCOAs = coas.slice(0, visibleCount);
  const hasMore = visibleCount < coas.length;
  const handleLoadMore = () => setVisibleCount((prev) => prev + 3);

  // Only show the full-page loading screen on the very first load
  if (loading && coas.length === 0 && !search) return <div className="pq-container">Loading...</div>;

  return (
    <div className="pq-container">
      {/* Header */}
      <div className="pq-header">
        <h2>Print Queue</h2>
        <p>Manage and print Certificates of Analysis (COAs) and their corresponding Bag QR codes.</p>
      </div>

      {/* Search */}
      <div className="pq-search-wrapper">
        <FiSearch className="pq-search-icon" />
        <input
          type="text"
          className="pq-search-input"
          placeholder="Search by COA Number, Batch or Sampled Bag ID..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      {/* Grid */}
      <div className="pq-grid">
        {visibleCOAs.map((coa) => (
          <div key={coa._id} className="pq-card">
            <div className="pq-card-top">
              <span className="pq-card-coa">{coa.coaId}</span>
              <span className="pq-badge">{coa.qrCount} QRs</span>
            </div>

            <div className="pq-card-body">
              <div className="pq-card-row">
                <span className="pq-label">Batch:</span> {coa.batch?.batchNo || 'N/A'}
              </div>
              <div className="pq-card-row">
                <span className="pq-label">Client:</span> {coa.batch?.client || 'N/A'}
              </div>
              <div className="pq-card-row">
                <span className="pq-label">Status:</span>{' '}
                <strong style={{ color: coa.status === 'Printed' ? '#065f46' : '#92400e' }}>
                  {coa.status === 'Printed' ? 'Printed' : 'Ready to print'}
                </strong>
              </div>
              <div className="pq-card-comments">
                "{coa.comments || 'No comments provided.'}"
              </div>
            </div>

            <div className="pq-card-footer">
              <button
                className="pq-btn-read-more"
                onClick={() => navigate(`/dashboard/print-queue/${coa._id}`)}
              >
                Open &amp; Print
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {coas.length === 0 && !loading && (
        <div className="pq-empty">No COAs found matching your search.</div>
      )}

      {coas.length > 0 && (
        <div className="pq-load-more-wrapper">
          <button
            className={`pq-btn-load-more ${!hasMore ? 'disabled' : ''}`}
            onClick={handleLoadMore}
            disabled={!hasMore}
          >
            {hasMore ? 'Load More' : 'All COAs Loaded'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PrintQueue;