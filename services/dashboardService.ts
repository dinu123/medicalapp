const API_BASE_URL = 'http://localhost:3008/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const getDashboardStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch dashboard stats');
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    throw error;
  }
};

export const getDashboardAlerts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/alerts`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch dashboard alerts');
  } catch (error) {
    console.error('Get dashboard alerts error:', error);
    throw error;
  }
};