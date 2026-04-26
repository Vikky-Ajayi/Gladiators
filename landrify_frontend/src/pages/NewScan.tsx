import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  MapPin, Navigation, Search, AlertCircle, X, Crosshair, Layers, Loader2,
  Sparkles, ChevronRight, Compass,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { createScan, demoScan, geocodeAddress, reverseGeocode, type GeocodeResult } from '../api/scans';
import type { ScanResult } from '../types/api';
import { MapPreview } from '../components/MapPreview';

// ── Constants ─────────────────────────────────────────────────────────────────

const QUICK_LOCATIONS = [
  { label: 'Lekki, Lagos',    sub: 'Coastal — high flood risk',   latitude: 6.4698, longitude: 3.5852 },
  { label: 'Maitama, Abuja',  sub: 'FCT — federal land',          latitude: 9.082,  longitude: 7.492  },
  { label: 'Ibeju-Lekki',     sub: 'Free Trade Zone overlap',     latitude: 6.41,   longitude: 3.91   },
  { label: 'Port Harcourt',   sub: 'Niger Delta — tidal flooding',latitude: 4.8156, longitude: 7.0498 },
  { label: 'Onitsha, Anambra',sub: 'Niger River floodplain',      latitude: 6.1500, longitude: 6.7833 },
  { label: 'Lokoja, Kogi',    sub: 'Niger-Benue confluence',      latitude: 7.8023, longitude: 6.7333 },
] as const;

/**
 * Nigerian land-area presets. The displayed scan circle radius is derived
 * directly from the parcel area: r = √(area / π) so the circle on the map
 * accurately reflects the size of the land the buyer is scanning. (The
 * backend still pulls in surrounding flood-zone / dam / climate context
 * regardless of the visible disc.)
 */
const _r = (areaSqm: number) => Math.sqrt(areaSqm / Math.PI) / 1000; // km
const RADIUS_PRESETS: Array<{ key: string; label: string; sub: string; areaSqm: number; km: number }> = [
  { key: 'half-plot', label: 'Half plot',     sub: '~324 m²',           areaSqm:    324, km: _r(324)    },
  { key: 'plot',      label: '1 plot',        sub: '648 m² · 60×120 ft', areaSqm:    648, km: _r(648)    },
  { key: '2-plots',   label: '2 plots',       sub: '1,296 m²',          areaSqm:   1296, km: _r(1296)   },
  { key: 'half-acre', label: 'Half acre',     sub: '2,023 m²',          areaSqm:   2023, km: _r(2023)   },
  { key: 'acre',      label: '1 acre',        sub: '4,047 m² · ≈6 plots', areaSqm:   4047, km: _r(4047)   },
  { key: 'hectare',   label: '1 hectare',     sub: '10,000 m² · ≈15 plots', areaSqm:  10000, km: _r(10000)  },
  { key: '5-hectare', label: '5 hectares',    sub: '50,000 m²',         areaSqm:  50000, km: _r(50000)  },
  { key: 'estate',    label: 'Small estate',  sub: '12 hectares',       areaSqm: 120000, km: _r(120000) },
  { key: 'district',  label: 'District-scale', sub: '~50 hectares',      areaSqm: 500000, km: _r(500000) },
];

function formatArea(sqm: number): string {
  if (sqm < 10000) return `${sqm.toLocaleString()} m²`;
  return `${(sqm / 10000).toFixed(sqm < 100000 ? 2 : 1)} ha`;
}

const RISK_COLORS: Record<string, string> = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#fb923c',
  critical: '#f87171',
  very_high: '#f87171',
  unknown: '#d1d5db',
};

const RING_R = 70;
const RING_C = 2 * Math.PI * RING_R;

type ScanMethod = 'address' | 'gps' | 'map' | 'quick' | 'manual';

const TABS: Array<{ key: ScanMethod; label: string; icon: any; help: string }> = [
  { key: 'address', label: 'Address',    icon: Search,    help: 'Type a street, area or landmark' },
  { key: 'gps',     label: 'My location', icon: Crosshair, help: 'Use your phone’s GPS' },
  { key: 'map',     label: 'Pick on map', icon: Layers,    help: 'Drop a pin on the satellite' },
  { key: 'quick',   label: 'Quick picks', icon: Sparkles,  help: 'Try a popular Nigerian location' },
  { key: 'manual',  label: 'Coordinates', icon: Compass,   help: 'Paste latitude / longitude' },
];

