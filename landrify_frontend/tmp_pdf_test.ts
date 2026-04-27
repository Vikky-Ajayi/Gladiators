import { jsPDF } from 'jspdf';
(jsPDF as any).prototype.save = function (filename: string) {
  (globalThis as any).__pdf = {
    filename,
    bytes: (this.output('arraybuffer') as ArrayBuffer).byteLength,
    text: String(this.output('string')).slice(0, 8000),
  };
};

const { downloadScanPdf } = await import('./src/lib/pdf.ts');

const scan = {
  id: 'scan-123',
  scan_reference: 'LND-TEST-123',
  status: 'completed',
  scan_type: 'basic',
  latitude: '6.469800000000000',
  longitude: '3.585200000000000',
  radius_km: '0.05',
  address_hint: 'Plot 42, Block C, Lekki Phase 1',
  address: 'Lekki Phase II, Eti Osa, Lagos State, Nigeria',
  state: 'Lagos',
  lga: 'Eti Osa',
  risk_score: 85,
  risk_level: 'critical',
  legal_status: {
    is_government_land: true,
    is_under_acquisition: true,
    authority: 'Lagos State Government',
    gazette_reference: 'Lagos Gazette',
    notes: 'Verify title and acquisition status.',
  },
  environmental_risks: {
    flood: { risk_level: 'very_high', zone_name: 'Lekki Coastal Zone', data_source: 'NIHSA', notes: 'Coastal flood risk.' },
    erosion: { risk_level: 'medium' },
    dam_proximity: { nearest_dam: 'Oyan Dam', distance_km: 21.2, risk_level: 'medium' },
  },
  elevation_meters: '5.00',
  satellite_image_url: 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/3.5852,6.4698,18/600x400@2x?access_token=test',
  weather: {
    current: { temperature_c: 28.9, humidity_percent: 76, precipitation_mm: 0, wind_speed_kmh: 12.1, weather_code: 3, description: 'Overcast' },
    historical: { avg_annual_rainfall_mm: 1525.35, rainfall_trend: 'decreasing', avg_max_temp_c: 29.32, extreme_rain_days_per_year: 1.36 },
    projection: {
      projection_2030: { avg_annual_rainfall_mm: 2458.56, avg_max_temp_c: 28.92 },
      projection_2035: { avg_annual_rainfall_mm: 2147.07, avg_max_temp_c: 28.98 },
      projection_2040: { avg_annual_rainfall_mm: 1649.25, avg_max_temp_c: 29.32 },
      projection_2050: { avg_annual_rainfall_mm: 1534.46, avg_max_temp_c: 30.13 },
      rainfall_change_2025_to_2050_percent: -39.66,
      flood_risk_trajectory: 'improving',
    },
    summary: 'Current, historical, and future climate conditions reviewed.',
  },
  weather_current: null,
  weather_historical: null,
  weather_projection: null,
  weather_summary: '',
  ai_report: '## Executive Summary\nA detailed report.\n\n## Current Environmental Conditions\nFlood and erosion notes.\n\n## Historical Weather Analysis\nTrend notes.\n\n## 5-Year Projection (2030)\nProjection notes.\n\n## 10-Year Projection (2035)\nProjection notes.\n\n## 15-Year Projection (2040)\nProjection notes.\n\n## 25-Year Projection (2050)\nProjection notes.\n\n## Legal Risk Assessment\nLegal notes.\n\n## Recommendations\n1. Verify title.\n\n## Risk Mitigation\nMitigation notes.\n\n## Disclaimer\nIndependent verification recommended.',
  ai_report_model: 'placeholder',
  ai_report_tokens: 0,
  report_generated: true,
  created_at: new Date().toISOString(),
};

await downloadScanPdf(scan as any);
const saved = (globalThis as any).__pdf;
console.log(JSON.stringify({
  filename: saved.filename,
  bytes: saved.bytes,
  hasDisclaimer: saved.text.includes('Disclaimer') || saved.text.includes('DISCLAIMER'),
  hasWeather: saved.text.includes('WEATHER') || saved.text.includes('Climate'),
  hasReport: saved.text.includes('AI REPORT') || saved.text.includes('Executive Summary'),
}, null, 2));
