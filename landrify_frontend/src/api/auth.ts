import client from './client';
import type { AuthResponse, User } from '../types/api';

export const login = (data: any) =>
  client.post<AuthResponse>('/api/v1/auth/login/', data).then(r => r.data);

export const register = (data: any) =>
  client.post<AuthResponse>('/api/v1/auth/register/', data).then(r => r.data);

/**
 * Exchange a Google Identity Services credential (JWT ID token) for a Knox
 * session token. The backend verifies the token with Google and creates the
 * user account on first sign-in.
 */
export const loginWithGoogle = (credential: string) =>
  client
    .post<AuthResponse & { created?: boolean }>(
      '/api/v1/auth/google/',
      { id_token: credential },
      { headers: { 'X-Skip-Auth': 'true' } },
    )
    .then(r => r.data);

export const logout = () =>
  client.post('/api/v1/auth/logout/');

export const getMe = () =>
  client.get<User>('/api/v1/users/me/').then(r => r.data);

export const updateMe = (data: { full_name?: string; phone?: string; user_type?: string }) =>
  client.put<User>('/api/v1/users/me/', data).then(r => r.data);

export const activatePro = () =>
  client.post('/api/v1/users/me/activate-pro/').then(r => r.data);

export const verifyNin = (nin: string) =>
  client.post('/api/v1/payments/identity/verify-nin/', { nin }).then(r => r.data);
