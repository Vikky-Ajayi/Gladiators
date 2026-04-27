import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Download } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { getScan } from '../api/scans';
import { Button } from '../components/ui/Button';
import { downloadScanPdf } from '../lib/pdf';
import type { ScanResult, WeatherBundle } from '../types/api';

const RISK_LEVEL_COLORS: Record<string, string> = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#fb923c',
  critical: '#f87171',
  unknown: '#d1d5db',
};

const RISK_RING_RADIUS = 70;
const RISK_RING_CIRCUMFERENCE = 2 * Math.PI * RISK_RING_RADIUS;

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-72 rounded-3xl bg-gray-200" />
      <div className="h-56 rounded-3xl bg-gray-200" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-52 rounded-3xl bg-gray-200" />
        <div className="h-52 rounded-3xl bg-gray-200" />
      </div>
      <div className="h-80 rounded-3xl bg-gray-200" />
    </div>
  );
}

function toCaps(value?: string | null) {
  return (value ?? 'unknown').replace('_', ' ').toUpperCase();
}

function weatherBundle(scan?: ScanResult | null): WeatherBundle {
  if (!scan) return {};
  return (
    scan.weather ?? {
      current: scan.weather_current ?? null,
      historical: scan.weather_historical ?? null,
      projection: scan.weather_projection ?? null,
      summary: scan.weather_summary ?? '',
    }
  );
}

