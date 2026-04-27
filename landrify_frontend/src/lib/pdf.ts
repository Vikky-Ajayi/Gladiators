import type { ScanResult, WeatherBundle } from '../types/api';

const PAGE = { width: 210, height: 297, marginX: 18, marginTop: 22, marginBottom: 18 };
const BRAND = {
  green: [26, 122, 74] as [number, number, number],
  ink: [17, 24, 39] as [number, number, number],
  body: [55, 65, 81] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  light: [243, 244, 246] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
};

const fmtDate = (value?: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(value ? new Date(value) : new Date());

const stripMarkdown = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\d+\.\s+/gm, '- ')
    .trim();

const scanWeather = (scan: ScanResult): WeatherBundle =>
  scan.weather ?? {
    current: scan.weather_current ?? null,
    historical: scan.weather_historical ?? null,
    projection: scan.weather_projection ?? null,
    summary: scan.weather_summary ?? '',
  };

function setFill(doc: any, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setText(doc: any, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setDraw(doc: any, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function drawHeader(doc: any, pageNo: number, totalPages: number, scanRef: string) {
  setFill(doc, BRAND.green);
  doc.rect(0, 0, PAGE.width, 14, 'F');
  setText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LANDRIFY', PAGE.marginX, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(scanRef, PAGE.width - PAGE.marginX, 9, { align: 'right' });

  setText(doc, BRAND.muted);
  doc.setFontSize(8);
  doc.text(`Page ${pageNo} of ${totalPages}`, PAGE.width / 2, PAGE.height - 8, { align: 'center' });
}

function drawSectionTitle(doc: any, title: string, y: number) {
  setText(doc, BRAND.green);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), PAGE.marginX, y);
  setDraw(doc, BRAND.green);
  doc.setLineWidth(0.6);
  doc.line(PAGE.marginX, y + 2, PAGE.marginX + 28, y + 2);
  setText(doc, BRAND.ink);
}

function drawCard(doc: any, x: number, y: number, width: number, height: number) {
  setFill(doc, BRAND.light);
  setDraw(doc, BRAND.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 4, 4, 'FD');
}

function addWrappedBlock(doc: any, text: string, cursor: number, fontSize = 10.5) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  setText(doc, BRAND.body);
  const lines: string[] = doc.splitTextToSize(text || '—', PAGE.width - PAGE.marginX * 2);
  doc.text(lines, PAGE.marginX, cursor);
  return cursor + lines.length * (fontSize === 10.5 ? 5.6 : 4.8);
}

