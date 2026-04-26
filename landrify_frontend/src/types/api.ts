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
  weather_current?: {
    observed_at?: string;
    temperature_c?: number;
    apparent_c?: number;
    humidity_pct?: number;
    wind_kph?: number;
    precipitation_mm?: number;
    weather_code?: number;
    forecast_7d?: {
      dates: string[];
      temp_max_c: (number | null)[];
      temp_min_c: (number | null)[];
      rainfall_mm: (number | null)[];
      wind_max_kph: (number | null)[];
    };
    source?: string;
  } | null;
  weather_historical?: {
    period?: string;
    baseline_temp_c?: number | null;
    recent_temp_c?: number | null;
    baseline_rain_mm?: number | null;
    recent_rain_mm?: number | null;
    annual?: Array<{ year: number; temp_mean_c: number | null; temp_max_c: number | null; temp_min_c: number | null; rainfall_mm: number | null }>;
    source?: string;
  } | null;
  weather_projection?: {
    horizons?: Record<string, { temp_mean_c: number | null; annual_rain_mm: number | null }>;
    source?: string;
  } | null;
  weather_summary?: string;
  report_generated: boolean;
  payment_status?: string;
  upgrade_prompt?: UpgradePrompt;
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
  dam_proximity: { nearest_dam: string; distance_km: number; risk_level: string; };
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
