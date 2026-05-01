import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('scaf_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('scaf_token');
      localStorage.removeItem('scaf_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
