import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

const extractErrorMessage = (data: any): string | null => {
  if (!data) return null;
  if (typeof data === 'string') {
    if (data.toLowerCase().includes('<!doctype html')) {
      return 'Server configuration error. Please contact support with this request time.';
    }
    return data;
  }

  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.error === 'string') return data.error;
  if (typeof data.message === 'string') return data.message;

  if (typeof data === 'object') {
    for (const [field, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        return field === 'non_field_errors' ? String(value[0]) : `${field}: ${value[0]}`;
      }
      if (typeof value === 'string') {
        return field === 'non_field_errors' ? value : `${field}: ${value}`;
      }
    }
  }

  return null;
};

const client = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

// Attach token to every request automatically
client.interceptors.request.use((config) => {
  const skipAuth = Boolean(config.headers?.['X-Skip-Auth']);

  if (skipAuth && config.headers) {
    delete config.headers['X-Skip-Auth'];
    delete config.headers.Authorization;
    return config;
  }

  const token = localStorage.getItem('landrify_token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const detail = extractErrorMessage(err.response?.data);
    err.userMessage =
      detail ||
      (status === 404
        ? 'The requested resource was not found.'
        : status === 500
          ? 'Server error. Please try again in a moment.'
          : 'Request failed. Please try again.');

    if (err.response?.status === 401) {
      localStorage.removeItem('landrify_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
