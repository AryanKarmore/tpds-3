import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('civictrack_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 Unauthorized handling
    if (error.response && error.response.status === 401) {
      const isAuthRequest = error.config.url.includes('/auth/citizen/login') ||
                            error.config.url.includes('/auth/officer/login') ||
                            error.config.url.includes('/auth/citizen/register');
      if (!isAuthRequest) {
        localStorage.removeItem('civictrack_token');
        localStorage.removeItem('civictrack_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
