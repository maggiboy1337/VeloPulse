import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/tracking/start', icon: '🚴', label: 'Tracking starten' },
    { path: '/sessions/active', icon: '⏱️', label: 'Aktive Sessions' },
    { path: '/routes', icon: '🗺️', label: 'Gespeicherte Strecken' },
    { path: '/activities', icon: '📈', label: 'Gefahrene Routen' },
    { path: '/statistics', icon: '📉', label: 'Statistiken' },
    { path: '/settings', icon: '⚙️', label: 'Einstellungen' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-left">
          <button 
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Menu"
          >
            ☰
          </button>
          <h1 className="app-title">🚴 VeloPulse</h1>
        </div>
        
        <div className="header-right">
          {user && (
            <>
              <div className="user-info">
                <span className="user-name">{user.displayName}</span>
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user.displayName} className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button className="btn-logout" onClick={handleLogout}>
                Abmelden
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Mobile Menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      <div className="layout-body">
        {/* Desktop Sidebar */}
        <aside className={`sidebar-nav ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="nav-menu">
            {menuItems.map((item) => (
              <button
                key={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-container">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-nav">
          <button
            className={`mobile-nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => handleNavigate('/dashboard')}
          >
            <span className="mobile-nav-icon">📊</span>
            <span className="mobile-nav-label">Dashboard</span>
          </button>
          <button
            className={`mobile-nav-item ${isActive('/tracking/start') ? 'active' : ''}`}
            onClick={() => handleNavigate('/tracking/start')}
          >
            <span className="mobile-nav-icon">🚴</span>
            <span className="mobile-nav-label">Tracking</span>
          </button>
          <button
            className={`mobile-nav-item ${isActive('/routes') ? 'active' : ''}`}
            onClick={() => handleNavigate('/routes')}
          >
            <span className="mobile-nav-icon">🗺️</span>
            <span className="mobile-nav-label">Strecken</span>
          </button>
          <button
            className={`mobile-nav-item ${isActive('/activities') ? 'active' : ''}`}
            onClick={() => handleNavigate('/activities')}
          >
            <span className="mobile-nav-icon">📈</span>
            <span className="mobile-nav-label">Routen</span>
          </button>
          <button
            className={`mobile-nav-item ${isActive('/settings') ? 'active' : ''}`}
            onClick={() => handleNavigate('/settings')}
          >
            <span className="mobile-nav-icon">⚙️</span>
            <span className="mobile-nav-label">Mehr</span>
          </button>
        </nav>

        {/* Mobile Fullscreen Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
            <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-menu-header">
                <h2>Menü</h2>
                <button onClick={() => setMobileMenuOpen(false)}>✕</button>
              </div>
              <nav className="mobile-menu-nav">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <span className="mobile-menu-icon">{item.icon}</span>
                    <span className="mobile-menu-label">{item.label}</span>
                  </button>
                ))}
                <button className="mobile-menu-item logout" onClick={handleLogout}>
                  <span className="mobile-menu-icon">🚪</span>
                  <span className="mobile-menu-label">Abmelden</span>
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
