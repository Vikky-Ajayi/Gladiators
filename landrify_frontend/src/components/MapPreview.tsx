import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}

const NIGERIA_CENTER: [number, number] = [9.0, 8.0];
const DEFAULT_ZOOM = 6;
const MIN_RADIUS_KM = 0.05;
const NIGERIA_BBOX = {
  minLat: 4.0,
  minLng: 2.5,
  maxLat: 14.0,
  maxLng: 15.0,
};

function zoomForRadius(radiusKm: number) {
  const safeRadius = Math.max(MIN_RADIUS_KM, radiusKm);
  return Math.max(10, Math.min(16, Math.round(16 - Math.log2(safeRadius * 8))));
}

function osmPreviewUrl(latitude: number | null, longitude: number | null, radiusKm: number) {
  if (latitude == null || longitude == null) {
    const params = new URLSearchParams({
      bbox: `${NIGERIA_BBOX.minLng},${NIGERIA_BBOX.minLat},${NIGERIA_BBOX.maxLng},${NIGERIA_BBOX.maxLat}`,
      layer: 'mapnik',
    });
    return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
  }

  const safeRadius = Math.max(MIN_RADIUS_KM, radiusKm);
  const latDelta = Math.max(0.02, safeRadius / 111);
  const lngDelta = Math.max(0.02, safeRadius / (111 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.2)));
  const params = new URLSearchParams({
    bbox: `${longitude - lngDelta},${latitude - latDelta},${longitude + lngDelta},${latitude + latDelta}`,
    layer: 'mapnik',
    marker: `${latitude},${longitude}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

function InteractivePicker({
  latitude,
  longitude,
  radiusKm,
  onPick,
}: Required<Pick<Props, 'radiusKm' | 'onPick'>> & Pick<Props, 'latitude' | 'longitude'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const radiusRef = useRef<L.Circle | null>(null);
  const clickHandlerRef = useRef<((event: L.LeafletMouseEvent) => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });
    map.setView(NIGERIA_CENTER, DEFAULT_ZOOM);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      radiusRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    const handler = (event: L.LeafletMouseEvent) => onPick(event.latlng.lat, event.latlng.lng);
    map.on('click', handler);
    clickHandlerRef.current = handler;
    container.style.cursor = 'crosshair';

    return () => {
      if (clickHandlerRef.current) {
        map.off('click', clickHandlerRef.current);
        clickHandlerRef.current = null;
      }
    };
  }, [onPick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || latitude == null || longitude == null) return;

    const markerPosition = L.latLng(latitude, longitude);
    const radiusMeters = Math.max(MIN_RADIUS_KM, radiusKm) * 1000;

    if (!markerRef.current) {
      markerRef.current = L.circleMarker(markerPosition, {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#1A7A4A',
        fillOpacity: 1,
      }).addTo(map);
    } else {
      markerRef.current.setLatLng(markerPosition);
    }

    if (!radiusRef.current) {
      radiusRef.current = L.circle(markerPosition, {
        radius: radiusMeters,
        color: '#1A7A4A',
        weight: 2,
        fillColor: '#1A7A4A',
        fillOpacity: 0.18,
      }).addTo(map);
    } else {
      radiusRef.current.setLatLng(markerPosition);
      radiusRef.current.setRadius(radiusMeters);
    }

    map.flyToBounds(radiusRef.current.getBounds(), {
      padding: [28, 28],
      duration: 0.8,
    });
  }, [latitude, longitude, radiusKm]);

  return <div ref={containerRef} className="aspect-square w-full bg-gray-200 sm:aspect-[16/10]" />;
}

export function MapPreview({
  latitude,
  longitude,
  radiusKm,
  onPick,
  className,
}: Props) {
  const safeRadiusKm = Math.max(MIN_RADIUS_KM, radiusKm);
  const previewUrl = useMemo(
    () => osmPreviewUrl(latitude, longitude, safeRadiusKm),
    [latitude, longitude, safeRadiusKm],
  );

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className ?? ''}`}>
      {onPick ? (
        <InteractivePicker
          latitude={latitude}
          longitude={longitude}
          radiusKm={safeRadiusKm}
          onPick={onPick}
        />
      ) : (
        <iframe
          title="Location preview"
          src={previewUrl}
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
          className="aspect-square w-full border-0 bg-gray-200 sm:aspect-[16/10]"
        />
      )}
      {latitude != null && longitude != null && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-md bg-black/60 px-2 py-1 text-[10.5px] font-mono text-white">
          scan radius {(safeRadiusKm * 1000).toFixed(0)} m | {(Math.PI * safeRadiusKm * safeRadiusKm * 100).toFixed(2)} ha
        </div>
      )}
    </div>
  );
}
