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

export const getPurchaseOrders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch purchase orders');
  } catch (error) {
    console.error('Get purchase orders error:', error);
    throw error;
  }
};

export const createPurchaseOrder = async (purchaseOrderData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(purchaseOrderData),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to create purchase order');
  } catch (error) {
    console.error('Create purchase order error:', error);
    throw error;
  }
};