import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  ClipboardList,
  ShoppingCart,
  Boxes,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Enquiries', path: '/enquiries', icon: FileText },
    { name: 'Quotations', path: '/quotations', icon: ClipboardList },
    { name: 'Sales Orders', path: '/sales-orders', icon: ShoppingCart },
    { name: 'Inventory Stock', path: '/inventory', icon: Boxes },
  ];

  return (
    <header className="navbar">
      <div className="nav-container">
        {/* Logo & Brand Title */}
        <div className="nav-brand">
          <div className="nav-logo-badge">
            IND-ERP
          </div>
          <div>
            <span className="nav-title">
              Industrial Manufacturing ERP
            </span>
            <span className="nav-subtitle">
              B2B Supply Chain & Inventory Portal
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="nav-links">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={16} />
                <span>{link.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Actions */}
        <div className="nav-user-section">
          <div className="nav-user-info">
            <User size={16} color="#94a3b8" />
            <div>
              <span className="nav-user-name">
                {user?.name}
              </span>
              <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-sales'}`}>
                {user?.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            title="Sign Out"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-toggle"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''} flex items-center gap-2`
                }
                style={{ width: '100%' }}
              >
                <Icon size={16} />
                <span>{link.name}</span>
              </NavLink>
            );
          })}
          <div className="flex items-center justify-between" style={{ paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid var(--border-dark)' }}>
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              {user?.name} ({user?.role})
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-danger btn-sm"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
