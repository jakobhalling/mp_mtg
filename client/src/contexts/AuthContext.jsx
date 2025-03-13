import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // API URL from environment variable
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API_URL}/users/me`, {
        headers: {
          'x-auth-token': token
        }
      })
      .then(response => {
        setCurrentUser(response.data);
      })
      .catch(error => {
        // If token is invalid, remove it
        localStorage.removeItem('token');
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [API_URL]);

  // Register function
  const register = async (email, password, username) => {
    try {
      setError('');
      const response = await axios.post(`${API_URL}/users/register`, {
        email,
        password,
        username
      });
      
      // Save token and user data
      localStorage.setItem('token', response.data.token);
      setCurrentUser(response.data.user);
      return response.data.user;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to register');
      throw error;
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setError('');
      const response = await axios.post(`${API_URL}/users/login`, {
        email,
        password
      });
      
      // Save token and user data
      localStorage.setItem('token', response.data.token);
      setCurrentUser(response.data.user);
      return response.data.user;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to login');
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  // Get auth header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'x-auth-token': token
      }
    };
  };

  const value = {
    currentUser,
    loading,
    error,
    register,
    login,
    logout,
    getAuthHeader
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
