import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  Crosshair,
  Layers,
  Link2,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

import { createScan, demoScan, geocodeAddress, reverseGeocode, type GeocodeResult } from '../api/scans';
import { MapPreview } from '../components/MapPreview';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { ScanResult } from '../types/api';

const QUICK_LOCATIONS = [
  { label: 'Lekki, Lagos', sub: 'Coastal flood exposure', latitude: 6.4698, longitude: 3.5852 },
  { label: 'Maitama, Abuja', sub: 'Core FCT district', latitude: 9.082, longitude: 7.492 },
  { label: 'Ibeju-Lekki', sub: 'Government acquisition overlap', latitude: 6.41, longitude: 3.91 },
  { label: 'Port Harcourt', sub: 'Niger Delta tidal exposure', latitude: 4.8156, longitude: 7.0498 },
  { label: 'Lokoja, Kogi', sub: 'Niger-Benue confluence', latitude: 7.8023, longitude: 6.7333 },
  { label: 'Onitsha, Anambra', sub: 'River Niger floodplain', latitude: 6.15, longitude: 6.7833 },
] as const;

const RADIUS_OPTIONS = [
  {
    key: 'single-plot',
    label: 'Single Plot',
    radiusKm: 0.05,
    description: '~50m — one residential plot',
  },
  {
    key: 'small-estate',
    label: 'Small Estate',
    radiusKm: 0.25,
    description: '~250m — a small compound or estate',
  },
  {
    key: 'neighbourhood',
    label: 'Neighbourhood',
    radiusKm: 0.5,
    description: '~500m — a street or small area',
  },
  {
    key: 'large-area',
    label: 'Large Area',
    radiusKm: 1.0,
    description: '~1km — a large estate or block',
  },
  {
    key: 'town-boundary',
    label: 'Town Boundary',
    radiusKm: 2.5,
    description: '~2.5km — a village or district',
  },
  {
    key: 'custom',
    label: 'Custom',
    radiusKm: null,
    description: 'Enter exact km value',
  },
] as const;

const TAB_CONFIG = [
  { key: 'address', label: 'Address', icon: Search, help: 'Search any Nigerian street, community, landmark, LGA, or state.' },
  { key: 'shared', label: 'Shared Link', icon: Link2, help: 'Paste a Google Maps share link or raw lat,lng text.' },
  { key: 'gps', label: 'My Location', icon: Crosshair, help: 'Use your current GPS position.' },
  { key: 'map', label: 'Pick on Map', icon: Layers, help: 'Drop a pin manually on the map.' },
  { key: 'manual', label: 'Coordinates', icon: Compass, help: 'Type latitude and longitude directly.' },
  { key: 'quick', label: 'Quick Picks', icon: Sparkles, help: 'Load a popular Nigerian location instantly.' },
] as const;

const OLIVE_CLASSES = {
  active: 'border-[#6b8e23] bg-[#6b8e23]/10 text-[#556b2f] ring-1 ring-[#6b8e23]/30',
  idle: 'border-landrify-line hover:border-[#6b8e23]/40 hover:bg-[#6b8e23]/5 text-gray-900',
};

type ScanMethod = (typeof TAB_CONFIG)[number]['key'];
type GpsState = 'idle' | 'loading' | 'success';

function formatRiskLevel(level?: string | null) {
  return (level ?? 'unknown').replace('_', ' ').toUpperCase();
}

function isWithinNigeria(latitude: number, longitude: number) {
  return latitude >= 4 && latitude <= 14 && longitude >= 2.5 && longitude <= 15;
}

function parseSharedLocation(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const patterns = [
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /\/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;

    const latitude = Number.parseFloat(match[1]);
    const longitude = Number.parseFloat(match[2]);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }
    if (!isWithinNigeria(latitude, longitude)) {
      return { latitude, longitude, valid: false };
    }
    return { latitude, longitude, valid: true };
  }

  return null;
}

