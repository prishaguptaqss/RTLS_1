import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredPermission = null, requireAdmin = false }) => {
  const { isAuthenticated, loading, hasPermission, isAdmin } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2>Access Denied</h2>
        <p>You need admin privileges to access this page.</p>
      </div>
    );
  }

  // Check specific permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
          Required permission: {requiredPermission}
        </p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
