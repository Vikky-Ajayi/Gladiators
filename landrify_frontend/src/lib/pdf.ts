import type { ScanResult } from '../types/api';

const GREEN = '#1A7A4A';
const riskColors: Record<string, [number, number, number]> = {
  low: [34, 197, 94],
  medium: [245, 158, 11],
  high: [249, 115, 22],
  critical: [239, 68, 68],
  unknown: [107, 114, 128],
};

const formatDateTime = (value?: string) => {
  const date = value ? new Date(value) : new Date();
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

const stripMarkdown = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#+\s/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/>\s?/g, '')
    .replace(/[-*]\s/g, '• ')
    .trim();

const addHeader = (doc: any, scanReference: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(26, 122, 74);
  doc.rect(0, 0, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LANDRIFY', 10, 6.8);
  doc.text(scanReference, pageWidth - 10, 6.8, { align: 'right' });
  doc.setTextColor(0, 0, 0);
};

const addFooter = (doc: any, page: number, total: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Page ${page} of ${total}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  doc.setTextColor(0, 0, 0);
};

const sectionHeader = (doc: any, text: string, y: number) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(26, 122, 74);
  doc.text(text, 14, y);
  doc.setDrawColor(26, 122, 74);
  doc.setLineWidth(0.4);
  doc.line(14, y + 2.5, 196, y + 2.5);
  doc.setTextColor(0, 0, 0);
};

export async function downloadScanPdf(scan: ScanResult) {
  const dynamicImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;
  const { jsPDF } = await dynamicImport('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm');
  const doc = new jsPDF();

  const riskLevel = (scan.risk_level ?? 'unknown').toLowerCase();
  const [rr, rg, rb] = riskColors[riskLevel] ?? riskColors.unknown;
  const pages: (() => void)[] = [];

  pages.push(() => {
    addHeader(doc, scan.scan_reference || 'N/A');
    sectionHeader(doc, 'Land Verification Report', 24);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let y = 36;
    const line = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 62, y);
      y += 7;
    };

    line('Report Reference:', scan.scan_reference || 'N/A');
    line('Generated:', formatDateTime());
    line('Plan:', scan.scan_type === 'pro' ? 'Pro' : 'Basic');

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 122, 74);
    doc.text('LOCATION', 14, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    line('Address:', scan.address || 'N/A');
    line('State:', scan.state || 'N/A');
    line('LGA:', scan.lga || 'N/A');
    line('Coordinates:', `${scan.latitude}, ${scan.longitude}`);
    line('Radius Scanned:', `${scan.radius_km} km`);
    line('Elevation:', `${scan.elevation_meters ?? 'N/A'} m above sea level`);

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 122, 74);
    doc.text('OVERALL RISK ASSESSMENT', 14, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    line('Risk Score:', `${scan.risk_score ?? 0} / 100`);
    line('Risk Level:', (scan.risk_level ?? 'unknown').toUpperCase());

    doc.setFillColor(rr, rg, rb);
    doc.roundedRect(14, y + 2, 182, 16, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text((scan.risk_level ?? 'unknown').toUpperCase(), 105, y + 12, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  });

  pages.push(() => {
    doc.addPage();
    addHeader(doc, scan.scan_reference || 'N/A');
    sectionHeader(doc, 'LEGAL STATUS', 24);
    let y = 38;
    const line = (label: string, value: string, color?: [number, number, number]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      if (color) doc.setTextColor(color[0], color[1], color[2]);
      doc.text(value, 76, y);
      doc.setTextColor(0, 0, 0);
      y += 8;
    };
    line('Government Acquisition:', scan.legal_status.is_government_land ? 'YES ⚠' : 'NO ✓', scan.legal_status.is_government_land ? [220, 38, 38] : [22, 163, 74]);
    line('Under Acquisition:', scan.legal_status.is_under_acquisition ? 'Yes' : 'No');
    line('Authority:', scan.legal_status.authority || 'N/A');
    line('Gazette Reference:', scan.legal_status.gazette_reference || 'N/A');

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const notes = doc.splitTextToSize(scan.legal_status.notes || 'N/A', 180);
    doc.text(notes, 14, y);
  });

  pages.push(() => {
    doc.addPage();
    addHeader(doc, scan.scan_reference || 'N/A');
    sectionHeader(doc, 'ENVIRONMENTAL RISKS', 24);
    let y = 38;
    const line = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 64, y);
      y += 8;
    };
    line('Flood Risk', (scan.environmental_risks.flood.risk_level || 'unknown').toUpperCase());
    line('Zone:', scan.environmental_risks.flood.zone_name || 'No named zone');
    line('Source:', scan.environmental_risks.flood.data_source || 'N/A');
    y += 2;
    line('Erosion Risk', (scan.environmental_risks.erosion.risk_level || 'unknown').toUpperCase());
    y += 2;
    line('Nearest Dam', scan.environmental_risks.dam_proximity.nearest_dam || 'N/A');
    line('Distance:', `${scan.environmental_risks.dam_proximity.distance_km ?? 'N/A'} km`);
    line('Dam Risk Level:', (scan.environmental_risks.dam_proximity.risk_level || 'unknown').toUpperCase());
  });

  if (scan.ai_report?.trim()) {
    pages.push(() => {
      doc.addPage();
      addHeader(doc, scan.scan_reference || 'N/A');
      sectionHeader(doc, 'AI TIME-PROJECTION REPORT', 24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Model: ${scan.ai_report_model || 'N/A'}`, 14, 36);
      doc.text(`Tokens: ${scan.ai_report_tokens ?? 'N/A'}`, 14, 44);
      doc.setFont('helvetica', 'normal');
      const cleaned = stripMarkdown(scan.ai_report);
      const lines = doc.splitTextToSize(cleaned, 182);
      doc.text(lines, 14, 54);
    });
  }

  pages.push(() => {
    doc.addPage();
    addHeader(doc, scan.scan_reference || 'N/A');
    sectionHeader(doc, 'DISCLAIMER', 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const disclaimer = `This report is generated from available data sources and should not\nreplace professional legal, survey, and engineering advice. Always\nconduct independent due diligence before any land transaction.\n\nData sources: NIHSA Annual Flood Outlooks 2021-2024, NEMA, OCHA\nNigeria, UNDP, Lagos State Ministry of Lands / LASURA, FCDA / AGIS.\n\nPowered by Landrify — landrify.vercel.app`;
    doc.text(disclaimer, 14, 38);
  });

  pages.forEach((render) => render());
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    addFooter(doc, i, total);
  }

  doc.save(`Landrify-Report-${scan.scan_reference || scan.id}.pdf`);
}
