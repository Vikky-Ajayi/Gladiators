import axios from 'axios';

const client = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'https://ais-dev-lwawat5fz3brfayelhlzyc-55978199327.europe-west2.run.app', // Fallback for dev
  headers: { 'Content-Type': 'application/json' },
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
    if (err.response?.status === 401) {
      localStorage.removeItem('landrify_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
