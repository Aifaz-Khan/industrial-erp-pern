import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer token to all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses and normalize error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on authentication failure
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const message =
      error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// 1. Auth Service
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
};

// 2. Customer Service
export const customerApi = {
  getAll: (search = '') => api.get(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
};

// 3. Product & Inventory Service
export const productApi = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  getInventory: () => api.get('/inventory'),
};

// 4. Enquiry Service
export const enquiryApi = {
  getAll: (status = '') => api.get(`/enquiries${status ? `?status=${status}` : ''}`),
  getById: (id) => api.get(`/enquiries/${id}`),
  create: (data) => api.post('/enquiries', data),
  updateStatus: (id, status) => api.patch(`/enquiries/${id}/status`, { status }),
};

// 5. Quotation Service
export const quotationApi = {
  getAll: (status = '') => api.get(`/quotations${status ? `?status=${status}` : ''}`),
  getById: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  updateStatus: (id, status) => api.patch(`/quotations/${id}/status`, { status }),
  convertToOrder: (id) => api.post(`/quotations/${id}/convert`),
};

// 6. Sales Order Service
export const orderApi = {
  getAll: (status = '') => api.get(`/sales-orders${status ? `?status=${status}` : ''}`),
  getById: (id) => api.get(`/sales-orders/${id}`),
  confirm: (id) => api.post(`/sales-orders/${id}/confirm`),
  dispatch: (id, data) => api.post(`/sales-orders/${id}/dispatch`, data),
  cancel: (id) => api.post(`/sales-orders/${id}/cancel`),
};

export default api;
