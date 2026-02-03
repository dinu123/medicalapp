const API_BASE_URL = 'http://localhost:3008/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const createTransaction = async (transactionData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(transactionData),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to create transaction');
  } catch (error) {
    console.error('Create transaction error:', error);
    throw error;
  }
};

export const getTransactionStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/stats`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch transaction stats');
  } catch (error) {
    console.error('Get transaction stats error:', error);
    throw error;
  }
};

export const getFilteredTransactions = async (filters: any) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        if (Array.isArray(filters[key])) {
          filters[key].forEach((value: string) => params.append(key, value));
        } else {
          params.append(key, filters[key]);
        }
      }
    });
    
    const response = await fetch(`${API_BASE_URL}/transactions/filter?${params}`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch filtered transactions');
  } catch (error) {
    console.error('Get filtered transactions error:', error);
    throw error;
  }
};

export const getTransactions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch transactions');
  } catch (error) {
    console.error('Get transactions error:', error);
    throw error;
  }
};

export const getChartData = async (range: 'day' | 'week' | 'month') => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/chart/${range}`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch chart data');
  } catch (error) {
    console.error('Get chart data error:', error);
    throw error;
  }
};