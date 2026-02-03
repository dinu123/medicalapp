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

export const createProduct = async (productData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to create product');
  } catch (error) {
    console.error('Create product error:', error);
    throw error;
  }
};

export const getProducts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch products');
  } catch (error) {
    console.error('Get products error:', error);
    throw error;
  }
};

export const getInventoryStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/stats`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch inventory stats');
  } catch (error) {
    console.error('Get inventory stats error:', error);
    throw error;
  }
};

export const getFilteredProducts = async (filters: any) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const response = await fetch(`${API_BASE_URL}/products/filter?${params}`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch filtered products');
  } catch (error) {
    console.error('Get filtered products error:', error);
    throw error;
  }
};

export const searchProducts = async (searchTerm: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/search?q=${encodeURIComponent(searchTerm)}`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to search products');
  } catch (error) {
    console.error('Search products error:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, productData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to update product');
  } catch (error) {
    console.error('Update product error:', error);
    throw error;
  }
};

export const getExpiringProducts = async (filter: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/expiring?filter=${filter}`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to fetch expiring products');
  } catch (error) {
    console.error('Get expiring products error:', error);
    throw error;
  }
};

export const updateBatchDiscount = async (productId: string, batchId: string, discount: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/batch/${batchId}/discount`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ discount }),
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to update batch discount');
  } catch (error) {
    console.error('Update batch discount error:', error);
    throw error;
  }
};