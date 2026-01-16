// services/api.js
import axios from 'axios';

// API configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Orders API functions
export const ordersAPI = {
  // Create new order
  create: async (orderData) => {
    try {
      console.log('📦 Sending order to backend:', orderData);
      
      const response = await api.post('/orders/create', orderData);
      return response;
    } catch (error) {
      console.error('Order creation API error:', error);
      
      // If there's a response error, throw it
      if (error.response) {
        throw {
          message: error.response.data?.message || 'Failed to create order',
          response: error.response.data,
          status: error.response.status
        };
      }
      
      // If network error
      throw {
        message: 'Network error. Please check your connection.',
        status: 0
      };
    }
  },
  
  // Get user orders
  getMyOrders: async () => {
    try {
      const userEmail = localStorage.getItem('userEmail') || 
                       JSON.parse(localStorage.getItem('user'))?.email;
      
      if (!userEmail) {
        throw new Error('User email not found');
      }
      
      return api.get(`/orders/my-orders?email=${encodeURIComponent(userEmail)}`);
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  },
  
  // Get order by ID
  getOrderById: async (orderId) => {
    return api.get(`/orders/${orderId}`);
  }
};

export default api;