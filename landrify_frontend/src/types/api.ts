export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  user_type?: string;
  plan: 'basic' | 'pro';
  is_pro: boolean;
  has_active_subscription?: boolean;
  can_scan: boolean;
  scans_remaining: number | 'unlimited';
  basic_scan_used?: boolean;
  nin_verified: boolean;
  nin_verified_at?: string | null;
  nin_last_four: string | null;
  pro_expires_at: string | null;
  created_at?: string;
}

export interface ScanResult {
  id: string;
  scan_reference: string;
  status: 'processing' | 'completed' | 'failed';
  created_at?: string;
  scan_type: 'basic' | 'pro';
  latitude: string;
  longitude: string;
  radius_km: string;
  address_hint?: string;
  address: string;
  state: string;
  lga: string;
  risk_score: number | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  legal_status: LegalStatus;
  environmental_risks: EnvironmentalRisks;
  elevation_meters: string | null;
  satellite_image_url: string | null;
  ai_report: string;
  ai_report_model: string;
  ai_report_tokens: number | null;
  weather?: WeatherBundle | null;
  weather_current?: WeatherCurrent | null;
  weather_historical?: WeatherHistorical | null;
  weather_projection?: WeatherProjection | null;
  weather_summary?: string;
  report_generated: boolean;
  payment_status?: string;
  upgrade_prompt?: UpgradePrompt;
}

export interface WeatherCurrent {
  temperature_c?: number | null;
  humidity_percent?: number | null;
  precipitation_mm?: number | null;
  wind_speed_kmh?: number | null;
  weather_code?: number | null;
  description?: string;
}

export interface WeatherHistorical {
  avg_annual_rainfall_mm?: number | null;
  total_rainfall_period_mm?: number | null;
  rainfall_trend?: 'increasing' | 'stable' | 'decreasing' | string;
  avg_max_temp_c?: number | null;
  avg_min_temp_c?: number | null;
  temp_trend?: 'warming' | 'stable' | 'cooling' | string;
  years_analysed?: number | null;
  wettest_year?: number | null;
  wettest_year_rainfall_mm?: number | null;
  driest_year?: number | null;
  driest_year_rainfall_mm?: number | null;
  extreme_rain_days_per_year?: number | null;
}

export interface WeatherProjectionSnapshot {
  avg_annual_rainfall_mm?: number | null;
  avg_max_temp_c?: number | null;
}

export interface WeatherProjection {
  projection_2030?: WeatherProjectionSnapshot | null;
  projection_2035?: WeatherProjectionSnapshot | null;
  projection_2040?: WeatherProjectionSnapshot | null;
  projection_2050?: WeatherProjectionSnapshot | null;
  rainfall_change_2025_to_2050_percent?: number | null;
  temp_change_2025_to_2050_c?: number | null;
  flood_risk_trajectory?: 'worsening' | 'stable' | 'improving' | string;
  model?: string;
}

export interface WeatherBundle {
  current?: WeatherCurrent | null;
  historical?: WeatherHistorical | null;
  projection?: WeatherProjection | null;
  summary?: string;
}

export interface LegalStatus {
  is_government_land: boolean;
  is_under_acquisition: boolean;
  authority: string;
  gazette_reference: string;
  notes: string;
}

export interface EnvironmentalRisks {
  flood: { risk_level: string; zone_name: string; data_source: string; };
  erosion: { risk_level: string; };
  dam_proximity: { nearest_dam: string; distance_km: number | string | null; risk_level: string; };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PaymentInitResponse {
  transaction_reference: string;
  authorization_url: string;
  amount: number;
  currency: string;
  plan?: string;
  description?: string;
  provider?: string;
}

export interface UpgradePrompt {
  title?: string;
  message: string;
  price?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
