import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-600 font-medium">Verifying authorization...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white border border-rose-200 rounded-lg p-6 max-w-md w-full shadow-sm text-center">
          <h2 className="text-lg font-semibold text-rose-700">Access Restricted</h2>
          <p className="text-slate-600 mt-2 text-sm">
            Your current role (<span className="font-semibold">{user?.role}</span>) does not have
            permission to view this screen.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
