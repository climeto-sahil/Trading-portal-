import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('trading_portal_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  // Helper to make authenticated API requests
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const currentToken = localStorage.getItem('trading_portal_token') || token;
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    const data = await response.json();

    if (response.status === 401) {
      logout();
    }

    return { response, data };
  };

  // Check existing session
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('trading_portal_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const { response, data } = await authFetch('/api/auth/me');
        if (response.ok && data.success) {
          setUser(data.user);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Session verification error:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (identifier, password) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthError(data.message || 'Login failed');
        return { success: false, message: data.message, status: data.status };
      }

      localStorage.setItem('trading_portal_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const msg = 'Network error or backend unreachable.';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  const register = async (userData) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      
      if (res.ok && data.success && data.token) {
        localStorage.setItem('trading_portal_token', data.token);
        setToken(data.token);
        setUser(data.user);
      }
      
      return { success: res.ok && data.success, data };
    } catch (err) {
      return { success: false, data: { message: 'Server connection error.' } };
    }
  };

  const forgotPassword = async (identifier) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      return { success: res.ok && data.success, data };
    } catch (err) {
      return {
        success: false,
        data: { message: 'Unable to connect to the server. Please check your connection and try again.' },
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('trading_portal_token');
    setToken(null);
    setUser(null);
    setAuthError(null);
  };

  const refreshUser = async () => {
    try {
      const { response, data } = await authFetch('/api/auth/me');
      if (response.ok && data.success) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  };

  const value = {
    user,
    role: user?.role || null,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    authError,
    setAuthError,
    login,
    register,
    forgotPassword,
    logout,
    refreshUser,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
