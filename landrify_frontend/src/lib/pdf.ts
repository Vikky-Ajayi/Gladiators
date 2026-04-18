import type { ScanResult } from '../types/api';

// ── Brand palette ────────────────────────────────────────────────────────────
const BRAND = {
  green:      [26, 122, 74] as [number, number, number],
  greenDark:  [16, 80, 48] as [number, number, number],
  ink:        [17, 24, 39] as [number, number, number],
  body:       [55, 65, 81] as [number, number, number],
  muted:      [107, 114, 128] as [number, number, number],
  light:      [243, 244, 246] as [number, number, number],
  paper:      [250, 250, 250] as [number, number, number],
  border:     [229, 231, 235] as [number, number, number],
};

const RISK: Record<string, { fill: [number, number, number]; ink: [number, number, number]; label: string }> = {
  low:      { fill: [220, 252, 231], ink: [22, 101, 52],  label: 'LOW RISK' },
  medium:   { fill: [254, 243, 199], ink: [146, 64, 14],  label: 'MEDIUM RISK' },
  high:     { fill: [255, 237, 213], ink: [154, 52, 18],  label: 'HIGH RISK' },
  critical: { fill: [254, 226, 226], ink: [153, 27, 27],  label: 'CRITICAL RISK' },
  unknown:  { fill: [243, 244, 246], ink: [55, 65, 81],   label: 'RISK UNKNOWN' },
};

const PAGE = { w: 210, h: 297, mx: 18 };

const fmtDate = (v?: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(v ? new Date(v) : new Date());

const stripMd = (t: string) =>
  t
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s/gm, '• ')
    .trim();

