import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Navigation, Search, AlertCircle, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { createScan, demoScan } from '../api/scans';
import type { ScanResult } from '../types/api';

const quickLocations = [
  { label: 'Lekki, Lagos', latitude: 6.4698, longitude: 3.5852 },
  { label: 'Maitama, Abuja', latitude: 9.082, longitude: 7.492 },
  { label: 'Ibeju-Lekki', latitude: 6.41, longitude: 3.91 },
  { label: 'Port Harcourt', latitude: 4.8156, longitude: 7.0498 },
] as const;

const riskLevelColors: Record<string, string> = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#fb923c',
  critical: '#f87171',
  unknown: '#d1d5db',
};

const radiusRing = 70;
const circumference = 2 * Math.PI * radiusRing;

type GpsStatus = 'idle' | 'loading' | 'success' | 'error';

function formatRiskLevel(level?: string | null) {
  return (level ?? 'unknown').toUpperCase();
}

function InlineResult({ result }: { result: ScanResult }) {
  const riskScore = typeof result.risk_score === 'number' ? result.risk_score : 0;
  const ringColor = riskLevelColors[result.risk_level] ?? riskLevelColors.unknown;
  const strokeDashoffset = circumference - (Math.max(0, Math.min(riskScore, 100)) / 100) * circumference;

  return (
    <div className="space-y-8 mt-10">
      <div className="bg-white rounded-3xl border border-landrify-line shadow-lg p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">{result.scan_reference}</p>
            <h2 className="text-3xl font-serif text-landrify-ink mt-1">{result.address}</h2>
            <p className="text-gray-600 mt-1">{result.lga}, {result.state}</p>
          </div>
          <span className="px-4 py-1 rounded-full text-sm font-semibold bg-landrify-green/10 text-landrify-green">
            {result.scan_type === 'pro' ? 'Pro ⭐' : 'Basic'}
          </span>
        </div>
        {result.satellite_image_url && (
          <img
            src={result.satellite_image_url}
            alt="Satellite scan"
            className="w-full mt-6 rounded-2xl object-cover max-h-72"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      <div className="bg-white rounded-3xl border border-landrify-line shadow-lg p-8 flex flex-col items-center">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90">
            <circle cx="88" cy="88" r={radiusRing} fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="88"
              cy="88"
              r={radiusRing}
              fill="none"
              stroke={ringColor}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-landrify-ink">{riskScore}</span>
            <span className="text-xs tracking-widest text-gray-500">RISK SCORE</span>
          </div>
        </div>
        <p className="font-semibold mt-3">{formatRiskLevel(result.risk_level)}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-landrify-line shadow-lg p-6 space-y-3">
          <h3 className="text-xl font-serif">Legal Status</h3>
          {result.legal_status.is_government_land ? (
            <p className="text-red-600 font-semibold">
              ⚠️ GOVERNMENT ACQUISITION AREA{result.legal_status.authority ? ` — ${result.legal_status.authority}` : ''}
            </p>
          ) : (
            <p className="text-green-600 font-semibold">✅ No government acquisition records found</p>
          )}
          {result.legal_status.gazette_reference && (
            <p className="text-sm text-gray-700">Gazette: {result.legal_status.gazette_reference}</p>
          )}
          {result.legal_status.notes && <p className="text-sm text-gray-500">{result.legal_status.notes}</p>}
        </div>

        <div className="bg-white rounded-3xl border border-landrify-line shadow-lg p-6 space-y-3">
          <h3 className="text-xl font-serif">Environmental</h3>
          <p>
            <span className="font-semibold">Flood Risk:</span>{' '}
            {formatRiskLevel(result.environmental_risks.flood.risk_level)}
          </p>
          <p className="text-sm text-gray-500">{result.environmental_risks.flood.zone_name}</p>
          <p>
            <span className="font-semibold">Erosion Risk:</span>{' '}
            {formatRiskLevel(result.environmental_risks.erosion.risk_level)}
          </p>
          <p>
            <span className="font-semibold">Nearest Dam:</span> {result.environmental_risks.dam_proximity.nearest_dam}{' '}
            ({result.environmental_risks.dam_proximity.distance_km}km away)
          </p>
          <p><span className="font-semibold">Elevation:</span> {result.elevation_meters ?? 'N/A'}m above sea level</p>
        </div>
      </div>
    </div>
  );
}

export function NewScan() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState<number>(0.5);
  const [demoResult, setDemoResult] = useState<ScanResult | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [geoAccuracy, setGeoAccuracy] = useState<number | null>(null);
  const [flashCoordinates, setFlashCoordinates] = useState(false);

  const coordinateReady = useMemo(() => latitude.trim() !== '' && longitude.trim() !== '', [latitude, longitude]);

  useEffect(() => {
    if (gpsStatus !== 'success') return;
    const timer = window.setTimeout(() => {
      setGpsStatus('idle');
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [gpsStatus]);

  useEffect(() => {
    if (!flashCoordinates) return;
    const timer = window.setTimeout(() => setFlashCoordinates(false), 1000);
    return () => window.clearTimeout(timer);
  }, [flashCoordinates]);

  const useCurrentLocation = () => {
    setError(null);
    setGpsErrorMessage(null);
    setGpsStatus('loading');

    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGeoAccuracy(Math.round(position.coords.accuracy));
        setFlashCoordinates(true);
        setGpsStatus('success');
      },
      (geoError) => {
        setGpsStatus('error');
        setGpsErrorMessage(geoError.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDemoResult(null);

    if (!coordinateReady) {
      setError('Please provide both latitude and longitude.');
      return;
    }

    const lat = Number.parseFloat(latitude);
    const lng = Number.parseFloat(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Latitude and longitude must be valid numbers.');
      return;
    }

    try {
      setLoading(true);
      const response = await createScan({ latitude: lat, longitude: lng, radius_km: radiusKm });
      navigate(`/scan/${response.id}`);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        navigate('/login');
        return;
      }
      if (status === 402) {
        setError('You have used your 1 free scan. Upgrade to Pro for unlimited scans.');
        return;
      }
      setError(err.response?.data?.error || err.response?.data?.detail || 'Unable to initiate scan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoScan = async () => {
    setError(null);
    setDemoResult(null);
    try {
      setDemoLoading(true);
      const response = await demoScan('lekki_high_flood');
      setDemoResult(response);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Unable to run demo scan.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-serif font-light text-gray-900 mb-5">
          New <span className="italic font-medium">Verification</span>
        </h1>
        <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
          Scan land by GPS, preset coordinates, or manual latitude/longitude entry.
        </p>
      </motion.div>

      <div className="glass-card p-8 rounded-[2.5rem] shadow-2xl border-white/40 bg-white/60">
        <form onSubmit={handleScan} className="space-y-7">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={useCurrentLocation} variant="outline" className="rounded-2xl h-12 px-5" disabled={gpsStatus === 'loading'}>
                {gpsStatus === 'loading' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                    Getting your location...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-2 w-4 h-4" />
                    Use My Current Location
                  </>
                )}
              </Button>
            </div>

            {gpsStatus === 'loading' && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                📡 Locating you... Please allow location access if prompted by your browser.
              </div>
            )}

            {gpsStatus === 'success' && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                ✅ Location found — coordinates filled in below.
              </div>
            )}

            {gpsStatus === 'error' && gpsErrorMessage && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start justify-between gap-3">
                <p>⚠️ Could not get location: {gpsErrorMessage}. Please enter coordinates manually or use a quick-fill button below.</p>
                <button
                  type="button"
                  onClick={() => setGpsStatus('idle')}
                  className="text-amber-700 hover:text-amber-900"
                  aria-label="Dismiss GPS error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Quick Fill Locations</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {quickLocations.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  variant="ghost"
                  className="justify-start rounded-2xl border border-gray-200 h-12"
                  onClick={() => {
                    setLatitude(item.latitude.toFixed(6));
                    setLongitude(item.longitude.toFixed(6));
                    setGpsStatus('idle');
                    setGeoAccuracy(null);
                    setGpsErrorMessage(null);
                    setError(null);
                  }}
                >
                  <MapPin className="mr-2 w-4 h-4" /> {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Latitude</label>
              <Input
                type="number"
                step="0.000001"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="6.469800"
                className={`h-14 rounded-2xl transition-all duration-700 ${flashCoordinates ? 'bg-green-50 border-green-300 ring-1 ring-green-200' : ''}`}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Longitude</label>
              <Input
                type="number"
                step="0.000001"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="3.585200"
                className={`h-14 rounded-2xl transition-all duration-700 ${flashCoordinates ? 'bg-green-50 border-green-300 ring-1 ring-green-200' : ''}`}
              />
            </div>
          </div>

          {geoAccuracy !== null && (
            <p className="text-sm text-gray-500">
              📍 Accuracy: ±{geoAccuracy}m{geoAccuracy > 100 ? ' — Move outside for better accuracy' : ''}
            </p>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Radius (km)</label>
              <span className="text-sm text-gray-700">{radiusKm.toFixed(1)} km</span>
            </div>
            <Input
              type="range"
              min={0.1}
              max={10}
              step={0.1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number.parseFloat(e.target.value))}
              className="h-3 rounded-full px-0"
            />
            <Input
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number.parseFloat(e.target.value) || 0.1)}
              className="h-12 rounded-2xl mt-3"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
              {error}{' '}
              {error.includes('Upgrade to Pro') && (
                <Link className="underline font-semibold" to="/pricing">Go to pricing</Link>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Button type="submit" className="w-full h-16 text-lg group rounded-3xl" disabled={loading}>
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  <span>Initiating Scan...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <span>Initiate Verification Scan</span>
                  <Search className="ml-3 w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
              )}
            </Button>

            <Button type="button" variant="outline" className="w-full h-16 text-lg rounded-3xl" onClick={handleDemoScan} disabled={demoLoading}>
              {demoLoading ? 'Running Demo Scan...' : 'Demo Scan'}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 flex items-center justify-center space-x-2 text-gray-400 text-sm">
        <AlertCircle size={16} />
        <p>Need unlimited scans? <Link to="/pricing" className="text-landrify-green font-bold hover:underline">Upgrade plan</Link></p>
      </div>

      {demoResult && <InlineResult result={demoResult} />}
    </div>
  );
}
