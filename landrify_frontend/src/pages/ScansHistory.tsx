import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { getScan, getUserScans } from '../api/scans';
import { downloadScanPdf } from '../lib/pdf';
import type { ScanResult } from '../types/api';

const riskBadgeClass: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
  unknown: 'bg-gray-100 text-gray-700',
};

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return formatted.replace('am', 'AM').replace('pm', 'PM');
};

const displayAddress = (scan: ScanResult) => {
  if (!scan.address) return `${scan.state}, ${scan.lga}`;
  if (scan.address.length > 80) return `${scan.state}, ${scan.lga}`;
  return scan.address;
};

export function ScansHistory() {
  const navigate = useNavigate();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-scans'],
    queryFn: getUserScans,
  });

  const handleDownload = async (id: string) => {
    try {
      setDownloadingId(id);
      const scan = await getScan(id);
      await downloadScanPdf(scan);
    } catch (err: any) {
      window.alert(err.response?.data?.error || err.response?.data?.detail || 'Unable to download PDF report.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif font-light text-gray-900">Scan History</h1>
          <p className="text-gray-500 mt-2">All your verification scans in one place.</p>
        </div>
        <Button onClick={() => navigate('/scan/new')} className="rounded-2xl h-12">Start New Scan</Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-gray-200 animate-pulse" />)}
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {(error as any)?.response?.data?.error || (error as any)?.response?.data?.detail || (error as Error)?.message}
        </div>
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <div className="rounded-3xl bg-white border border-landrify-line p-10 text-center">
          <p className="text-lg text-gray-700">No scans yet. Start your first scan.</p>
          <Link to="/scan/new" className="inline-block mt-4">
            <Button className="rounded-2xl">Go to New Scan</Button>
          </Link>
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="space-y-4">
          {data.map((scan) => (
            <div key={scan.id} className="bg-white rounded-2xl border border-landrify-line p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">{scan.scan_reference}</p>
                  <h3 className="text-xl font-medium text-landrify-ink">{displayAddress(scan)}</h3>
                  <p className="text-sm text-gray-500 mt-1">{formatDateTime(scan.created_at)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${riskBadgeClass[scan.risk_level] ?? riskBadgeClass.unknown}`}>
                    {scan.risk_level.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">Score: {scan.risk_score ?? 0}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-landrify-green/10 text-landrify-green">
                    {scan.scan_type === 'pro' ? 'Pro ⭐' : 'Basic'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-5">
                <Link to={`/scan/${scan.id}`}>
                  <Button variant="outline" className="rounded-xl">View Report</Button>
                </Link>
                <Button className="rounded-xl" onClick={() => handleDownload(scan.id)} disabled={downloadingId === scan.id}>
                  {downloadingId === scan.id ? 'Downloading...' : 'Download PDF'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
