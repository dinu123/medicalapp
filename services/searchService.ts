const API_BASE_URL = 'http://localhost:3008/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const globalSearch = async (query: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to search');
  } catch (error) {
    console.error('Global search error:', error);
    throw error;
  }
};