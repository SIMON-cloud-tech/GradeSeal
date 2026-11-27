// src/Components/Dashboard/jsx/UsersKeysManage.jsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FiPlus, FiSearch, FiShield, FiCheckCircle, FiXCircle, 
  FiEdit, FiTrash2, FiX, FiEye, FiEyeOff 
} from 'react-icons/fi';
import '../css/Users.css';

const API_URL = '/api';

// ── Add / Edit User Modal ──
const UserModal = ({ mode, initialData, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    password: '',
    role: initialData?.role || 'operator',
    status: initialData?.status || 'active',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = { ...form };
      if (mode === 'edit' && !payload.password) {
        delete payload.password;
      }

      const url = mode === 'edit' 
        ? `${API_URL}/users/${initialData._id}` 
        : `${API_URL}/users`;
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save user');
      }

      onSave(data); 
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="uk-modal-overlay" onClick={onClose}>
      <div className="uk-modal-content" onClick={e => e.stopPropagation()}>
        <div className="uk-modal-header">
          <h3>{mode === 'edit' ? 'Edit User' : 'Add New User'}</h3>
          <button type="button" className="uk-modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="uk-modal-body">
          {error && <div className="uk-modal-error">{error}</div>}

          <div className="uk-form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="uk-form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              required 
              disabled={mode === 'edit'}
            />
          </div>

          {mode === 'create' && (
            <div className="uk-form-group">
              <label>Password</label>
              <div className="uk-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                />
                <button 
                  type="button" 
                  className="uk-password-toggle"
                  onClick={() => setShowPassword(prev => !prev)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
          )}

          <div className="uk-form-group">
            <label>Role</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="ceo">CEO</option>
              <option value="qa">QA Manager</option>
              <option value="operator">Operator</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>

          <div className="uk-form-group">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="uk-modal-actions">
            <button 
              type="button" 
              className="uk-btn-cancel" 
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="uk-btn-save" 
              disabled={saving}
            >
              {saving ? 'Saving...' : (mode === 'edit' ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Component ──
const UsersKeysManage = () => {
  const [users, setUsers] = useState([]);
  const [publicKey, setPublicKey] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, keyRes] = await Promise.all([
        fetch(`${API_URL}/users`, { credentials: 'include' }),
        fetch(`${API_URL}/users/keys`, { credentials: 'include' }),
      ]);

      if (usersRes.ok) {
        const userData = await usersRes.json();
        setUsers(userData);
      }

      if (keyRes.ok) {
        const keyData = await keyRes.json();
        setPublicKey(keyData.publicKey || 'Not available');
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => 
      u.name?.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q) || 
      u.role?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleOpenCreate = () => setModal({ open: true, mode: 'create', data: null });
  const handleOpenEdit = (user) => setModal({ open: true, mode: 'edit', data: user });
  const handleCloseModal = () => setModal({ open: false, mode: 'create', data: null });

  const handleSaveUser = async () => {
    handleCloseModal();
    await fetchData();
  };

  const handleDelete = async (id) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete user');
      }

      setConfirmDeleteId(null);
      await fetchData();
    } catch (err) {
      alert(err.message);
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return <div className="uk-container"><p>Loading users...</p></div>;
  }

  return (
    <div className="uk-container">
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
              <span className="uk-value code">{publicKey.substring(0, 60)}...</span>
            </div>
            <div className="uk-detail-row">
              <span className="uk-label">Key Algorithm:</span>
              <span className="uk-value">Ed25519 / SHA-256</span>
            </div>
          </div>
        </div>

        <button className="uk-add-user-btn" onClick={handleOpenCreate}>
          <FiPlus size={18} /> Add User
        </button>
      </div>

      <div className="uk-staff-card">
        <h3 className="uk-staff-title">Staff & their Roles</h3>
        
        <div className="uk-search-wrapper">
          <FiSearch className="uk-search-icon" />
          <input
            type="text"
            className="uk-search-input"
            placeholder="Search staff by role, name, or email..."
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
                  <tr key={user._id}>
                    <td className="uk-user-name">{user.name}</td>
                    <td className="uk-user-email">{user.email}</td>
                    <td>
                      <span className={`uk-role-badge role-${user.role.replace(/\s+/g, '-').toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`uk-status-badge ${user.status === 'active' ? 'status-active' : 'status-suspended'}`}>
                        {user.status === 'active' ? <FiCheckCircle /> : <FiXCircle />} {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="uk-actions">
                        <button 
                          className="uk-btn-icon" 
                          title="Edit"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <FiEdit />
                        </button>
                        <button 
                          className="uk-btn-icon uk-btn-danger" 
                          title="Delete"
                          onClick={() => handleDelete(user._id)}
                          style={{ 
                            display: user.role === 'ceo' ? 'none' : 'flex' 
                          }}
                        >
                          <FiTrash2 />
                          {confirmDeleteId === user._id && ' Confirm?'}
                        </button>
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

      {modal.open && (
        <UserModal
          mode={modal.mode}
          initialData={modal.data}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};

export default UsersKeysManage;