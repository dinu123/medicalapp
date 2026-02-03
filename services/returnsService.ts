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

export const searchInvoices = async (searchTerm: string, type: 'customer' | 'supplier') => {
  try {
    const response = await fetch(`${API_BASE_URL}/returns/search?q=${encodeURIComponent(searchTerm)}&type=${type}`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to search invoices');
  } catch (error) {
    console.error('Search invoices error:', error);
    throw error;
  }
};

export const processCustomerReturn = async (returnData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/returns/customer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(returnData),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to process customer return');
  } catch (error) {
    console.error('Process customer return error:', error);
    throw error;
  }
};

export const processSupplierReturn = async (returnData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/returns/supplier`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(returnData),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to process supplier return');
  } catch (error) {
    console.error('Process supplier return error:', error);
    throw error;
  }
};

export const getReturns = async (type?: 'customer' | 'supplier') => {
  try {
    const url = type ? `${API_BASE_URL}/returns?type=${type}` : `${API_BASE_URL}/returns`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch returns');
  } catch (error) {
    console.error('Get returns error:', error);
    throw error;
  }
};