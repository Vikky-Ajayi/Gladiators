import client from './client';
import type { ScanResult } from '../types/api';

export const createScan = (payload: {
  latitude: number;
  longitude: number;
  radius_km: number;
}) => client.post<ScanResult>('/api/v1/scans/', payload).then(r => r.data);

export const getScan = (id: string) =>
  client.get<ScanResult>(`/api/v1/scans/${id}/`).then(r => r.data);

export const getReport = (id: string) =>
  client.get(`/api/v1/scans/${id}/report/`).then(r => r.data);

export const demoScan = (location: string) =>
  client.post<ScanResult>('/api/v1/demo-scan/', { location }).then(r => r.data);
