// src/Components/Dashboard/jsx/Dashboard.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiLayers, FiActivity, FiPrinter, FiFileText,
  FiKey, FiLogOut, FiSun, FiMoon, FiMenu, FiX,
} from 'react-icons/fi';
import '../css/Dashboard.css';

import BatchesManage from './BatchesManage.jsx';
import SpecificationsManage from './SpecificationsManage.jsx';
import PrintQueueManage from './PrintQueue.jsx';
import ScanLogs from './ScanLogs.jsx';
import COAsManage from './CoasManage.jsx';
import UsersKeysManage from './UserKeys.jsx';

// ── Constants ──
// Each item declares which roles can see it.
const MENU_ITEMS = [
  { id: 'batches',        label: 'Batches',        icon: FiLayers,   component: BatchesManage,         roles: ['ceo', 'qa', 'operator'] },
  { id: 'specifications', label: 'Specifications', icon: FiFileText, component: SpecificationsManage,  roles: ['ceo', 'qa', 'operator'] },
  { id: 'print-queue',    label: 'Print Queue',    icon: FiPrinter,  component: PrintQueueManage,      roles: ['ceo', 'qa', 'operator'] },
  { id: 'scan-logs',      label: 'Scan Logs',      icon: FiActivity, component: ScanLogs,              roles: ['ceo', 'qa', 'operator'] },
  { id: 'coas',           label: 'COAs',           icon: FiFileText, component: COAsManage,            roles: ['ceo', 'qa', 'operator', 'buyer'] },
  { id: 'user-keys',      label: 'User Keys',      icon: FiKey,      component: UsersKeysManage,       roles: ['ceo'] },
];

const Dashboard = ({ setUser }) => {
  const navigate = useNavigate();

  const [activeMenu, setActiveMenu] = useState(null);  // ← deferred until profile loads
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Filter menu by role ──
  const visibleItems = useMemo(() => {
    if (!profile?.role) return [];
    return MENU_ITEMS.filter(item => item.roles.includes(profile.role));
  }, [profile?.role]);

  // ── Default to the first visible item once profile loads ──
  useEffect(() => {
    if (!activeMenu && visibleItems.length > 0) {
      setActiveMenu(visibleItems[0].id);
    }
  }, [activeMenu, visibleItems]);

  const ActiveComponent = useMemo(() => {
    const item = MENU_ITEMS.find(i => i.id === activeMenu);
    return item?.component || null;
  }, [activeMenu]);

  const activeLabel = useMemo(() => {
    const item = MENU_ITEMS.find(i => i.id === activeMenu);
    return item?.label || 'Dashboard';
  }, [activeMenu]);

  // ── Theme persistence ──
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ── Fetch profile (uses the real endpoint) ──
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          navigate('/admin');
          return;
        }
        throw new Error('Failed to fetch profile');
      }
      const data = await res.json();
      setProfile(data.user);
    } catch (err) {
      console.error('Profile error:', err);
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Handlers ──
  const handleLogout = useCallback(async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    navigate('/admin');
  }, [setUser, navigate]);

  const toggleMenu = useCallback(() => setMobileOpen(prev => !prev), []);
  const closeMenu = useCallback(() => setMobileOpen(false), []);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  }, []);

  // ── Loading ──
  if (loading) return <div className="dashboard-status">Loading dashboard...</div>;

  // Edge case: profile loaded but no accessible items (misconfigured role)
  if (!visibleItems.length) {
    return <div className="dashboard-status">No modules available for your role.</div>;
  }

  return (
    <div className={`dashboard ${theme}`}>
      {/* ── Mobile Top Bar ── */}
      <div className="mobile-topbar">
        <button className="mobile-hamburger" onClick={toggleMenu} aria-label="Toggle menu">
          {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* ── Overlay ── */}
      <div className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`} onClick={closeMenu} />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2>GradeSeal</h2>
        </div>

        <nav>
          {visibleItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`sidebar-item ${activeMenu === id ? 'active' : ''}`}
              onClick={() => { setActiveMenu(id); closeMenu(); }}
            >
              <span className="sidebar-icon"><Icon size={20} /></span>
              <span className="sidebar-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="sidebar-icon"><FiLogOut size={20} /></span>
            <span className="sidebar-label">Logout</span>
          </button>
          <button className="theme-toggle" onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}>
            <span className="sidebar-icon">
              {theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
            </span>
            <span className="sidebar-label">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="dashboard-main">
        <section className="dashboard-row dashboard-row-fixed">
          <div className="welcome-banner">
            <h1 className="welcome-title">{getGreeting()}, {profile?.name || 'User'}</h1>
          </div>
        </section>

        <section className="dashboard-row dashboard-row-scrollable">
          <div className="content-panel full-width">
            <h3>{activeLabel}</h3>
            {ActiveComponent && <ActiveComponent />}
          </div>
        </section>

          <footer className="dashboard-footer">
          <p>© {new Date().getFullYear()} GradeSeal. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;