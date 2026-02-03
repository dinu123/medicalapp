import { User } from '../types';

const API_BASE_URL = 'http://localhost:3008/api';

export const login = async (username: string, password: string): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      // Store token in localStorage
      localStorage.setItem('token', data.token);
      return data.user;
    }
    return null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};

export const register = async (username: string, password: string, role: string, email?: string): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, role, email }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.token);
      return data.user;
    }
    return null;
  } catch (error) {
    console.error('Register error:', error);
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    return null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};
