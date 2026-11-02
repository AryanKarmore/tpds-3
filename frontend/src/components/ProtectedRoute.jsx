import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader message="Verifying session..." />;
  }

  if (!user) {
    // If accessing officer routes, redirect to officer login
    if (role === 'officer' || location.pathname.startsWith('/officer')) {
      return <Navigate to="/officer/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Cross-role redirects
  if (role && user.role !== role) {
    if (user.role === 'citizen') {
      return <Navigate to="/officer/login" replace />;
    } else if (user.role === 'officer') {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