function formatRiskLevel(level?: string | null) {
  return (level ?? 'unknown').replace('_', ' ').toUpperCase();
}

// ── Inline result card (unchanged shape from before) ──────────────────────────

function InlineResult({ result }: { result: ScanResult }) {
  const score = typeof result.risk_score === 'number' ? result.risk_score : 0;
  const ringColor = RISK_COLORS[result.risk_level] ?? RISK_COLORS.unknown;
  const dashOffset = RING_C - (Math.max(0, Math.min(score, 100)) / 100) * RING_C;
  return (
    <div className="space-y-6 mt-10">
      <div className="bg-white rounded-3xl border border-landrify-line shadow-lg p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">{result.scan_reference}</p>
            <h2 className="text-2xl md:text-3xl font-serif text-landrify-ink mt-1">{result.address}</h2>
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
            <circle cx="88" cy="88" r={RING_R} fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle cx="88" cy="88" r={RING_R} fill="none" stroke={ringColor}
              strokeWidth="12" strokeDasharray={RING_C} strokeDashoffset={dashOffset} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-landrify-ink">{score}</span>
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
              ⚠️ GOVERNMENT ACQUISITION AREA
              {result.legal_status.authority ? ` — ${result.legal_status.authority}` : ''}
            </p>
          ) : (
            <p className="text-green-600 font-semibold">No government acquisition records found</p>
          )}
          {result.legal_status.gazette_reference && (
            <p className="text-sm text-gray-700">Gazette: {result.legal_status.gazette_reference}</p>
          )}
          {result.legal_status.notes && <p className="text-sm text-gray-500">{result.legal_status.notes}</p>}
        </div>
        <div className="bg-white rounded-3xl border border-landrify-line shadow-lg p-6 space-y-3">
          <h3 className="text-xl font-serif">Environmental</h3>
          <p><span className="font-semibold">Flood Risk:</span> {formatRiskLevel(result.environmental_risks.flood.risk_level)}</p>
          <p className="text-sm text-gray-500">{result.environmental_risks.flood.zone_name}</p>
          <p><span className="font-semibold">Erosion Risk:</span> {formatRiskLevel(result.environmental_risks.erosion.risk_level)}</p>
          <p>
            <span className="font-semibold">Nearest Dam:</span>{' '}
            {result.environmental_risks.dam_proximity.nearest_dam}{' '}
            ({result.environmental_risks.dam_proximity.distance_km}km away)
          </p>
          <p><span className="font-semibold">Elevation:</span> {result.elevation_meters ?? 'N/A'}m above sea level</p>
        </div>
      </div>
    </div>
  );
}

// ── Main NewScan page ─────────────────────────────────────────────────────────

