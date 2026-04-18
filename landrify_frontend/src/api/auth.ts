import client from './client';
import type { AuthResponse, User } from '../types/api';

export const login = (data: any) =>
  client.post<AuthResponse>('/api/v1/auth/login/', data).then(r => r.data);

export const register = (data: any) =>
  client.post<AuthResponse>('/api/v1/auth/register/', data).then(r => r.data);

export const logout = () =>
  client.post('/api/v1/auth/logout/');

export const getMe = () =>
  client.get<User>('/api/v1/users/me/').then(r => r.data);

export const updateMe = (data: { full_name?: string; phone?: string; user_type?: string }) =>
  client.put<User>('/api/v1/users/me/', data).then(r => r.data);