function addKvRows(doc: any, rows: Array<[string, string]>, startY: number) {
  let cursor = startY;
  rows.forEach(([label, value]) => {
    setText(doc, BRAND.muted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(label.toUpperCase(), PAGE.marginX + 4, cursor);

    setText(doc, BRAND.ink);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines: string[] = doc.splitTextToSize(value || '—', PAGE.width - PAGE.marginX * 2 - 62);
    doc.text(lines, PAGE.marginX + 56, cursor);
    cursor += Math.max(7, lines.length * 4.8 + 1.5);
  });
  return cursor;
}

function coverPage(doc: any, scan: ScanResult) {
  setFill(doc, BRAND.green);
  doc.rect(0, 0, PAGE.width, 100, 'F');

  setText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LANDRIFY', PAGE.marginX, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Land Verification Report', PAGE.marginX, 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(27);
  doc.text('Land Risk Report', PAGE.marginX, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(scan.address || scan.address_hint || `${scan.lga}, ${scan.state}`, PAGE.marginX, 72);

  drawCard(doc, PAGE.marginX, 120, PAGE.width - PAGE.marginX * 2, 78);
  let cursor = 132;
  cursor = addKvRows(
    doc,
    [
      ['Scan Reference', scan.scan_reference || '—'],
      ['Generated On', fmtDate(scan.created_at)],
      ['Coordinates', `${scan.latitude}, ${scan.longitude}`],
      ['Radius', `${scan.radius_km} km`],
      ['Risk Score', `${scan.risk_score ?? '—'} / 100 (${scan.risk_level ?? 'unknown'})`],
      ['Elevation', `${scan.elevation_meters ?? '—'} m above sea level`],
    ],
    cursor,
  );

  drawSectionTitle(doc, 'Summary', cursor + 10);
  addWrappedBlock(
    doc,
    scan.ai_report?.trim()
      ? stripMarkdown(scan.ai_report).split('\n').slice(0, 6).join(' ')
      : 'This report summarises legal, environmental, weather, and AI-derived land-risk insights for the selected location.',
    cursor + 20,
  );
}

function detailsPage(doc: any, scan: ScanResult) {
  doc.addPage();
  let cursor = 30;
  drawSectionTitle(doc, 'Location & Legal Status', cursor);
  cursor += 10;

  drawCard(doc, PAGE.marginX, cursor, PAGE.width - PAGE.marginX * 2, 92);
  cursor = addKvRows(
    doc,
    [
      ['Address', scan.address || '—'],
      ['Plot Description', scan.address_hint || '—'],
      ['State', scan.state || '—'],
      ['LGA', scan.lga || '—'],
      ['Government Acquisition', scan.legal_status.is_government_land ? 'Yes' : 'No'],
      ['Under Acquisition', scan.legal_status.is_under_acquisition ? 'Yes' : 'No'],
      ['Authority', scan.legal_status.authority || '—'],
      ['Gazette Reference', scan.legal_status.gazette_reference || '—'],
    ],
    cursor + 12,
  );

  drawSectionTitle(doc, 'Legal Notes', cursor + 10);
  addWrappedBlock(doc, scan.legal_status.notes || 'No additional legal notes.', cursor + 20);
}

function environmentalPage(doc: any, scan: ScanResult) {
  doc.addPage();
  let cursor = 30;
  drawSectionTitle(doc, 'Environmental Risks', cursor);
  cursor += 10;

  drawCard(doc, PAGE.marginX, cursor, PAGE.width - PAGE.marginX * 2, 82);
  addKvRows(
    doc,
    [
      ['Flood Risk', `${scan.environmental_risks.flood.risk_level || 'unknown'} — ${scan.environmental_risks.flood.zone_name || 'No mapped zone'}`],
      ['Flood Data Source', scan.environmental_risks.flood.data_source || '—'],
      ['Erosion Risk', scan.environmental_risks.erosion.risk_level || 'unknown'],
      ['Nearest Dam', scan.environmental_risks.dam_proximity.nearest_dam || '—'],
      ['Dam Distance', `${scan.environmental_risks.dam_proximity.distance_km ?? '—'} km`],
      ['Dam Risk', scan.environmental_risks.dam_proximity.risk_level || 'unknown'],
      ['Satellite Preview', scan.satellite_image_url ? 'Available in app view' : 'Unavailable'],
    ],
    cursor + 12,
  );
}

function weatherPage(doc: any, scan: ScanResult) {
  const weather = scanWeather(scan);
  if (!weather.current && !weather.historical && !weather.projection) return;

  doc.addPage();
  let cursor = 30;
  drawSectionTitle(doc, 'Weather & Climate', cursor);
  cursor += 10;

  drawCard(doc, PAGE.marginX, cursor, PAGE.width - PAGE.marginX * 2, 76);
  cursor = addKvRows(
    doc,
    [
      ['Current Temperature', `${weather.current?.temperature_c ?? '—'} °C`],
      ['Humidity', `${weather.current?.humidity_percent ?? '—'} %`],
      ['Precipitation', `${weather.current?.precipitation_mm ?? '—'} mm`],
      ['Wind Speed', `${weather.current?.wind_speed_kmh ?? '—'} km/h`],
      ['Conditions', weather.current?.description || '—'],
      ['Avg Annual Rainfall', `${weather.historical?.avg_annual_rainfall_mm ?? '—'} mm/year`],
      ['Rainfall Trend', weather.historical?.rainfall_trend || '—'],
      ['Avg Max Temperature', `${weather.historical?.avg_max_temp_c ?? '—'} °C`],
      ['Extreme Rain Days/Year', `${weather.historical?.extreme_rain_days_per_year ?? '—'}`],
    ],
    cursor + 12,
  );

  drawSectionTitle(doc, 'Climate Projections', cursor + 10);
  cursor += 20;
  drawCard(doc, PAGE.marginX, cursor, PAGE.width - PAGE.marginX * 2, 82);
  cursor = addKvRows(
    doc,
    [
      ['2030', `${weather.projection?.projection_2030?.avg_annual_rainfall_mm ?? '—'} mm/year · ${weather.projection?.projection_2030?.avg_max_temp_c ?? '—'} °C`],
      ['2035', `${weather.projection?.projection_2035?.avg_annual_rainfall_mm ?? '—'} mm/year · ${weather.projection?.projection_2035?.avg_max_temp_c ?? '—'} °C`],
      ['2040', `${weather.projection?.projection_2040?.avg_annual_rainfall_mm ?? '—'} mm/year · ${weather.projection?.projection_2040?.avg_max_temp_c ?? '—'} °C`],
      ['2050', `${weather.projection?.projection_2050?.avg_annual_rainfall_mm ?? '—'} mm/year · ${weather.projection?.projection_2050?.avg_max_temp_c ?? '—'} °C`],
      ['Rainfall Change to 2050', `${weather.projection?.rainfall_change_2025_to_2050_percent ?? '—'} %`],
      ['Flood Trajectory', weather.projection?.flood_risk_trajectory || '—'],
    ],
    cursor + 12,
  );

  if (weather.summary) {
    doc.addPage();
    cursor = 30;
    drawSectionTitle(doc, 'Weather Summary', cursor);
    addWrappedBlock(doc, weather.summary, cursor + 12);
  }
}

function aiPage(doc: any, scan: ScanResult) {
  if (!scan.ai_report?.trim()) return;

  doc.addPage();
  let cursor = 30;
  drawSectionTitle(doc, 'AI Report', cursor);
  cursor += 12;

  const info = `Model: ${scan.ai_report_model || '—'} · Tokens used: ${scan.ai_report_tokens ?? '—'}`;
  setText(doc, BRAND.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(info, PAGE.marginX, cursor);
  cursor += 10;

  setText(doc, BRAND.body);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const lines: string[] = doc.splitTextToSize(stripMarkdown(scan.ai_report), PAGE.width - PAGE.marginX * 2);

  for (const line of lines) {
    if (cursor > PAGE.height - PAGE.marginBottom) {
      doc.addPage();
      cursor = 24;
    }
    doc.text(line, PAGE.marginX, cursor);
    cursor += 5.6;
  }
}

function disclaimerPage(doc: any) {
  doc.addPage();
  let cursor = 30;
  drawSectionTitle(doc, 'Disclaimer', cursor);
  cursor += 12;

  const disclaimer = [
    'This report is generated from environmental data and AI analysis.',
    'It does not constitute legal or engineering advice.',
    'Independent professional verification is strongly recommended before any land transaction.',
  ].join(' ');

  addWrappedBlock(doc, disclaimer, cursor);
}

export async function downloadScanPdf(scan: ScanResult) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  coverPage(doc, scan);
  detailsPage(doc, scan);
  environmentalPage(doc, scan);
  weatherPage(doc, scan);
  aiPage(doc, scan);
  disclaimerPage(doc);

  const totalPages = doc.getNumberOfPages();
  for (let pageNo = 1; pageNo <= totalPages; pageNo += 1) {
    doc.setPage(pageNo);
    drawHeader(doc, pageNo, totalPages, scan.scan_reference || scan.id);
  }

  doc.save(`Landrify-Report-${scan.scan_reference || scan.id}.pdf`);
}
