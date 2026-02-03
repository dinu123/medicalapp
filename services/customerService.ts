const API_BASE_URL = 'http://localhost:3008/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const searchCustomers = async (query: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to search customers');
  } catch (error) {
    console.error('Search customers error:', error);
    throw error;
  }
};

export const createOrUpdateCustomer = async (customerData: { name: string; phoneNumber: string }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(customerData),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to create/update customer');
  } catch (error) {
    console.error('Create/update customer error:', error);
    throw error;
  }
};