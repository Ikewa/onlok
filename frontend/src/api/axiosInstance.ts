import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api'),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('onlok_token');
    if (!token) {
      try {
        const rawUser = localStorage.getItem('onlok_user');
        if (rawUser) token = JSON.parse(rawUser).token || null;
      } catch {
        // fallback
      }
    }
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Every server response carries X-Trace-Id. Keep it on the error so a user
    // can quote the exact request that failed and it can be found in the logs.
    const traceId =
      error?.response?.headers?.['x-trace-id'] || error?.response?.data?.traceId || null;
    if (traceId) {
      error.traceId = traceId;
    }
    if (error.response && !error.response.data?.message) {
      error.response.data = {
        ...(error.response.data || {}),
        message: `Request failed with status ${error.response.status}.`,
      };
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('onlok_token');
      localStorage.removeItem('onlok_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
