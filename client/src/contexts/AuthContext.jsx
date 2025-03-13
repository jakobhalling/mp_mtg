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
      console.log('Checking authentication with token');
      // Use a more resilient approach to handle API errors
      const checkAuth = async () => {
        try {
          const response = await axios.get(`${API_URL}/users/me`, {
            headers: {
              'x-auth-token': token
            }
          });
          console.log('Authentication successful:', response.data);
          setCurrentUser(response.data);
        } catch (error) {
          console.error('Authentication error:', error.message);
          // If token is invalid or server error, remove it
          localStorage.removeItem('token');
          
          // Try alternative endpoint if the first one fails
          try {
            console.log('Trying alternative authentication endpoint');
            const altResponse = await axios.get(`${API_URL}/auth/me`, {
              headers: {
                'x-auth-token': token
              }
            });
            console.log('Alternative authentication successful:', altResponse.data);
            setCurrentUser(altResponse.data);
          } catch (altError) {
            console.error('Alternative authentication failed:', altError.message);
          }
        } finally {
          setLoading(false);
        }
      };
      
      checkAuth();
    } else {
      setLoading(false);
    }
  }, [API_URL]);

  // Register function
  const register = async (email, password, username) => {
    try {
      setError('');
      console.log('Attempting to register user:', username);
      
      // Try primary endpoint
      try {
        const response = await axios.post(`${API_URL}/users/register`, {
          email,
          password,
          username
        });
        
        // Save token and user data
        localStorage.setItem('token', response.data.token);
        setCurrentUser(response.data.user);
        console.log('Registration successful');
        return response.data.user;
      } catch (primaryError) {
        console.error('Primary registration endpoint failed:', primaryError.message);
        
        // Try alternative endpoint
        const altResponse = await axios.post(`${API_URL}/auth/register`, {
          email,
          password,
          username
        });
        
        // Save token and user data
        localStorage.setItem('token', altResponse.data.token);
        setCurrentUser(altResponse.data.user);
        console.log('Registration successful via alternative endpoint');
        return altResponse.data.user;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to register';
      console.error('Registration failed:', errorMessage);
      setError(errorMessage);
      throw error;
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setError('');
      console.log('Attempting to login user:', email);
      
      // Try primary endpoint
      try {
        const response = await axios.post(`${API_URL}/users/login`, {
          email,
          password
        });
        
        // Save token and user data
        localStorage.setItem('token', response.data.token);
        setCurrentUser(response.data.user);
        console.log('Login successful');
        return response.data.user;
      } catch (primaryError) {
        console.error('Primary login endpoint failed:', primaryError.message);
        
        // Try alternative endpoint
        const altResponse = await axios.post(`${API_URL}/auth/login`, {
          email,
          password
        });
        
        // Save token and user data
        localStorage.setItem('token', altResponse.data.token);
        setCurrentUser(altResponse.data.user);
        console.log('Login successful via alternative endpoint');
        return altResponse.data.user;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to login';
      console.error('Login failed:', errorMessage);
      setError(errorMessage);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeDeckId');
    localStorage.removeItem('userDeck');
    localStorage.removeItem('activeFullDeck');
    setCurrentUser(null);
    console.log('User logged out');
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
