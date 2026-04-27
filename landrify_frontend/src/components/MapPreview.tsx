import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Props {
  latitude: number | null;
  longitude: number | null;
  /** Scan area radius in km — drives the visible circle. */
  radiusKm: number;
  /** Optional: when set, the user can click the map to drop / move the pin. */
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}

const NIGERIA_CENTER: [number, number] = [8.0, 9.0]; // lng, lat

/**
 * Lightweight Mapbox satellite preview that visualises a point + circular
 * scan radius. If no Mapbox token is configured, falls back to a simple
 * static placeholder with the coordinates.
 */
export function MapPreview({
  latitude,
  longitude,
  radiusKm,
  onPick,
  className,
}: Props) {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Init map once we have a token + a container.
  useEffect(() => {
    if (!mapboxToken || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: NIGERIA_CENTER,
      zoom: 5.5,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    if (onPick) {
      map.on('click', (e) => onPick(e.lngLat.lat, e.lngLat.lng));
      map.getCanvas().style.cursor = 'crosshair';
    }

    map.on('load', () => {
      map.addSource('scan-circle', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'scan-circle-fill',
        type: 'fill',
        source: 'scan-circle',
        paint: { 'fill-color': '#1A7A4A', 'fill-opacity': 0.18 },
      });
      map.addLayer({
        id: 'scan-circle-line',
        type: 'line',
        source: 'scan-circle',
        paint: { 'line-color': '#1A7A4A', 'line-width': 2 },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken, onPick]);

  // Update marker + circle whenever coords / radius change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || latitude == null || longitude == null) return;

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: '#1A7A4A' })
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }

    map.flyTo({
      center: [longitude, latitude],
      zoom: Math.max(13, 16 - Math.log2(Math.max(0.05, radiusKm))),
      essential: true,
      duration: 800,
    });

    const update = () => {
      const src = map.getSource('scan-circle') as mapboxgl.GeoJSONSource | undefined;
      if (!src) return;
      src.setData(circlePolygon(latitude, longitude, radiusKm));
    };
    if (map.isStyleLoaded()) update();
    else map.once('load', update);
  }, [latitude, longitude, radiusKm]);

  // Mobile-first sizing: square on phones (much bigger preview the user asked
  // for), 16/10 on tablets and up. We expose this on every render path.
  const aspectClass = 'aspect-square sm:aspect-[16/10]';

  if (!mapboxToken) {
    // No token → show static satellite tile via the backend if available.
    const fallbackLat = latitude ?? NIGERIA_CENTER[1];
    const fallbackLng = longitude ?? NIGERIA_CENTER[0];
    const staticUrl = `https://tile.openstreetmap.org/6/${Math.floor(((fallbackLng + 180) / 360) * 64)}/${Math.floor((1 - Math.log(Math.tan((fallbackLat * Math.PI) / 180) + 1 / Math.cos((fallbackLat * Math.PI) / 180)) / Math.PI) / 2 * 64)}.png`;
    return (
      <div className={`relative w-full bg-gray-100 rounded-2xl overflow-hidden ${className ?? ''}`}>
        <div className={`${aspectClass} flex flex-col items-center justify-center text-center px-6 text-gray-500 bg-cover bg-center relative`}
          style={{ backgroundImage: `url(${staticUrl})` }}
        >
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
          <div className="relative">
            <p className="text-sm font-medium">Map preview unavailable</p>
            <p className="text-xs mt-1 max-w-xs">
              Mapbox token not configured. Live satellite preview requires{' '}
              <code className="bg-gray-200 px-1 rounded text-[11px]">VITE_MAPBOX_TOKEN</code> in the frontend env.
            </p>
            {latitude != null && longitude != null && (
              <p className="text-[11px] font-mono mt-3">
                {latitude.toFixed(5)}, {longitude.toFixed(5)} · scan radius {(radiusKm * 1000).toFixed(0)} m
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden ${className ?? ''}`}>
      <div ref={containerRef} className={`${aspectClass} w-full bg-gray-200`} />
      {latitude != null && longitude != null && (
        <div className="absolute bottom-2 left-2 z-10 px-2 py-1 rounded-md bg-black/60 text-white text-[10.5px] font-mono pointer-events-none">
          scan radius {(radiusKm * 1000).toFixed(0)} m · {(Math.PI * radiusKm * radiusKm * 100).toFixed(2)} ha
        </div>
      )}
    </div>
  );
}

/** Build a 64-vertex GeoJSON polygon approximating a metric circle. */
function circlePolygon(lat: number, lng: number, radiusKm: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const points: [number, number][] = [];
  const earthR = 6371;
  const d = radiusKm / earthR;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  for (let i = 0; i <= 64; i++) {
    const brng = (i * 2 * Math.PI) / 64;
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(brng),
    );
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(latRad),
        Math.cos(d) - Math.sin(latRad) * Math.sin(lat2),
      );
    points.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [points] },
    properties: {},
  };
}
