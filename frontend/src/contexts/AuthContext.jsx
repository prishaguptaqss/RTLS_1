import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, getCurrentUser, logout as apiLogout } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
          setPermissions(userData.permissions || []);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          localStorage.removeItem('authToken');
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email, password: '***' });
      const response = await apiLogin({ email, password });
      console.log('Login API response:', response);
      const { access_token } = response;

      // Store token
      localStorage.setItem('authToken', access_token);
      console.log('Token stored, fetching user data...');

      // Fetch user data
      const userData = await getCurrentUser();
      console.log('User data fetched:', userData);
      setUser(userData);
      setPermissions(userData.permissions || []);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Login failed - Full error:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);

      let errorMessage = 'Login failed';
      const detail = error.response?.data?.detail;

      if (detail) {
        if (Array.isArray(detail)) {
          // Handle validation errors (array of error objects)
          errorMessage = detail.map(err => err.msg || JSON.stringify(err)).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
      setPermissions([]);
      setIsAuthenticated(false);
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.is_admin) return true; // Admins have all permissions
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList) => {
    if (!user) return false;
    if (user.is_admin) return true;
    return permissionList.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (permissionList) => {
    if (!user) return false;
    if (user.is_admin) return true;
    return permissionList.every(permission => permissions.includes(permission));
  };

  const value = {
    user,
    permissions,
    loading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: user?.is_admin || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