// ── Drawing helpers ──────────────────────────────────────────────────────────
const setFill = (doc: any, c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
const setText = (doc: any, c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc: any, c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

function drawHeader(doc: any, pageNo: number, total: number, scanRef: string) {
  setFill(doc, BRAND.green);
  doc.rect(0, 0, PAGE.w, 14, 'F');
  setText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LANDRIFY', PAGE.mx, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Land Verification Report', PAGE.mx + 28, 9);
  doc.text(scanRef, PAGE.w - PAGE.mx, 9, { align: 'right' });

  setText(doc, BRAND.muted);
  doc.setFontSize(8);
  doc.text(`Page ${pageNo} of ${total}`, PAGE.w / 2, PAGE.h - 8, { align: 'center' });
  doc.text('landrify.app  ·  Verified land insights for Nigeria', PAGE.mx, PAGE.h - 8);
  doc.text(fmtDate(), PAGE.w - PAGE.mx, PAGE.h - 8, { align: 'right' });
}

function watermark(doc: any) {
  doc.saveGraphicsState();
  // jsPDF GState for opacity
  const gs = (doc.GState && new doc.GState({ opacity: 0.04 })) || null;
  if (gs) doc.setGState(gs);
  setText(doc, BRAND.green);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(80);
  doc.text('LANDRIFY', PAGE.w / 2, PAGE.h / 2 + 20, { align: 'center', angle: 30 });
  doc.restoreGraphicsState();
  setText(doc, BRAND.ink);
}

function sectionTitle(doc: any, label: string, y: number) {
  setText(doc, BRAND.greenDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(label.toUpperCase(), PAGE.mx, y);
  setDraw(doc, BRAND.green);
  doc.setLineWidth(0.6);
  doc.line(PAGE.mx, y + 1.8, PAGE.mx + 24, y + 1.8);
  setText(doc, BRAND.ink);
}

function kvRow(doc: any, label: string, value: string, y: number, opts: { valueColor?: [number, number, number] } = {}) {
  setText(doc, BRAND.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(label.toUpperCase(), PAGE.mx, y);
  setText(doc, opts.valueColor || BRAND.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const wrapped: string[] = doc.splitTextToSize(value || '—', 110);
  doc.text(wrapped, PAGE.mx + 60, y);
  return y + 5 + (wrapped.length - 1) * 4.5;
}

function panel(doc: any, x: number, y: number, w: number, h: number, fill: [number, number, number], radius = 4) {
  setFill(doc, fill);
  setDraw(doc, BRAND.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, radius, radius, 'FD');
}

function pill(doc: any, x: number, y: number, label: string, fill: [number, number, number], textColor: [number, number, number]) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const padX = 4;
  const w = doc.getTextWidth(label) + padX * 2;
  setFill(doc, fill);
  doc.roundedRect(x, y - 4, w, 6.5, 3, 3, 'F');
  setText(doc, textColor);
  doc.text(label, x + padX, y);
  setText(doc, BRAND.ink);
  return x + w;
}

// ── Page builders ────────────────────────────────────────────────────────────

function coverPage(doc: any, scan: ScanResult) {
  // Big green block
  setFill(doc, BRAND.green);
  doc.rect(0, 0, PAGE.w, 110, 'F');

  // Decorative circle
  setFill(doc, BRAND.greenDark);
  doc.circle(PAGE.w - 30, 40, 60, 'F');

  setText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LANDRIFY', PAGE.mx, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Land verification & risk intelligence', PAGE.mx, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(scan.scan_type === 'pro' ? 'PRO REPORT' : 'BASIC REPORT', PAGE.mx, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  const title = doc.splitTextToSize('Land Verification\nReport', 130);
  doc.text(title, PAGE.mx, 65);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(scan.address || `${scan.lga}, ${scan.state}`, PAGE.mx, 95);

  // Risk panel below the green hero
  const risk = RISK[(scan.risk_level || 'unknown').toLowerCase()] || RISK.unknown;
  panel(doc, PAGE.mx, 125, PAGE.w - PAGE.mx * 2, 60, risk.fill, 6);
  setText(doc, risk.ink);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('OVERALL ASSESSMENT', PAGE.mx + 8, 135);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(risk.label, PAGE.mx + 8, 152);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Risk score: ${scan.risk_score ?? '—'} / 100`, PAGE.mx + 8, 162);
  doc.text(`Land area scanned: ${scan.radius_km} km radius`, PAGE.mx + 8, 168);
  doc.text(`Plan: ${scan.scan_type === 'pro' ? 'Pro · AI projection included' : 'Basic'}`, PAGE.mx + 8, 174);

  // Meta block
  setText(doc, BRAND.body);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('REPORT REFERENCE', PAGE.mx, 200);
  doc.text('GENERATED ON', PAGE.mx + 95, 200);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setText(doc, BRAND.ink);
  doc.text(scan.scan_reference || '—', PAGE.mx, 207);
  doc.text(fmtDate(scan.created_at), PAGE.mx + 95, 207);

  doc.setFont('helvetica', 'bold');
  setText(doc, BRAND.body);
  doc.setFontSize(9);
  doc.text('COORDINATES', PAGE.mx, 220);
  doc.text('ELEVATION', PAGE.mx + 95, 220);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setText(doc, BRAND.ink);
  doc.text(`${scan.latitude}, ${scan.longitude}`, PAGE.mx, 227);
  doc.text(`${scan.elevation_meters ?? '—'} m`, PAGE.mx + 95, 227);

  // Footer note
  setFill(doc, BRAND.light);
  doc.rect(0, 260, PAGE.w, 25, 'F');
  setText(doc, BRAND.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const disclaimer = 'This report compiles data from satellite imagery, government gazettes, NIHSA flood outlooks and AI analysis. Use it alongside professional legal and survey advice before any land transaction.';
  const lines: string[] = doc.splitTextToSize(disclaimer, PAGE.w - PAGE.mx * 2);
  doc.text(lines, PAGE.mx, 270);
}

function detailsPage(doc: any, scan: ScanResult) {
  doc.addPage();
  watermark(doc);

  let y = 30;
  sectionTitle(doc, 'Location & Land', y); y += 10;

  panel(doc, PAGE.mx, y, PAGE.w - PAGE.mx * 2, 56, BRAND.paper);
  let yy = y + 8;
  yy = kvRow(doc, 'Address', scan.address || '—', yy);
  yy = kvRow(doc, 'State', scan.state || '—', yy);
  yy = kvRow(doc, 'LGA', scan.lga || '—', yy);
  yy = kvRow(doc, 'Coordinates', `${scan.latitude}, ${scan.longitude}`, yy);
  yy = kvRow(doc, 'Radius scanned', `${scan.radius_km} km`, yy);
  yy = kvRow(doc, 'Elevation', `${scan.elevation_meters ?? '—'} m above sea level`, yy);

  y += 64;
  sectionTitle(doc, 'Legal Status', y); y += 10;
  const ls = scan.legal_status || ({} as any);
  const govFlagBad = !!ls.is_government_land || !!ls.is_under_acquisition;
  panel(doc, PAGE.mx, y, PAGE.w - PAGE.mx * 2, 60, govFlagBad ? RISK.critical.fill : RISK.low.fill);

  let lx = PAGE.mx + 6;
  pill(doc, lx, y + 8,
    ls.is_government_land ? 'Government acquisition' : 'No government claim',
    ls.is_government_land ? RISK.critical.ink : RISK.low.ink, [255, 255, 255]);
  pill(doc, lx + 60, y + 8,
    ls.is_under_acquisition ? 'Under acquisition' : 'Not under acquisition',
    ls.is_under_acquisition ? RISK.critical.ink : RISK.low.ink, [255, 255, 255]);

  yy = y + 22;
  yy = kvRow(doc, 'Authority', ls.authority || '—', yy);
  yy = kvRow(doc, 'Gazette ref.', ls.gazette_reference || '—', yy);

  setText(doc, BRAND.body);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('NOTES', PAGE.mx, yy + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setText(doc, BRAND.ink);
  const notes: string[] = doc.splitTextToSize(ls.notes || '—', PAGE.w - PAGE.mx * 2 - 4);
  doc.text(notes, PAGE.mx, yy + 8);
}

function envPage(doc: any, scan: ScanResult) {
  doc.addPage();
  watermark(doc);
  let y = 30;
  sectionTitle(doc, 'Environmental Risks', y); y += 10;

  const env = scan.environmental_risks || ({} as any);

  const cardW = (PAGE.w - PAGE.mx * 2 - 8) / 3;
  const cards = [
    { name: 'Flood',   level: env.flood?.risk_level,         meta: env.flood?.zone_name || '—' },
    { name: 'Erosion', level: env.erosion?.risk_level,       meta: '—' },
    { name: 'Dam',     level: env.dam_proximity?.risk_level, meta: env.dam_proximity?.nearest_dam || '—' },
  ];
  cards.forEach((c, i) => {
    const r = RISK[(c.level || 'unknown').toLowerCase()] || RISK.unknown;
    const x = PAGE.mx + (cardW + 4) * i;
    panel(doc, x, y, cardW, 50, r.fill, 6);
    setText(doc, r.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(c.name.toUpperCase(), x + 6, y + 10);
    doc.setFontSize(20);
    doc.text((c.level || '—').toUpperCase(), x + 6, y + 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const meta: string[] = doc.splitTextToSize(c.meta, cardW - 12);
    doc.text(meta, x + 6, y + 36);
  });

  y += 60;

  panel(doc, PAGE.mx, y, PAGE.w - PAGE.mx * 2, 70, BRAND.paper);
  let yy = y + 8;
  yy = kvRow(doc, 'Flood zone',     env.flood?.zone_name || '—', yy);
  yy = kvRow(doc, 'Flood source',   env.flood?.data_source || '—', yy);
  yy = kvRow(doc, 'Nearest dam',    env.dam_proximity?.nearest_dam || '—', yy);
  yy = kvRow(doc, 'Distance to dam',`${env.dam_proximity?.distance_km ?? '—'} km`, yy);
}

function aiPage(doc: any, scan: ScanResult) {
  if (!scan.ai_report?.trim()) return;
  doc.addPage();
  watermark(doc);
  let y = 30;
  sectionTitle(doc, 'AI 50-Year Time Projection', y); y += 10;

  panel(doc, PAGE.mx, y, PAGE.w - PAGE.mx * 2, 14, BRAND.light, 4);
  setText(doc, BRAND.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Model: ${scan.ai_report_model || '—'}    Tokens: ${scan.ai_report_tokens ?? '—'}`, PAGE.mx + 4, y + 9);
  y += 22;

  setText(doc, BRAND.body);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const cleaned = stripMd(scan.ai_report);
  const lines: string[] = doc.splitTextToSize(cleaned, PAGE.w - PAGE.mx * 2);
  let cursor = y;
  const max = PAGE.h - 22;
  lines.forEach((ln) => {
    if (cursor > max) {
      doc.addPage();
      watermark(doc);
      cursor = 28;
    }
    doc.text(ln, PAGE.mx, cursor);
    cursor += 5.6;
  });
}

function disclaimerPage(doc: any) {
  doc.addPage();
  watermark(doc);
  let y = 30;
  sectionTitle(doc, 'Disclaimer & Sources', y); y += 12;
  setText(doc, BRAND.body);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const text = [
    'This report is generated from publicly available data sources and AI analysis. It is intended as a guide only and does not replace professional legal, survey or engineering advice. Always conduct independent due diligence before any land transaction.',
    '',
    'Data sources include: NIHSA Annual Flood Outlooks 2021–2024, NEMA, OCHA Nigeria, UNDP, Lagos State Ministry of Lands / LASURA, FCDA / AGIS, OpenStreetMap and satellite imagery providers.',
    '',
    'Generated by Landrify — landrify.app',
  ].join('\n');
  const lines: string[] = doc.splitTextToSize(text, PAGE.w - PAGE.mx * 2);
  doc.text(lines, PAGE.mx, y);
}

// ── Public ───────────────────────────────────────────────────────────────────

export async function downloadScanPdf(scan: ScanResult) {
  const dynamicImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;
  const { jsPDF } = await dynamicImport('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  coverPage(doc, scan);
  detailsPage(doc, scan);
  envPage(doc, scan);
  aiPage(doc, scan);
  disclaimerPage(doc);

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i > 1) drawHeader(doc, i, total, scan.scan_reference || '—');
    else {
      // Cover footer only
      setText(doc, BRAND.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${total}`, PAGE.w / 2, PAGE.h - 8, { align: 'center' });
    }
  }

  doc.save(`Landrify-Report-${scan.scan_reference || scan.id}.pdf`);
}