export function NewScan() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<ScanMethod>('address');
  const [latitude, setLat] = useState<number | null>(null);
  const [longitude, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('');
  const [pickedLabel, setPickedLabel] = useState<string>('');
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const [radiusKey, setRadiusKey] = useState<string>('plot');
  const radiusKm = useMemo(
    () => RADIUS_PRESETS.find((p) => p.key === radiusKey)?.km ?? 0.030,
    [radiusKey],
  );

  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoResult, setDemoResult] = useState<ScanResult | null>(null);

  // ── Address search ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (tab !== 'address') return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 3) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const data = await geocodeAddress(query.trim(), 6);
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, tab]);

  const pickResult = (r: GeocodeResult) => {
    setLat(r.latitude); setLng(r.longitude);
    setAddress(r.label);
    setPickedLabel(r.label.split(',').slice(0, 3).join(', '));
    setError(null);
    setResults([]);
    setQuery(r.label.split(',').slice(0, 2).join(', '));
  };

  // ── GPS ──
  const [gpsBusy, setGpsBusy] = useState(false);
  const useGps = () => {
    setError(null); setGpsBusy(true);
    if (!('geolocation' in navigator)) {
      setGpsBusy(false);
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLat(pos.coords.latitude); setLng(pos.coords.longitude);
        setAccuracy(Math.round(pos.coords.accuracy));
        try {
          const r = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setAddress(r.display_name);
          setPickedLabel(`${r.lga ?? ''}${r.lga && r.state ? ', ' : ''}${r.state ?? ''}`);
        } catch { /* address optional */ }
        setGpsBusy(false);
      },
      (e) => { setGpsBusy(false); setError(e.message || 'Could not read your location.'); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  // ── Map pick ──
  const onMapPick = async (lat: number, lng: number) => {
    setLat(lat); setLng(lng); setError(null);
    try {
      const r = await reverseGeocode(lat, lng);
      setAddress(r.display_name);
      setPickedLabel(`${r.lga ?? ''}${r.lga && r.state ? ', ' : ''}${r.state ?? ''}`);
    } catch { /* optional */ }
  };

  // ── Quick pick ──
  const pickQuick = (q: typeof QUICK_LOCATIONS[number]) => {
    setLat(q.latitude); setLng(q.longitude);
    setAddress(q.label); setPickedLabel(q.label);
    setError(null);
  };

  // ── Manual ──
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const applyManual = () => {
    const la = parseFloat(manualLat), ln = parseFloat(manualLng);
    if (Number.isNaN(la) || Number.isNaN(ln)) { setError('Enter valid latitude and longitude.'); return; }
    if (la < 4 || la > 14 || ln < 2.5 || ln > 15) {
      setError('Coordinates appear outside Nigeria (lat 4–14, lng 2.5–15).');
      return;
    }
    setLat(la); setLng(ln); setAddress(`${la.toFixed(5)}, ${ln.toFixed(5)}`);
    setPickedLabel('Manual coordinates'); setError(null);
  };

  // ── Submit ──
  const ready = latitude != null && longitude != null;

  const submit = async () => {
    if (!ready) { setError('Pick a location first.'); return; }
    setLoading(true); setError(null);
    try {
      const result = await createScan({ latitude: latitude!, longitude: longitude!, radius_km: radiusKm });
      navigate(`/scans/${result.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.userMessage || 'Failed to create scan.');
    } finally {
      setLoading(false);
    }
  };

  const tryDemo = async () => {
    setDemoLoading(true); setError(null);
    try {
      const r = await demoScan('lekki');
      setDemoResult(r);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Demo scan failed.');
    } finally { setDemoLoading(false); }
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white py-12">
      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-2">
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-landrify-green inline-flex items-center gap-1">
            ← Dashboard
          </Link>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-serif text-landrify-ink mb-2">
          Run a new scan
        </motion.h1>
        <p className="text-gray-500 mb-10 max-w-2xl">
          Choose how you want to locate the parcel — address search, GPS, drop a pin on
          the satellite map, or paste raw coordinates. Then pick a Nigerian land-area preset
          and start the scan.
        </p>

        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8">
          {/* ── LEFT: scan input ── */}
          <div className="bg-white border border-landrify-line rounded-3xl shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-landrify-line/70 bg-gray-50/60 px-2 pt-2">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => { setTab(t.key); setError(null); }}
                    className={
                      'group flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-sm transition-colors ' +
                      (active
                        ? 'bg-white text-landrify-green font-semibold border border-b-white border-landrify-line'
                        : 'text-gray-500 hover:text-gray-800')
                    }
                  >
                    <Icon className="w-4 h-4" /> {t.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <p className="text-sm text-gray-500 -mt-2">{TABS.find((x) => x.key === tab)?.help}</p>

              {/* ── ADDRESS ── */}
              {tab === 'address' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. Admiralty Way, Lekki Phase 1"
                      className="pl-12 h-12"
                    />
                    {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
                  </div>
                  {results.length > 0 && (
                    <div className="rounded-2xl border border-landrify-line divide-y divide-gray-100 max-h-72 overflow-y-auto">
                      {results.map((r) => (
                        <button
                          key={`${r.place_id ?? `${r.latitude}-${r.longitude}`}`}
                          onClick={() => pickResult(r)}
                          className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors group"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-landrify-green mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">{r.label}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {(r.state || 'Nigeria')} · {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-landrify-green" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {!searching && query.length >= 3 && results.length === 0 && (
                    <p className="text-xs text-gray-500">No matches found in Nigeria. Try a more specific area.</p>
                  )}
                </div>
              )}

              {/* ── GPS ── */}
              {tab === 'gps' && (
                <div className="space-y-3">
                  <Button onClick={useGps} disabled={gpsBusy} className="w-full h-12">
                    {gpsBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    <span className="ml-2">{gpsBusy ? 'Locating you…' : 'Use my current location'}</span>
                  </Button>
                  {accuracy != null && (
                    <p className="text-xs text-gray-500">GPS accuracy ±{accuracy} m. For survey-grade results, walk to the centre of the parcel before tapping.</p>
                  )}
                </div>
              )}

              {/* ── MAP ── */}
              {tab === 'map' && (
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Click anywhere on the satellite map on the right to drop a pin. Click again to move it.</p>
                </div>
              )}

              {/* ── QUICK ── */}
              {tab === 'quick' && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {QUICK_LOCATIONS.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => pickQuick(q)}
                      className="text-left rounded-2xl border border-landrify-line px-4 py-3 hover:border-landrify-green hover:bg-emerald-50/40 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">{q.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{q.sub}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* ── MANUAL ── */}
              {tab === 'manual' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="Latitude (e.g. 6.4698)" />
                  <Input value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="Longitude (e.g. 3.5852)" />
                  <Button onClick={applyManual} variant="outline" className="col-span-2 h-11">
                    Use these coordinates
                  </Button>
                </div>
              )}

              {/* ── Selected location pill ── */}
              {ready && (
                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 px-4 py-3">
                  <MapPin className="w-5 h-5 text-landrify-green mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-900 truncate">{pickedLabel || 'Selected location'}</p>
                    <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                      {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
                    </p>
                    {address && address !== pickedLabel && (
                      <p className="text-[11px] text-emerald-700/80 truncate mt-0.5">{address}</p>
                    )}
                  </div>
                  <button onClick={() => { setLat(null); setLng(null); setAddress(''); setPickedLabel(''); setAccuracy(null); }}
                    className="text-emerald-700 hover:text-emerald-900" aria-label="Clear">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Radius presets ── */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Plot size</h3>
                  <span className="text-[11px] text-gray-500">
                    Plot area: <span className="font-semibold text-landrify-green">
                      {formatArea(RADIUS_PRESETS.find(p => p.key === radiusKey)?.areaSqm ?? 0)}
                    </span>
                    {' '}· radius {(radiusKm * 1000).toFixed(1)} m
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Pick the closest standard Nigerian land-area unit — the green circle on the map shows the actual size.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {RADIUS_PRESETS.map((p) => {
                    const active = radiusKey === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setRadiusKey(p.key)}
                        className={
                          'text-left rounded-xl border px-3 py-2.5 text-sm transition-colors ' +
                          (active
                            ? 'border-landrify-green bg-landrify-green/5 ring-1 ring-landrify-green/40'
                            : 'border-landrify-line hover:border-landrify-green/40 hover:bg-emerald-50/40')
                        }
                      >
                        <p className={'font-medium ' + (active ? 'text-landrify-green' : 'text-gray-900')}>{p.label}</p>
                        <p className="text-[10.5px] text-gray-500">{p.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Errors ── */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* ── Submit ── */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={submit} disabled={!ready || loading} className="flex-1 h-12">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="ml-2">{loading ? 'Running scan…' : 'Run land scan'}</span>
                </Button>
                <Button onClick={tryDemo} variant="outline" disabled={demoLoading} className="sm:w-48 h-12">
                  {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span className="ml-2">{demoLoading ? 'Loading…' : 'Try a demo'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: live map preview ── */}
          <div className="space-y-4">
            <MapPreview
              latitude={latitude}
              longitude={longitude}
              radiusKm={radiusKm}
              onPick={tab === 'map' ? onMapPick : undefined}
              className="shadow-sm border border-landrify-line"
            />
            <div className="text-xs text-gray-500 px-1">
              {tab === 'map'
                ? 'Tap anywhere on the map to drop a pin.'
                : 'The map updates automatically as you pick a location.'}
            </div>
          </div>
        </div>

        {demoResult && <InlineResult result={demoResult} />}
      </div>
    </div>
  );
}
