import client from './client';
import type { PaginatedResponse, ScanResult } from '../types/api';

export const createScan = (payload: {
  latitude: number;
  longitude: number;
  radius_km: number;
  address_hint?: string;
}) => client.post<ScanResult>('/api/v1/scans/', payload).then(r => r.data);

export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
  type?: string;
  state?: string;
  lga?: string;
  place_id?: string | number;
}

/**
 * Forward-geocode a free-text address (Nigeria-bounded). Returns up to `limit`
 * candidate matches with coordinates and admin context.
 */
export const geocodeAddress = (q: string, limit = 8) =>
  client
    .get<{ query: string; results: GeocodeResult[] }>(
      '/api/v1/scans/geocode/',
      { params: { q, limit }, headers: { 'X-Skip-Auth': 'true' } },
    )
    .then(r => r.data);

export const reverseGeocode = (lat: number, lng: number) =>
  client
    .get<{ display_name: string; state: string; lga: string }>(
      '/api/v1/scans/reverse-geocode/',
      { params: { lat, lng }, headers: { 'X-Skip-Auth': 'true' } },
    )
    .then(r => r.data);

export const getScan = (id: string) =>
  client.get<ScanResult>(`/api/v1/scans/${id}/`).then(r => r.data);

export const getReport = (id: string) =>
  client.get(`/api/v1/scans/${id}/report/`).then(r => r.data);

export const demoScan = (location: string) =>
  client
    .post<ScanResult>('/api/v1/demo-scan/', { location }, { headers: { 'X-Skip-Auth': 'true' } })
    .then(r => r.data);

export const getUserScans = () =>
  client
    .get<PaginatedResponse<ScanResult>>('/api/v1/users/me/scans/')
    .then((r) => r.data);
