// src/Components/Dashboard/jsx/UsersKeysManage.jsx

import { useState, useMemo } from 'react';
import { FiPlus, FiSearch, FiShield, FiCheckCircle, FiXCircle, FiEdit, FiTrash2 } from 'react-icons/fi';
import '../css/Users.css';

// Mock Staff Data
const MOCK_USERS = [
  { id: 1, name: 'John Doe', email: 'john@acacia.com', role: 'CEO', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@acacia.com', role: 'QA Manager', status: 'Active' },
  { id: 3, name: 'Peter Kariuki', email: 'peter@acacia.com', role: 'Operator', status: 'Active' },
  { id: 4, name: 'Mary Wanjiku', email: 'mary@acacia.com', role: 'Buyer', status: 'Suspended' },
  { id: 5, name: 'David Ochieng', email: 'david@acacia.com', role: 'Operator', status: 'Active' },
];

const UsersKeysManage = () => {
  const [search, setSearch] = useState('');

  // Filter by Role or Name or Email
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_USERS;
    return MOCK_USERS.filter(u => 
      u.role.toLowerCase().includes(q) || 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="uk-container">
      
      {/* ── Card 1: Cryptographic Key Status ── */}
      <div className="uk-crypto-card">
        <div className="uk-crypto-info">
          <div className="uk-crypto-header">
            <FiShield size={24} className="uk-icon-green" />
            <h2>Cryptographic Ed25519 Key Status</h2>
            <span className="uk-status-badge-active">Active</span>
          </div>
          
          <div className="uk-crypto-details">
            <div className="uk-detail-row">
              <span className="uk-label">Public Key:</span>
              <span className="uk-value code">ed25519_pub_8f4a2b9c1d3e5f6g7h8i9j0k...</span>
            </div>
            <div className="uk-detail-row">
              <span className="uk-label">Key Algorithm:</span>
              <span className="uk-value">Ed25519 / SHA-256</span>
            </div>
          </div>
        </div>

        {/* Floating Add User Button */}
        <button className="uk-add-user-btn">
          <FiPlus size={18} /> Add User
        </button>
      </div>

      {/* ── Card 2: Staff & Roles ── */}
      <div className="uk-staff-card">
        <h3 className="uk-staff-title">Staff & their Roles</h3>
        
        <div className="uk-search-wrapper">
          <FiSearch className="uk-search-icon" />
          <input
            type="text"
            className="uk-search-input"
            placeholder="Search staff by their role, name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="uk-table-wrapper">
          <table className="uk-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td className="uk-user-name">{user.name}</td>
                    <td className="uk-user-email">{user.email}</td>
                    <td>
                      <span className={`uk-role-badge role-${user.role.replace(/\s+/g, '-').toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`uk-status-badge ${user.status === 'Active' ? 'status-active' : 'status-suspended'}`}>
                        {user.status === 'Active' ? <FiCheckCircle /> : <FiXCircle />} {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="uk-actions">
                        <button className="uk-btn-icon" title="Edit"><FiEdit /></button>
                        <button className="uk-btn-icon uk-btn-danger" title="Delete"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="uk-empty-row">No staff members match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default UsersKeysManage;