import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, PlusCircle,
  Package, BarChart3, Settings, Moon, Sun, LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const { user, darkMode, updateSettings, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ✅ Dynamic page title
  const getHeaderTitle = () => {
    if (location.pathname.includes('/dashboard')) return 'Dashboard';
    if (location.pathname.includes('/quotations/new')) return 'New Quotation';
    if (location.pathname.includes('/quotations')) return 'Quotations';
    if (location.pathname.includes('/products')) return 'Products';
    if (location.pathname.includes('/inventory')) return 'Inventory';
    if (location.pathname.includes('/settings')) return 'Settings';
    return 'Dashboard';
  };

  const navGroups = [
    {
      label: 'Main',
      items: [
        { to: '/dashboard', icon: <LayoutDashboard className="nav-icon" />, label: 'Dashboard' },
        { to: '/quotations', icon: <FileText className="nav-icon" />, label: 'Quotations' },
        { to: '/quotations/new', icon: <PlusCircle className="nav-icon" />, label: 'New Quotation' },
      ]
    },
    {
      label: 'Catalog',
      items: [
        { to: '/products', icon: <Package className="nav-icon" />, label: 'Products' },
        { to: '/inventory', icon: <BarChart3 className="nav-icon" />, label: 'Inventory' },
      ]
    },
    {
      label: 'System',
      items: [
        { to: '/settings', icon: <Settings className="nav-icon" />, label: 'Settings' },
      ]
    }
  ];

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <div className="app-layout">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">⚡</div>
          <div>
            <div className="sidebar-logo-text">QuoteFlow</div>
            <div className="sidebar-logo-sub">LED Solutions Pro</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <React.Fragment key={group.label}>
              <div className="nav-section-label">{group.label}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="user-chip">
              <div className="user-avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="nav-item"
              style={{ flex: 1, border: 'none' }}
              onClick={() => updateSettings({ dark_mode: !darkMode })}
            >
              {darkMode ? <Sun className="nav-icon" /> : <Moon className="nav-icon" />}
              {darkMode ? 'Light' : 'Dark'}
            </button>

            <button
              className="nav-item"
              style={{ border: 'none', color: 'rgba(239,68,68,0.7)' }}
              onClick={handleLogout}
            >
              <LogOut className="nav-icon" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">

        {/* ✅ DYNAMIC HEADER */}
        <header className="top-header">
          <div className="header-title">
            Ashok Vidyut ⚡
          </div>
        </header>

        {/* ✅ SCROLL FIX */}
        <main className="page-content">
          <Outlet />
        </main>

      </div>
    </div>
  );
}