function InlineResult({ result }: { result: ScanResult }) {
  return (
    <div className="mt-10 rounded-3xl border border-landrify-line bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">{result.scan_reference}</p>
          <h2 className="mt-1 text-2xl font-serif text-landrify-ink">{result.address || result.address_hint || 'Scanned location'}</h2>
          <p className="mt-1 text-sm text-gray-500">{result.lga}, {result.state}</p>
        </div>
        <span className="rounded-full bg-landrify-green/10 px-4 py-1 text-sm font-semibold text-landrify-green">
          {result.scan_type === 'pro' ? 'Pro' : 'Basic'}
        </span>
      </div>

      {result.satellite_image_url && (
        <img
          src={result.satellite_image_url}
          alt="Satellite preview"
          className="mt-6 min-h-[180px] w-full rounded-2xl object-cover md:min-h-[220px]"
          referrerPolicy="no-referrer"
        />
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-landrify-line p-4">
          <p className="text-xs uppercase tracking-widest text-gray-500">Risk Score</p>
          <p className="mt-1 text-3xl font-bold text-landrify-ink">{result.risk_score ?? '—'}</p>
          <p className="text-sm text-gray-500">{formatRiskLevel(result.risk_level)}</p>
        </div>
        <div className="rounded-2xl border border-landrify-line p-4">
          <p className="text-xs uppercase tracking-widest text-gray-500">Flood Risk</p>
          <p className="mt-1 text-lg font-semibold text-landrify-ink">
            {formatRiskLevel(result.environmental_risks?.flood?.risk_level)}
          </p>
          <p className="text-sm text-gray-500">{result.environmental_risks?.flood?.zone_name || 'No zone name available'}</p>
        </div>
      </div>
    </div>
  );
}

export function NewScan() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ScanMethod>('address');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [confirmedAddress, setConfirmedAddress] = useState('');
  const [selectedLocationLabel, setSelectedLocationLabel] = useState('');
  const [plotDescription, setPlotDescription] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsState, setGpsState] = useState<GpsState>('idle');

  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const addressDebounceRef = useRef<number | null>(null);

  const [sharedLocationInput, setSharedLocationInput] = useState('');
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');

  const [radiusKey, setRadiusKey] = useState<(typeof RADIUS_OPTIONS)[number]['key']>('single-plot');
  const [customRadiusKm, setCustomRadiusKm] = useState('0.05');

  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoResult, setDemoResult] = useState<ScanResult | null>(null);

  const radiusKm = useMemo(() => {
    const selected = RADIUS_OPTIONS.find((option) => option.key === radiusKey);
    if (!selected) return 0.05;
    if (selected.radiusKm != null) return selected.radiusKm;

    const numericCustom = Number.parseFloat(customRadiusKm);
    return Number.isFinite(numericCustom) ? numericCustom : 0;
  }, [customRadiusKm, radiusKey]);

  const radiusMeters = useMemo(() => Math.round(radiusKm * 1000), [radiusKm]);
  const isLocationReady = latitude != null && longitude != null;

  useEffect(() => {
    if (activeTab !== 'address') return;
    if (addressDebounceRef.current) window.clearTimeout(addressDebounceRef.current);

    const query = addressQuery.trim();
    if (query.length < 3) {
      setAddressResults([]);
      setAddressSearching(false);
      return;
    }

    setAddressSearching(true);
    addressDebounceRef.current = window.setTimeout(async () => {
      try {
        const data = await geocodeAddress(query, 8);
        setAddressResults(data.results ?? []);
      } catch {
        setAddressResults([]);
      } finally {
        setAddressSearching(false);
      }
    }, 300);

    return () => {
      if (addressDebounceRef.current) window.clearTimeout(addressDebounceRef.current);
    };
  }, [activeTab, addressQuery]);

  const applyCoordinates = async (
    newLatitude: number,
    newLongitude: number,
    options?: { label?: string; address?: string; accuracyMeters?: number | null },
  ) => {
    setLatitude(newLatitude);
    setLongitude(newLongitude);
    setAccuracy(options?.accuracyMeters ?? null);
    setError(null);

    if (options?.label) {
      setSelectedLocationLabel(options.label);
    }

    if (options?.address) {
      setConfirmedAddress(options.address);
      if (!options?.label) {
        setSelectedLocationLabel(options.address);
      }
      return;
    }

    try {
      const reverse = await reverseGeocode(newLatitude, newLongitude);
      const resolvedAddress = reverse.display_name || `${newLatitude.toFixed(6)}, ${newLongitude.toFixed(6)}`;
      setConfirmedAddress(resolvedAddress);
      if (!options?.label) {
        setSelectedLocationLabel(resolvedAddress);
      }
    } catch {
      const fallbackLabel = `${newLatitude.toFixed(6)}, ${newLongitude.toFixed(6)}`;
      setConfirmedAddress(fallbackLabel);
      if (!options?.label) {
        setSelectedLocationLabel(fallbackLabel);
      }
    }
  };

  const handleAddressPick = async (result: GeocodeResult) => {
    setAddressQuery(result.label);
    setAddressResults([]);
    await applyCoordinates(result.latitude, result.longitude, {
      label: result.label,
      address: result.label,
    });
  };

  const handleUseGps = () => {
    setError(null);
    setGpsState('loading');

    if (!('geolocation' in navigator)) {
      setGpsState('idle');
      setError('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await applyCoordinates(position.coords.latitude, position.coords.longitude, {
          label: 'Current GPS location',
          accuracyMeters: Math.round(position.coords.accuracy),
        });
        setGpsState('success');
      },
      (positionError) => {
        setGpsState('idle');
        setError(positionError.message || 'Could not read your location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleMapPick = async (newLatitude: number, newLongitude: number) => {
    await applyCoordinates(newLatitude, newLongitude, {
      label: 'Map pin location',
    });
  };

  const handleSharedLocationApply = async () => {
    const parsed = parseSharedLocation(sharedLocationInput);
    if (!parsed) {
      setError('Paste a Google Maps share link or coordinates in lat,lng format.');
      return;
    }
    if (!parsed.valid) {
      setError('The parsed coordinates are outside Nigeria (lat 4–14, lng 2.5–15).');
      return;
    }

    await applyCoordinates(parsed.latitude, parsed.longitude, {
      label: 'Shared map link',
    });
  };

  const handleManualApply = async () => {
    const parsedLatitude = Number.parseFloat(manualLatitude);
    const parsedLongitude = Number.parseFloat(manualLongitude);

    if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
      setError('Enter valid numeric latitude and longitude.');
      return;
    }
    if (!isWithinNigeria(parsedLatitude, parsedLongitude)) {
      setError('Coordinates appear outside Nigeria (lat 4–14, lng 2.5–15).');
      return;
    }

    await applyCoordinates(parsedLatitude, parsedLongitude, {
      label: 'Manual coordinates',
    });
  };

  const handleQuickPick = async (location: (typeof QUICK_LOCATIONS)[number]) => {
    await applyCoordinates(location.latitude, location.longitude, {
      label: location.label,
      address: location.label,
    });
  };

  const clearSelection = () => {
    setLatitude(null);
    setLongitude(null);
    setConfirmedAddress('');
    setSelectedLocationLabel('');
    setAccuracy(null);
    setGpsState('idle');
  };

  const handleSubmit = async () => {
    if (!isLocationReady) {
      setError('Pick a location before running a scan.');
      return;
    }
    if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
      setError('Enter a valid radius in kilometres.');
      return;
    }

    setLoading(true);
    setError(null);

    const addressHint = [plotDescription.trim(), confirmedAddress.trim()].filter(Boolean).join(' | ');

    try {
      const result = await createScan({
        latitude,
        longitude,
        radius_km: radiusKm,
        address_hint: addressHint,
      });
      navigate(`/scans/${result.id}`);
    } catch (submitError: any) {
      setError(submitError?.response?.data?.error || submitError?.response?.data?.detail || 'Failed to create scan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoScan = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      const result = await demoScan('lekki_high_flood');
      setDemoResult(result);
    } catch (demoError: any) {
      setError(demoError?.response?.data?.error || 'Demo scan failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white py-12">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-landrify-green">
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-4xl font-serif text-landrify-ink md:text-5xl">Run a new scan</h1>
          <p className="mt-2 max-w-3xl text-gray-500">
            Choose how you want to locate the land, add any plot description you have, then pick the scan radius that best matches the parcel.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.08fr_1fr]">
          <div className="overflow-hidden rounded-3xl border border-landrify-line bg-white shadow-sm">
            <div className="border-b border-landrify-line bg-gray-50/70 px-2 pt-2">
              <div className="flex flex-wrap gap-1">
                {TAB_CONFIG.map((tab) => {
                  const Icon = tab.icon;
                  const active = tab.key === activeTab;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.key);
                        setError(null);
                      }}
                      className={
                        'flex items-center gap-2 rounded-t-xl border px-3.5 py-2.5 text-sm transition-colors ' +
                        (active
                          ? 'border-landrify-line border-b-white bg-white font-semibold text-landrify-green'
                          : 'border-transparent text-gray-500 hover:text-gray-800')
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6 p-6 md:p-8">
              <p className="text-sm text-gray-500">{TAB_CONFIG.find((tab) => tab.key === activeTab)?.help}</p>

              {activeTab === 'address' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={addressQuery}
                      onChange={(event) => setAddressQuery(event.target.value)}
                      placeholder="Search any Nigerian address, landmark, town, LGA, or state"
                      className="h-12 pl-12"
                    />
                    {addressSearching && (
                      <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                    )}
                  </div>

                  {addressResults.length > 0 && (
                    <div className="max-h-80 overflow-y-auto rounded-2xl border border-landrify-line">
                      {addressResults.map((result) => (
                        <button
                          key={`${result.place_id ?? `${result.latitude}-${result.longitude}`}`}
                          type="button"
                          onClick={() => void handleAddressPick(result)}
                          className="flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-emerald-50/60"
                        >
                          <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-landrify-green" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-gray-900">{result.label}</p>
                            <p className="mt-0.5 text-[11px] text-gray-500">
                              {result.latitude.toFixed(5)}, {result.longitude.toFixed(5)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {confirmedAddress && activeTab === 'address' && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
                      <span className="font-semibold">Selected address:</span> {confirmedAddress}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'shared' && (
                <div className="space-y-3">
                  <Input
                    value={sharedLocationInput}
                    onChange={(event) => setSharedLocationInput(event.target.value)}
                    placeholder="Paste a Google Maps share link or 6.4698,3.5852"
                    className="h-12"
                  />
                  <Button type="button" variant="outline" className="h-11" onClick={() => void handleSharedLocationApply()}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Use this shared location
                  </Button>
                </div>
              )}

              {activeTab === 'gps' && (
                <div className="space-y-3">
                  <Button type="button" className="h-12 w-full" onClick={handleUseGps} disabled={gpsState === 'loading'}>
                    {gpsState === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : gpsState === 'success' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    <span className="ml-2">
                      {gpsState === 'loading'
                        ? 'Finding your location…'
                        : gpsState === 'success'
                          ? 'GPS coordinates captured'
                          : 'Use my current location'}
                    </span>
                  </Button>
                  {accuracy != null && (
                    <p className="text-xs text-gray-500">GPS accuracy ±{accuracy}m.</p>
                  )}
                </div>
              )}

              {activeTab === 'map' && (
                <p className="text-sm text-gray-500">
                  Click anywhere on the map to drop a pin, then move it until the location matches the parcel.
                </p>
              )}

              {activeTab === 'manual' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={manualLatitude}
                    onChange={(event) => setManualLatitude(event.target.value)}
                    placeholder="Latitude"
                  />
                  <Input
                    value={manualLongitude}
                    onChange={(event) => setManualLongitude(event.target.value)}
                    placeholder="Longitude"
                  />
                  <Button type="button" variant="outline" className="h-11 sm:col-span-2" onClick={() => void handleManualApply()}>
                    <Compass className="mr-2 h-4 w-4" />
                    Use these coordinates
                  </Button>
                </div>
              )}

              {activeTab === 'quick' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {QUICK_LOCATIONS.map((location) => (
                    <button
                      key={location.label}
                      type="button"
                      onClick={() => void handleQuickPick(location)}
                      className="rounded-2xl border border-landrify-line px-4 py-3 text-left transition-colors hover:border-landrify-green/40 hover:bg-emerald-50/40"
                    >
                      <p className="text-sm font-medium text-gray-900">{location.label}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">{location.sub}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Enter plot description</label>
                <Input
                  value={plotDescription}
                  onChange={(event) => setPlotDescription(event.target.value)}
                  placeholder="Plot 42, Block C, Lekki Phase 1"
                  className="h-12"
                />
                <p className="text-xs text-gray-500">
                  This extra description will be stored with the scan and included in the AI report for context.
                </p>
              </div>

              {isLocationReady && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-landrify-green" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-emerald-900">
                      {selectedLocationLabel || 'Selected location'}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-emerald-800">
                      {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
                    </p>
                    {confirmedAddress && (
                      <p className="mt-0.5 truncate text-[11px] text-emerald-700">{confirmedAddress}</p>
                    )}
                  </div>
                  <button type="button" onClick={clearSelection} aria-label="Clear selected location" className="text-emerald-700 hover:text-emerald-900">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">Plot size selector</h3>
                  <span className="text-xs text-gray-500">Selected radius: {radiusMeters || 0} metres</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {RADIUS_OPTIONS.map((option) => {
                    const active = option.key === radiusKey;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setRadiusKey(option.key);
                          setError(null);
                        }}
                        className={
                          'rounded-2xl border px-4 py-3 text-left transition-colors ' +
                          (active ? OLIVE_CLASSES.active : OLIVE_CLASSES.idle)
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{option.label}</p>
                          <p className="text-sm font-medium">
                            {option.radiusKm != null ? `${option.radiusKm} km` : 'Custom'}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{option.description}</p>
                      </button>
                    );
                  })}
                </div>

                {radiusKey === 'custom' && (
                  <div className="rounded-2xl border border-landrify-line bg-gray-50/60 p-4">
                    <label className="text-sm font-semibold text-gray-900">Custom radius (km)</label>
                    <Input
                      value={customRadiusKm}
                      onChange={(event) => setCustomRadiusKm(event.target.value)}
                      placeholder="0.05"
                      className="mt-2 h-11"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" className="h-12 flex-1" onClick={() => void handleSubmit()} disabled={!isLocationReady || loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">{loading ? 'Running scan…' : 'Run land scan'}</span>
                </Button>
                <Button type="button" variant="outline" className="h-12 sm:w-48" onClick={() => void handleDemoScan()} disabled={demoLoading}>
                  {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="ml-2">{demoLoading ? 'Loading…' : 'Try a demo'}</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <MapPreview
              latitude={latitude}
              longitude={longitude}
              radiusKm={radiusKm > 0 ? radiusKm : 0.05}
              onPick={activeTab === 'map' ? handleMapPick : undefined}
              className="border border-landrify-line shadow-sm"
            />
            <p className="px-1 text-xs text-gray-500">
              {activeTab === 'map'
                ? 'Tap anywhere on the map to place the pin.'
                : 'The map preview updates automatically as soon as the scan location changes.'}
            </p>
          </div>
        </div>

        {demoResult && <InlineResult result={demoResult} />}
      </div>
    </div>
  );
}
