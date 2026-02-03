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

export const createSupplier = async (supplierData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/suppliers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(supplierData),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to create supplier');
  } catch (error) {
    console.error('Create supplier error:', error);
    throw error;
  }
};

export const getSuppliers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/suppliers`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch suppliers');
  } catch (error) {
    console.error('Get suppliers error:', error);
    throw error;
  }
};

export const searchSuppliers = async (searchTerm: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/suppliers/search?q=${encodeURIComponent(searchTerm)}`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to search suppliers');
  } catch (error) {
    console.error('Search suppliers error:', error);
    throw error;
  }
};