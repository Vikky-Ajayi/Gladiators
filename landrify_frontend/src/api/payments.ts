import client from './client';
import type { PaymentInitResponse } from '../types/api';

export interface PaymentConfig {
  mock_mode: boolean;
  environment: 'sandbox' | 'production' | string;
  currency: string;
  pro_price: number;
}

export const getPaymentConfig = () =>
  client.get<PaymentConfig>('/api/v1/payments/config/').then(r => r.data);

export const initializePayment = () =>
  client.post<PaymentInitResponse>('/api/v1/payments/initialize/').then(r => r.data);

export const verifyPayment = (reference: string) =>
  client.get<{ status: string; plan?: string; message?: string; expires_at?: string; response_code?: string }>(
    `/api/v1/payments/verify/?reference=${encodeURIComponent(reference)}`
  ).then(r => r.data);

export const mockConfirmPayment = (reference: string, outcome: 'success' | 'decline' = 'success') =>
  client.post<{ status: string; response_code?: string; gateway_ref?: string; message?: string }>(
    '/api/v1/payments/mock-confirm/', { reference, outcome }
  ).then(r => r.data);

export interface NinVerifyResponse {
  success: boolean;
  message?: string;
  nin_verified: boolean;
  nin_verified_at?: string;
  nin_last_four?: string;
  name_matched?: boolean;
  nin_name?: string;
  error?: string;
}

export const verifyNIN = (nin: string, dateOfBirth?: string) =>
  client.post<NinVerifyResponse>('/api/v1/payments/identity/verify-nin/', {
    nin, date_of_birth: dateOfBirth,
  }).then(r => r.data);

export const getNINStatus = () =>
  client.get<{ nin_verified: boolean; nin_verified_at?: string; nin_last_four?: string; message?: string }>(
    '/api/v1/payments/identity/nin-status/'
  ).then(r => r.data);