function SatellitePreview({ imageUrl }: { imageUrl: string | null }) {
  const [imageState, setImageState] = useState<'idle' | 'loading' | 'loaded' | 'error'>(
    imageUrl ? 'loading' : 'error',
  );

  useEffect(() => {
    setImageState(imageUrl ? 'loading' : 'error');
  }, [imageUrl]);

  return (
    <div className="relative mt-6 min-h-[180px] w-full overflow-hidden rounded-2xl bg-gray-100 md:min-h-[220px]">
      {imageState === 'loading' && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
      {imageUrl && imageState !== 'error' && (
        <img
          src={imageUrl}
          alt="Satellite imagery"
          className={`h-full min-h-[180px] w-full object-cover transition-opacity duration-200 md:min-h-[220px] ${
            imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageState('loaded')}
          onError={() => setImageState('error')}
          referrerPolicy="no-referrer"
        />
      )}
      {(!imageUrl || imageState === 'error') && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-gray-500">
          Satellite image unavailable
        </div>
      )}
    </div>
  );
}

function ProjectionCard({
  title,
  rainfall,
  maxTemp,
  basis,
}: {
  title: string;
  rainfall?: number | null;
  maxTemp?: number | null;
  basis?: string;
}) {
  return (
    <div className="rounded-2xl border border-landrify-line p-4">
      <p className="text-xs uppercase tracking-widest text-gray-500">{title}</p>
      <p className="mt-2 text-lg font-semibold text-landrify-ink">
        {rainfall ?? '—'} mm/year
      </p>
      <p className="text-sm text-gray-500">Avg max temp: {maxTemp ?? '—'}°C</p>
      {basis === 'trend_extension' && (
        <p className="mt-2 text-[11px] text-gray-500">Trend-extended estimate</p>
      )}
      {basis === 'model_trailing_window' && (
        <p className="mt-2 text-[11px] text-gray-500">Model window ending at 2050</p>
      )}
    </div>
  );
}

export function ScanResult() {
  const { id } = useParams<{ id: string }>();
  const [remarkPlugins, setRemarkPlugins] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);

  useEffect(() => {
    const dynamicImport = new Function('u', 'return import(u)') as (specifier: string) => Promise<any>;
    dynamicImport('https://cdn.jsdelivr.net/npm/remark-gfm@4.0.1/+esm')
      .then((module) => setRemarkPlugins([module.default]))
      .catch(() => setRemarkPlugins([]));
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['scan', id],
    queryFn: () => getScan(id!),
    enabled: Boolean(id),
  });

  const riskScore = typeof data?.risk_score === 'number' ? data.risk_score : 0;
  const riskRingColor = RISK_LEVEL_COLORS[data?.risk_level ?? 'unknown'] ?? RISK_LEVEL_COLORS.unknown;
  const strokeDashoffset =
    RISK_RING_CIRCUMFERENCE - (Math.max(0, Math.min(riskScore, 100)) / 100) * RISK_RING_CIRCUMFERENCE;
  const errMessage =
    (error as any)?.response?.data?.error ||
    (error as any)?.response?.data?.detail ||
    (error as Error | null)?.message;

  const weather = useMemo(() => weatherBundle(data), [data]);
  const hasLongAiReport = (data?.ai_report?.trim().length ?? 0) > 1600;

  const handleDownloadPdf = async () => {
    if (!data) return;
    try {
      setDownloading(true);
      await downloadScanPdf(data);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-10 flex items-center justify-between gap-3"
      >
        <Link to="/dashboard" className="group inline-flex items-center text-gray-500 transition-colors hover:text-landrify-green">
          <ArrowLeft className="mr-2 h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
          <span className="font-medium">Back to Dashboard</span>
        </Link>
        <Button className="rounded-2xl" onClick={handleDownloadPdf} disabled={!data || downloading}>
          <Download className="mr-2 h-4 w-4" />
          {downloading ? 'Generating PDF...' : 'Download PDF Report'}
        </Button>
      </motion.div>

      {isLoading && <LoadingSkeleton />}

      {!isLoading && errMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{errMessage}</div>
      )}

      {!isLoading && !errMessage && data && (
        <div className="space-y-8">
          <section className="rounded-3xl border border-landrify-line bg-white p-8 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500">{data.scan_reference}</p>
                <h1 className="mt-1 text-4xl font-serif text-landrify-ink">
                  {data.address || data.address_hint || 'Scanned location'}
                </h1>
                <p className="mt-1 text-gray-600">{data.lga}, {data.state}</p>
                {data.address_hint && data.address_hint !== data.address && (
                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Plot description: {data.address_hint}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-landrify-green/10 px-4 py-1 text-sm font-semibold text-landrify-green">
                {data.scan_type === 'pro' ? 'Pro' : 'Basic'}
              </span>
            </div>

            <SatellitePreview imageUrl={data.satellite_image_url} />
          </section>

          <section className="flex flex-col items-center rounded-3xl border border-landrify-line bg-white p-8 shadow-lg">
            <div className="relative h-44 w-44">
              <svg className="h-full w-full -rotate-90">
                <circle cx="88" cy="88" r={RISK_RING_RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle
                  cx="88"
                  cy="88"
                  r={RISK_RING_RADIUS}
                  fill="none"
                  stroke={riskRingColor}
                  strokeWidth="12"
                  strokeDasharray={RISK_RING_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-landrify-ink">{riskScore}</span>
                <span className="text-xs tracking-widest text-gray-500">RISK SCORE</span>
              </div>
            </div>
            <p className="mt-3 font-semibold">{toCaps(data.risk_level)}</p>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-3 rounded-3xl border border-landrify-line bg-white p-6 shadow-lg">
              <h3 className="text-2xl font-serif">Legal Status</h3>
              {data.legal_status.is_government_land ? (
                <p className="font-semibold text-red-600">
                  GOVERNMENT ACQUISITION AREA{data.legal_status.authority ? ` — ${data.legal_status.authority}` : ''}
                </p>
              ) : (
                <p className="font-semibold text-green-600">No government acquisition records found</p>
              )}
              {data.legal_status.gazette_reference && (
                <p className="text-sm text-gray-700">Gazette: {data.legal_status.gazette_reference}</p>
              )}
              {data.legal_status.notes && <p className="text-sm text-gray-500">{data.legal_status.notes}</p>}
            </section>

            <section className="space-y-3 rounded-3xl border border-landrify-line bg-white p-6 shadow-lg">
              <h3 className="text-2xl font-serif">Environmental</h3>
              <p><span className="font-semibold">Flood Risk:</span> {toCaps(data.environmental_risks.flood.risk_level)}</p>
              <p className="text-sm text-gray-500">{data.environmental_risks.flood.zone_name || 'No mapped flood zone name'}</p>
              <p><span className="font-semibold">Erosion Risk:</span> {toCaps(data.environmental_risks.erosion.risk_level)}</p>
              <p>
                <span className="font-semibold">Nearest Dam:</span>{' '}
                {data.environmental_risks.dam_proximity.nearest_dam || 'N/A'} ({data.environmental_risks.dam_proximity.distance_km ?? '—'}km away)
              </p>
              <p><span className="font-semibold">Elevation:</span> {data.elevation_meters ?? 'N/A'}m above sea level</p>
            </section>
          </div>

          {(weather.current || weather.historical || weather.projection) && (
            <section className="rounded-3xl border border-landrify-line bg-white p-6 shadow-lg">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-2xl font-serif">Weather &amp; Climate</h3>
                <span className="text-[11px] text-gray-500">Open-Meteo current, archive, and MRI_AGCM3_2_S projections</span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-landrify-line p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Current</p>
                  <p className="mt-2 text-3xl font-bold text-landrify-ink">
                    {weather.current?.temperature_c ?? '—'}°C
                  </p>
                  <p className="text-sm text-gray-500">{weather.current?.description || 'No live conditions available'}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    Humidity {weather.current?.humidity_percent ?? '—'}% · Rain {weather.current?.precipitation_mm ?? '—'}mm
                  </p>
                  <p className="text-xs text-gray-500">Wind {weather.current?.wind_speed_kmh ?? '—'} km/h</p>
                </div>

                <div className="rounded-2xl border border-landrify-line p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Historical (10 years)</p>
                  <p className="mt-2 text-lg font-semibold text-landrify-ink">
                    {weather.historical?.avg_annual_rainfall_mm ?? '—'} mm/year
                  </p>
                  <p className="text-sm text-gray-500">
                    Rainfall trend: {weather.historical?.rainfall_trend ?? '—'}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Avg max temp {weather.historical?.avg_max_temp_c ?? '—'}°C · Avg min temp {weather.historical?.avg_min_temp_c ?? '—'}°C
                  </p>
                  <p className="text-xs text-gray-500">
                    Extreme rain days/year {weather.historical?.extreme_rain_days_per_year ?? '—'}
                  </p>
                </div>

                <div className="rounded-2xl border border-landrify-orange/30 bg-landrify-orange/5 p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Long-term signal</p>
                  <p className="mt-2 text-lg font-semibold text-landrify-ink">
                    {weather.projection?.projection_2075?.avg_annual_rainfall_mm ?? '—'} mm/year
                  </p>
                  <p className="text-sm text-gray-500">
                    2075 avg max temp {weather.projection?.projection_2075?.avg_max_temp_c ?? '—'}°C
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Rainfall change {weather.projection?.rainfall_change_2025_to_2075_percent ?? '—'}%
                  </p>
                  <p className="text-xs text-gray-500">
                    Flood trajectory {weather.projection?.flood_risk_trajectory ?? '—'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ProjectionCard
                  title="2030 Projection"
                  rainfall={weather.projection?.projection_2030?.avg_annual_rainfall_mm}
                  maxTemp={weather.projection?.projection_2030?.avg_max_temp_c}
                  basis={weather.projection?.projection_2030?.basis}
                />
                <ProjectionCard
                  title="2035 Projection"
                  rainfall={weather.projection?.projection_2035?.avg_annual_rainfall_mm}
                  maxTemp={weather.projection?.projection_2035?.avg_max_temp_c}
                  basis={weather.projection?.projection_2035?.basis}
                />
                <ProjectionCard
                  title="2040 Projection"
                  rainfall={weather.projection?.projection_2040?.avg_annual_rainfall_mm}
                  maxTemp={weather.projection?.projection_2040?.avg_max_temp_c}
                  basis={weather.projection?.projection_2040?.basis}
                />
                <ProjectionCard
                  title="2050 Projection"
                  rainfall={weather.projection?.projection_2050?.avg_annual_rainfall_mm}
                  maxTemp={weather.projection?.projection_2050?.avg_max_temp_c}
                  basis={weather.projection?.projection_2050?.basis}
                />
                <ProjectionCard
                  title="2060 Projection"
                  rainfall={weather.projection?.projection_2060?.avg_annual_rainfall_mm}
                  maxTemp={weather.projection?.projection_2060?.avg_max_temp_c}
                  basis={weather.projection?.projection_2060?.basis}
                />
                <ProjectionCard
                  title="2075 Projection"
                  rainfall={weather.projection?.projection_2075?.avg_annual_rainfall_mm}
                  maxTemp={weather.projection?.projection_2075?.avg_max_temp_c}
                  basis={weather.projection?.projection_2075?.basis}
                />
              </div>

              {weather.projection?.projection_note && (
                <p className="mt-4 text-xs leading-relaxed text-gray-500">
                  {weather.projection.projection_note}
                </p>
              )}
              {weather.summary && <p className="mt-4 text-sm leading-relaxed text-gray-600">{weather.summary}</p>}
            </section>
          )}

          <section className="max-w-5xl rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-2xl font-serif">AI Report</h3>
            {data.ai_report && data.ai_report.trim().length > 0 ? (
              <>
                <div className="mb-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-gray-700">
                  AI report · Model {data.ai_report_model || 'N/A'} · {data.ai_report_tokens ?? 'N/A'} tokens used
                </div>
                <div className="relative">
                  <article className={`prose max-w-none ${aiExpanded || !hasLongAiReport ? '' : 'max-h-[28rem] overflow-hidden'}`}>
                    <ReactMarkdown
                      remarkPlugins={remarkPlugins}
                      components={{
                        h1: ({ children }) => (
                          <h1 style={{ color: '#1A7A4A', fontSize: '1.3rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.6rem' }}>
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 style={{ color: '#1A7A4A', fontSize: '1.1rem', fontWeight: 700, marginTop: '1.2rem', marginBottom: '0.45rem' }}>
                            {children}
                          </h2>
                        ),
                        p: ({ children }) => (
                          <p style={{ color: '#374151', lineHeight: '1.75', marginBottom: '0.85rem' }}>{children}</p>
                        ),
                        li: ({ children }) => (
                          <li style={{ color: '#374151', lineHeight: '1.7', marginBottom: '0.35rem' }}>{children}</li>
                        ),
                        strong: ({ children }) => (
                          <strong style={{ color: '#1A7A4A', fontWeight: 700 }}>{children}</strong>
                        ),
                      }}
                    >
                      {data.ai_report}
                    </ReactMarkdown>
                  </article>
                  {!aiExpanded && hasLongAiReport && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/90 to-transparent" />
                  )}
                </div>
                {hasLongAiReport && (
                  <div className="mt-5 flex">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setAiExpanded((value) => !value)}
                    >
                      {aiExpanded ? 'Read Less' : 'Load More'}
                    </Button>
                  </div>
                )}
              </>
            ) : data.upgrade_prompt ? (
              <div className="rounded-2xl border border-landrify-orange/40 bg-landrify-orange/10 p-5">
                <p className="font-semibold text-landrify-ink">{data.upgrade_prompt.message}</p>
                {data.upgrade_prompt.price && <p className="mt-1 text-sm text-gray-700">{data.upgrade_prompt.price}</p>}
                <Link to="/pricing" className="mt-4 inline-block">
                  <Button className="rounded-2xl">Upgrade to Pro</Button>
                </Link>
              </div>
            ) : (
              <p className="text-gray-500">No AI report available for this scan.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
