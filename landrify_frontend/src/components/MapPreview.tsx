import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Props {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}

const NIGERIA_CENTER: [number, number] = [8.0, 9.0];
const OPEN_STREET_MAP_STYLE = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
} as const;

export function MapPreview({
  latitude,
  longitude,
  radiusKm,
  onPick,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: OPEN_STREET_MAP_STYLE as any,
      center: NIGERIA_CENTER,
      zoom: 5.5,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    if (onPick) {
      map.on('click', (event) => onPick(event.lngLat.lat, event.lngLat.lng));
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
  }, [onPick]);

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
      const source = map.getSource('scan-circle') as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData(circlePolygon(latitude, longitude, radiusKm));
    };
    if (map.isStyleLoaded()) update();
    else map.once('load', update);
  }, [latitude, longitude, radiusKm]);

  const aspectClass = 'aspect-square sm:aspect-[16/10]';

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden ${className ?? ''}`}>
      <div ref={containerRef} className={`${aspectClass} w-full bg-gray-200`} />
      {latitude != null && longitude != null && (
        <div className="absolute bottom-2 left-2 z-10 rounded-md bg-black/60 px-2 py-1 text-[10.5px] font-mono text-white pointer-events-none">
          scan radius {(radiusKm * 1000).toFixed(0)} m | {(Math.PI * radiusKm * radiusKm * 100).toFixed(2)} ha
        </div>
      )}
    </div>
  );
}

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
