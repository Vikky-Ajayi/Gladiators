import axios from 'axios';

const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is not set. Add it to your frontend .env file.');
}

const client = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

// Attach token to every request automatically
client.interceptors.request.use((config) => {
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
    const detail = err.response?.data?.detail || err.response?.data?.error;
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
