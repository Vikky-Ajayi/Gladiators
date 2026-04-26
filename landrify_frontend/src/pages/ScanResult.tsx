import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Download } from 'lucide-react';
import { getScan } from '../api/scans';
import { Button } from '../components/ui/Button';
import { downloadScanPdf } from '../lib/pdf';

const riskLevelColors: Record<string, string> = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#fb923c',
  critical: '#f87171',
  unknown: '#d1d5db',
};

const radiusRing = 70;
const circumference = 2 * Math.PI * radiusRing;

const toCaps = (value?: string | null) => (value ?? 'unknown').toUpperCase();

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-44 bg-gray-200 rounded-3xl" />
      <div className="h-72 bg-gray-200 rounded-3xl" />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-52 bg-gray-200 rounded-3xl" />
        <div className="h-52 bg-gray-200 rounded-3xl" />
      </div>
      <div className="h-56 bg-gray-200 rounded-3xl" />
    </div>
  );
}

export function ScanResult() {
  const { id } = useParams<{ id: string }>();
  const [remarkPlugins, setRemarkPlugins] = useState<any[]>([]);
  const [showFullReport, setShowFullReport] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const dynamicImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;
    dynamicImport('https://cdn.jsdelivr.net/npm/remark-gfm@4.0.1/+esm')
      .then((mod) => setRemarkPlugins([mod.default]))
      .catch(() => setRemarkPlugins([]));
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['scan', id],
    queryFn: () => getScan(id!),
    enabled: !!id,
  });

  const riskScore = typeof data?.risk_score === 'number' ? data.risk_score : 0;
  const ringColor = riskLevelColors[data?.risk_level ?? 'unknown'] ?? riskLevelColors.unknown;
  const strokeDashoffset = circumference - (Math.max(0, Math.min(riskScore, 100)) / 100) * circumference;
  const errMessage = (error as any)?.response?.data?.error || (error as any)?.response?.data?.detail || (error as Error | null)?.message;

  const reportText = useMemo(() => data?.ai_report?.trim() ?? '', [data?.ai_report]);
  const reportWords = useMemo(() => (reportText ? reportText.split(/\s+/) : []), [reportText]);
  const longReport = reportWords.length > 800;
  const previewReport = useMemo(
    () => reportText.split('\n\n').filter((block) => block.trim().length > 0).slice(0, 4).join('\n\n'),
    [reportText]
  );
  const visibleReport = longReport && !showFullReport ? (previewReport || reportText) : reportText;

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-10 flex items-center justify-between gap-3">
        <Link to="/dashboard" className="inline-flex items-center text-gray-500 hover:text-landrify-green transition-colors group">
          <ArrowLeft className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform" strokeWidth={1.5} />
          <span className="font-medium">Back to Dashboard</span>
        </Link>
        <Button className="rounded-2xl" onClick={handleDownloadPdf} disabled={!data || downloading}>
          <Download className="mr-2 h-4 w-4" />
          {downloading ? 'Generating PDF...' : 'Download PDF Report'}
        </Button>
      </motion.div>

      {isLoading && <LoadingSkeleton />}

      {!isLoading && errMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errMessage}
        </div>
      )}

      {!isLoading && !errMessage && data && (
        <div className="space-y-8">
          <section className="bg-white rounded-3xl border border-landrify-line shadow-lg p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500">{data.scan_reference}</p>
                <h1 className="text-4xl font-serif text-landrify-ink mt-1">{data.address}</h1>
                <p className="text-gray-600 mt-1">{data.lga}, {data.state}</p>
              </div>
              <span className="px-4 py-1 rounded-full text-sm font-semibold bg-landrify-green/10 text-landrify-green">
                {data.scan_type === 'pro' ? 'Pro ⭐' : 'Basic'}
              </span>
            </div>

            {data.satellite_image_url && (
              <img
                src={data.satellite_image_url}
                alt="Satellite imagery"
                className="w-full mt-6 rounded-2xl object-cover max-h-96"
                referrerPolicy="no-referrer"
              />
            )}
          </section>

          <section className="bg-white rounded-3xl border border-landrify-line shadow-lg p-8 flex flex-col items-center">
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
            <p className="font-semibold mt-3">{toCaps(data.risk_level)}</p>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-white rounded-3xl border border-landrify-line shadow-lg p-6 space-y-3">
              <h3 className="text-2xl font-serif">Legal Status</h3>
              {data.legal_status.is_government_land ? (
                <p className="text-red-600 font-semibold">
                  ⚠️ GOVERNMENT ACQUISITION AREA{data.legal_status.authority ? ` — ${data.legal_status.authority}` : ''}
                </p>
              ) : (
                <p className="text-green-600 font-semibold">✅ No government acquisition records found</p>
              )}
              {data.legal_status.gazette_reference && (
                <p className="text-sm text-gray-700">Gazette: {data.legal_status.gazette_reference}</p>
              )}
              {data.legal_status.notes && <p className="text-sm text-gray-500">{data.legal_status.notes}</p>}
            </section>

            <section className="bg-white rounded-3xl border border-landrify-line shadow-lg p-6 space-y-3">
              <h3 className="text-2xl font-serif">Environmental</h3>
              <p>
                <span className="font-semibold">Flood Risk:</span> {toCaps(data.environmental_risks.flood.risk_level)}
              </p>
              <p className="text-sm text-gray-500">{data.environmental_risks.flood.zone_name}</p>
              <p>
                <span className="font-semibold">Erosion Risk:</span> {toCaps(data.environmental_risks.erosion.risk_level)}
              </p>
              <p>
                <span className="font-semibold">Nearest Dam:</span> {data.environmental_risks.dam_proximity.nearest_dam} ({data.environmental_risks.dam_proximity.distance_km}km away)
              </p>
              <p><span className="font-semibold">Elevation:</span> {data.elevation_meters ?? 'N/A'}m above sea level</p>
            </section>
          </div>

          {(data.weather_current || data.weather_historical || data.weather_projection) && (
            <section className="bg-white rounded-3xl border border-landrify-line shadow-lg p-6">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
                <h3 className="text-2xl font-serif">Weather &amp; Climate</h3>
                <span className="text-[11px] text-gray-500">Open-Meteo · ERA5 reanalysis · CMIP6 projections</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {data.weather_current && (
                  <div className="rounded-2xl border border-landrify-line p-4">
                    <p className="text-xs uppercase tracking-widest text-gray-500">Now</p>
                    <p className="text-3xl font-bold text-landrify-ink mt-1">
                      {data.weather_current.temperature_c ?? '—'}°C
                    </p>
                    <p className="text-xs text-gray-500">
                      Feels {data.weather_current.apparent_c ?? '—'}°C · {data.weather_current.humidity_pct ?? '—'}% humidity
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Wind {data.weather_current.wind_kph ?? '—'} km/h
                    </p>
                  </div>
                )}
                {data.weather_historical && (
                  <div className="rounded-2xl border border-landrify-line p-4">
                    <p className="text-xs uppercase tracking-widest text-gray-500">
                      Trend ({data.weather_historical.period})
                    </p>
                    <p className="text-3xl font-bold text-landrify-ink mt-1">
                      {data.weather_historical.recent_temp_c ?? '—'}°C
                    </p>
                    <p className="text-xs text-gray-500">
                      vs {data.weather_historical.baseline_temp_c ?? '—'}°C in 1990s
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Rain: {data.weather_historical.recent_rain_mm ?? '—'} mm/yr
                    </p>
                  </div>
                )}
                {data.weather_projection?.horizons?.['2050'] && (
                  <div className="rounded-2xl border border-landrify-orange/30 bg-landrify-orange/5 p-4">
                    <p className="text-xs uppercase tracking-widest text-gray-500">2050 outlook (CMIP6)</p>
                    <p className="text-3xl font-bold text-landrify-ink mt-1">
                      {data.weather_projection.horizons['2050'].temp_mean_c ?? '—'}°C
                    </p>
                    <p className="text-xs text-gray-500">
                      ~{data.weather_projection.horizons['2050'].annual_rain_mm ?? '—'} mm/yr rainfall
                    </p>
                    {data.weather_projection.horizons['2080'] && (
                      <p className="text-xs text-gray-500 mt-1">
                        2080: {data.weather_projection.horizons['2080'].temp_mean_c ?? '—'}°C
                      </p>
                    )}
                  </div>
                )}
              </div>

              {data.weather_summary && (
                <p className="mt-4 text-sm text-gray-600 leading-relaxed">{data.weather_summary}</p>
              )}
            </section>
          )}

          <section className="bg-white border border-gray-200 rounded-2xl p-6 text-[1.02rem] max-w-4xl">
            <h3 className="text-2xl font-serif mb-3">AI Report</h3>
            {data.ai_report && data.ai_report.trim().length > 0 ? (
              <>
                <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-gray-700 mb-4">
                  🤖 AI Time-Projection Report &nbsp; | &nbsp; Model: {data.ai_report_model || 'N/A'} &nbsp; | &nbsp; {data.ai_report_tokens ?? 'N/A'} tokens used
                </div>
                <article className="prose max-w-none">
                  <ReactMarkdown
                    remarkPlugins={remarkPlugins}
                    components={{
                      h1: ({ children }) => (
                        <h1 style={{ color: '#1A7A4A', fontSize: '1.25rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '2px solid #e8f5ee', paddingBottom: '0.25rem' }}>{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 style={{ color: '#1A7A4A', fontSize: '1.1rem', fontWeight: 700, marginTop: '1.25rem', marginBottom: '0.4rem' }}>{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 style={{ color: '#2d4a3e', fontSize: '1rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.3rem' }}>{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p style={{ lineHeight: '1.7', marginBottom: '0.75rem', color: '#374151' }}>{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong style={{ color: '#1A7A4A', fontWeight: 700 }}>{children}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem', listStyleType: 'disc' }}>{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: '0.3rem', lineHeight: '1.6', color: '#374151' }}>{children}</li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote style={{ borderLeft: '4px solid #1A7A4A', paddingLeft: '1rem', margin: '1rem 0', color: '#6b7280', fontStyle: 'italic' }}>{children}</blockquote>
                      ),
                    }}
                  >
                    {visibleReport || ''}
                  </ReactMarkdown>
                </article>
                {longReport && (
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-landrify-green hover:underline"
                    onClick={() => setShowFullReport((prev) => !prev)}
                  >
                    {showFullReport ? 'Collapse' : 'Show full report'}
                  </button>
                )}
              </>
            ) : data.upgrade_prompt ? (
              <div className="rounded-2xl border border-landrify-orange/40 bg-landrify-orange/10 p-5">
                <p className="font-semibold text-landrify-ink">{data.upgrade_prompt.message}</p>
                {data.upgrade_prompt.price && <p className="text-sm text-gray-700 mt-1">{data.upgrade_prompt.price}</p>}
                <Link to="/pricing" className="inline-block mt-4">
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
