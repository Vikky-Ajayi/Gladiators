"""Landrify scan services and risk-engine helpers."""

from __future__ import annotations

import logging
import math
import time
from collections import defaultdict
from datetime import date, timedelta

import requests
from django.conf import settings

logger = logging.getLogger(__name__)
HTTP_SESSION = requests.Session()
HTTP_SESSION.trust_env = False

NIGERIA_LATITUDE_RANGE = (4.0, 14.0)
NIGERIA_LONGITUDE_RANGE = (2.5, 15.0)
NOMINATIM_DELAY_SECONDS = 0.3
DEFAULT_RADIUS_KM = 0.05
DEFAULT_GEOCODE_LIMIT = 8
MAX_GEOCODE_LIMIT = 8
WEATHER_TIMEZONE = 'Africa/Lagos'

NOMINATIM_HEADERS = {
    'User-Agent': 'Landrify/1.0',
    'Accept-Language': 'en',
}
NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'
NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
MAPBOX_GEOCODE_FORWARD_URL = 'https://api.mapbox.com/search/geocode/v6/forward'
MAPBOX_GEOCODE_REVERSE_URL = 'https://api.mapbox.com/search/geocode/v6/reverse'
OPEN_ELEVATION_URL = 'https://api.open-elevation.com/api/v1/lookup'
OPEN_METEO_ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation'
OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
OPEN_METEO_CLIMATE_URL = 'https://climate-api.open-meteo.com/v1/climate'
MAPBOX_STATIC_URL_TEMPLATE = (
    'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/'
    '{lng},{lat},{zoom}/600x400@2x?access_token={token}'
)

ELEVATION_HIGH_RISK_THRESHOLD_METERS = 5
ELEVATION_MEDIUM_RISK_THRESHOLD_METERS = 15
EXTREME_RAIN_THRESHOLD_MM = 50
RAIN_TREND_THRESHOLD_RATIO = 0.10
FLOOD_TRAJECTORY_THRESHOLD_RATIO = 0.15
TEMPERATURE_TREND_THRESHOLD_C = 0.5

MAPBOX_ZOOM_BREAKPOINTS = (
    (0.05, 18),
    (0.25, 17),
    (0.50, 16),
    (1.00, 15),
    (2.00, 14),
    (5.00, 13),
    (10.00, 12),
)

HIGH_EROSION_STATES = {
    'Abia',
    'Akwa Ibom',
    'Anambra',
    'Cross River',
    'Ebonyi',
    'Enugu',
    'Imo',
}
COASTAL_STATES = {
    'Bayelsa',
    'Delta',
    'Edo',
    'Lagos',
    'Ondo',
    'Rivers',
}

RISK_WEIGHTS = {
    'legal': 40,
    'flood': 30,
    'erosion': 15,
    'dam': 15,
}
RISK_SCORE_MAP = {
    'very_low': 0,
    'low': 20,
    'medium': 50,
    'high': 80,
    'very_high': 100,
    'critical': 100,
    'unknown': 30,
}
RISK_SEVERITY = {
    'unknown': 0,
    'very_low': 1,
    'low': 2,
    'medium': 3,
    'high': 4,
    'very_high': 5,
    'critical': 6,
}

WMO_WEATHER_CODES = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
}


def _request_json(
    method: str,
    url: str,
    *,
    service_name: str,
    params: dict | None = None,
    json: dict | None = None,
    headers: dict | None = None,
    timeout: int = 10,
) -> dict | list | None:
    """Send an HTTP request and return parsed JSON or ``None`` on failure."""
    try:
        response = HTTP_SESSION.request(
            method=method,
            url=url,
            params=params,
            json=json,
            headers=headers,
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        logger.warning("%s request failed: %s", service_name, exc)
    except ValueError as exc:
        logger.warning("%s returned invalid JSON: %s", service_name, exc)
    return None


def _safe_float(value) -> float | None:
    """Convert a value to ``float`` when possible."""
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _round_or_none(value: float | None, digits: int = 2) -> float | None:
    """Round a number when present, otherwise return ``None``."""
    return round(value, digits) if value is not None else None


def _is_within_nigeria(lat: float, lng: float) -> bool:
    """Return ``True`` when coordinates fall inside Landrify's Nigeria bounds."""
    return (
        NIGERIA_LATITUDE_RANGE[0] <= lat <= NIGERIA_LATITUDE_RANGE[1]
        and NIGERIA_LONGITUDE_RANGE[0] <= lng <= NIGERIA_LONGITUDE_RANGE[1]
    )


def _normalise_state(value: str) -> str:
    """Normalise state names returned by geocoding services."""
    return (value or '').replace(' State', '').strip()


def _extract_lga(address_data: dict) -> str:
    """Extract the most useful LGA-like field from a Nominatim address payload."""
    return (
        address_data.get('county')
        or address_data.get('city_district')
        or address_data.get('municipality')
        or address_data.get('city')
        or address_data.get('town')
        or address_data.get('village')
        or ''
    )


def _get_mapbox_token() -> str:
    """Return the configured Mapbox token when available."""
    return (getattr(settings, 'MAPBOX_TOKEN', '') or '').strip()


def _mapbox_context_name(context: dict, key: str) -> str:
    """Extract a named context object from a Mapbox feature."""
    value = context.get(key) or {}
    if isinstance(value, dict):
        return (value.get('name') or '').strip()
    return ''


def _extract_mapbox_lga(context: dict) -> str:
    """Best-effort LGA extraction from Mapbox context objects."""
    place_context = context.get('place') or {}
    alternate = place_context.get('alternate') or {}
    candidates = [
        alternate.get('name'),
        _mapbox_context_name(context, 'district'),
        _mapbox_context_name(context, 'locality'),
        _mapbox_context_name(context, 'neighborhood'),
        place_context.get('name'),
    ]
    for candidate in candidates:
        if candidate:
            return str(candidate).strip()
    return ''


def _dedupe_geocode_results(results: list[dict], limit: int) -> list[dict]:
    """Deduplicate geocode results while preserving order."""
    seen: set[tuple[str, str, str]] = set()
    deduped: list[dict] = []
    for item in results:
        key = (
            str(item.get('label') or '').strip().lower(),
            f"{float(item.get('latitude')):.6f}",
            f"{float(item.get('longitude')):.6f}",
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
        if len(deduped) >= limit:
            break
    return deduped


def _mapbox_forward_geocode(query: str, limit: int) -> list[dict]:
    """Forward geocode with Mapbox Geocoding v6 when a token is configured."""
    token = _get_mapbox_token()
    if not token:
        return []

    data = _request_json(
        'GET',
        MAPBOX_GEOCODE_FORWARD_URL,
        service_name='Mapbox forward geocode',
        params={
            'q': query,
            'country': 'NG',
            'language': 'en',
            'limit': limit,
            'autocomplete': 'true',
            'access_token': token,
        },
        timeout=10,
    )
    if not isinstance(data, dict):
        return []

    features = data.get('features') or []
    results: list[dict] = []
    for feature in features:
        geometry = feature.get('geometry') or {}
        coordinates = geometry.get('coordinates') or []
        if len(coordinates) < 2:
            continue

        lng = _safe_float(coordinates[0])
        lat = _safe_float(coordinates[1])
        if lat is None or lng is None or not _is_within_nigeria(lat, lng):
            continue

        properties = feature.get('properties') or {}
        context = properties.get('context') or {}
        label = (
            properties.get('full_address')
            or ', '.join(
                [part for part in (properties.get('name'), properties.get('place_formatted')) if part]
            )
            or f'{lat}, {lng}'
        )
        results.append(
            {
                'label': label,
                'latitude': round(lat, 8),
                'longitude': round(lng, 8),
                'type': properties.get('feature_type', ''),
                'state': _normalise_state(_mapbox_context_name(context, 'region')),
                'lga': _extract_mapbox_lga(context),
                'place_id': properties.get('mapbox_id') or feature.get('id') or '',
            }
        )
    return results


def _nominatim_forward_geocode(query: str, limit: int) -> list[dict]:
    """Fallback forward geocoder using Nominatim."""
    time.sleep(NOMINATIM_DELAY_SECONDS)
    data = _request_json(
        'GET',
        NOMINATIM_SEARCH_URL,
        service_name='Nominatim forward geocode',
        params={
            'q': query,
            'countrycodes': 'ng',
            'format': 'json',
            'addressdetails': 1,
            'limit': limit,
        },
        headers=NOMINATIM_HEADERS,
        timeout=10,
    )
    if not isinstance(data, list):
        return []

    results = []
    for item in data:
        lat = _safe_float(item.get('lat'))
        lng = _safe_float(item.get('lon'))
        if lat is None or lng is None or not _is_within_nigeria(lat, lng):
            continue

        address = item.get('address') or {}
        results.append(
            {
                'label': item.get('display_name', f'{lat}, {lng}'),
                'latitude': round(lat, 8),
                'longitude': round(lng, 8),
                'type': item.get('type', ''),
                'state': _normalise_state(address.get('state', '')),
                'lga': _extract_lga(address),
                'place_id': str(item.get('place_id', '')),
            }
        )
    return results


def _mapbox_reverse_geocode(lat: float, lng: float) -> dict:
    """Reverse geocode with Mapbox Geocoding v6 when a token is configured."""
    token = _get_mapbox_token()
    if not token:
        return {}

    data = _request_json(
        'GET',
        MAPBOX_GEOCODE_REVERSE_URL,
        service_name='Mapbox reverse geocode',
        params={
            'longitude': lng,
            'latitude': lat,
            'language': 'en',
            'access_token': token,
        },
        timeout=10,
    )
    if not isinstance(data, dict):
        return {}

    features = data.get('features') or []
    for feature in features:
        properties = feature.get('properties') or {}
        context = properties.get('context') or {}
        label = (
            properties.get('full_address')
            or ', '.join(
                [part for part in (properties.get('name'), properties.get('place_formatted')) if part]
            )
            or f'{lat}, {lng}'
        )
        if not label:
            continue

        return {
            'address': label,
            'state': _normalise_state(_mapbox_context_name(context, 'region')),
            'lga': _extract_mapbox_lga(context),
            'place_id': str(properties.get('mapbox_id') or feature.get('id') or ''),
        }
    return {}


def _get_mapbox_zoom(radius_km: float) -> int:
    """Convert a scan radius in kilometres into a Mapbox static-image zoom."""
    for max_radius, zoom in MAPBOX_ZOOM_BREAKPOINTS:
        if radius_km <= max_radius:
            return zoom
    return 11


def _average(values: list[float]) -> float | None:
    """Return the arithmetic mean for a list, or ``None`` when empty."""
    if not values:
        return None
    return sum(values) / len(values)


def _years_ago(reference_date: date, years: int) -> date:
    """Return a date offset by a whole number of years."""
    try:
        return reference_date.replace(year=reference_date.year - years)
    except ValueError:
        return reference_date.replace(month=2, day=28, year=reference_date.year - years)


def _trend_from_halves(values_by_year: list[tuple[int, float]]) -> str:
    """Classify a rainfall trend by comparing the first half and second half."""
    if len(values_by_year) < 2:
        return 'stable'

    midpoint = len(values_by_year) // 2
    first_half = [value for _, value in values_by_year[:midpoint] if value is not None]
    second_half = [value for _, value in values_by_year[midpoint:] if value is not None]
    first_average = _average(first_half)
    second_average = _average(second_half)

    if first_average in (None, 0) or second_average is None:
        return 'stable'

    delta_ratio = (second_average - first_average) / first_average
    if delta_ratio > RAIN_TREND_THRESHOLD_RATIO:
        return 'increasing'
    if delta_ratio < -RAIN_TREND_THRESHOLD_RATIO:
        return 'decreasing'
    return 'stable'


def _temperature_trend_from_halves(values_by_year: list[tuple[int, float]]) -> str:
    """Classify a temperature trend using a simple first-half/second-half delta."""
    if len(values_by_year) < 2:
        return 'stable'

    midpoint = len(values_by_year) // 2
    first_half = [value for _, value in values_by_year[:midpoint] if value is not None]
    second_half = [value for _, value in values_by_year[midpoint:] if value is not None]
    first_average = _average(first_half)
    second_average = _average(second_half)

    if first_average is None or second_average is None:
        return 'stable'

    delta = second_average - first_average
    if delta > TEMPERATURE_TREND_THRESHOLD_C:
        return 'warming'
    if delta < -TEMPERATURE_TREND_THRESHOLD_C:
        return 'cooling'
    return 'stable'


def _weather_description(weather_code: int | None) -> str:
    """Map a WMO weather code to a human-readable description."""
    if weather_code is None:
        return 'Unknown conditions'
    return WMO_WEATHER_CODES.get(weather_code, 'Unknown conditions')


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate the distance between two coordinates in kilometres."""
    earth_radius_km = 6371
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * earth_radius_km * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_location_info(lat: float, lng: float) -> dict:
    """Reverse geocode coordinates into address, state, LGA, and place ID."""
    mapbox_result = _mapbox_reverse_geocode(lat, lng)
    if mapbox_result:
        return mapbox_result

    time.sleep(NOMINATIM_DELAY_SECONDS)
    data = _request_json(
        'GET',
        NOMINATIM_REVERSE_URL,
        service_name='Nominatim reverse geocode',
        params={
            'lat': lat,
            'lon': lng,
            'format': 'json',
            'addressdetails': 1,
            'zoom': 14,
        },
        headers=NOMINATIM_HEADERS,
        timeout=10,
    )
    if not isinstance(data, dict) or data.get('error'):
        return {}

    address = data.get('address') or {}
    return {
        'address': data.get('display_name', f'{lat}, {lng}'),
        'state': _normalise_state(address.get('state', '')),
        'lga': _extract_lga(address),
        'place_id': str(data.get('osm_id') or data.get('place_id') or ''),
    }


def get_elevation(lat: float, lng: float) -> float | None:
    """Fetch elevation in metres above sea level with a primary and fallback source."""
    primary_data = _request_json(
        'POST',
        OPEN_ELEVATION_URL,
        service_name='Open-Elevation',
        json={'locations': [{'latitude': lat, 'longitude': lng}]},
        timeout=10,
    )
    if isinstance(primary_data, dict) and primary_data.get('results'):
        elevation = _safe_float(primary_data['results'][0].get('elevation'))
        if elevation is not None:
            return round(elevation, 2)

    fallback_data = _request_json(
        'GET',
        OPEN_METEO_ELEVATION_URL,
        service_name='Open-Meteo elevation',
        params={'latitude': lat, 'longitude': lng},
        timeout=8,
    )
    if not isinstance(fallback_data, dict):
        return None

    elevation = fallback_data.get('elevation')
    if isinstance(elevation, list) and elevation:
        return _round_or_none(_safe_float(elevation[0]))
    if isinstance(elevation, (int, float)):
        return round(float(elevation), 2)
    return None


def get_satellite_image_url(lat: float, lng: float, radius_km: float = DEFAULT_RADIUS_KM) -> str | None:
    """Build a Mapbox Static Images API URL for the requested point."""
    token = getattr(settings, 'MAPBOX_TOKEN', '') or ''
    if not token:
        logger.info("MAPBOX_TOKEN not set; satellite imagery unavailable.")
        return None

    zoom = _get_mapbox_zoom(radius_km)
    return MAPBOX_STATIC_URL_TEMPLATE.format(lng=lng, lat=lat, zoom=zoom, token=token)


def check_legal_status(lat: float, lng: float) -> dict:
    """Check whether the point falls inside a seeded government acquisition area."""
    from apps.scans.models import AcquisitionArea

    acquisitions = AcquisitionArea.objects.filter(
        min_lat__lte=lat,
        max_lat__gte=lat,
        min_lng__lte=lng,
        max_lng__gte=lng,
    )
    area = acquisitions.first()
    if area is None:
        return {
            'is_government': False,
            'under_acquisition': False,
            'authority': '',
            'acquisition_type': '',
            'area_name': '',
            'gazette_reference': '',
            'note': 'No government acquisition records found for this location. Independent legal verification is still recommended.',
        }

    return {
        'is_government': True,
        'under_acquisition': True,
        'authority': area.authority,
        'acquisition_type': area.acquisition_type,
        'area_name': area.area_name,
        'gazette_reference': area.gazette_reference,
        'note': area.notes or 'This land falls within a government acquisition area. Proceed only after independent legal clearance.',
    }


def check_flood_risk(lat: float, lng: float, elevation: float | None = None) -> dict:
    """Assess flood exposure using seeded flood zones with elevation heuristics as fallback."""
    from apps.scans.models import FloodRiskZone

    zones = list(
        FloodRiskZone.objects.filter(
            min_lat__lte=lat,
            max_lat__gte=lat,
            min_lng__lte=lng,
            max_lng__gte=lng,
        )
    )
    if zones:
        zone = max(zones, key=lambda item: RISK_SEVERITY.get(item.risk_level, 0))
        return {
            'risk_level': zone.risk_level,
            'zone_name': zone.zone_name,
            'flood_type': zone.flood_type,
            'peak_months': zone.peak_months,
            'last_major_flood_year': zone.last_major_flood_year,
            'data_source': zone.data_source,
            'notes': zone.notes,
            'method': 'zone_data',
        }

    if elevation is not None:
        if elevation < ELEVATION_HIGH_RISK_THRESHOLD_METERS:
            return {
                'risk_level': 'high',
                'zone_name': '',
                'flood_type': '',
                'peak_months': '',
                'last_major_flood_year': None,
                'data_source': 'Elevation heuristic',
                'notes': 'Very low elevation suggests elevated flood exposure.',
                'method': 'elevation',
            }
        if elevation < ELEVATION_MEDIUM_RISK_THRESHOLD_METERS:
            return {
                'risk_level': 'medium',
                'zone_name': '',
                'flood_type': '',
                'peak_months': '',
                'last_major_flood_year': None,
                'data_source': 'Elevation heuristic',
                'notes': 'Low elevation suggests moderate flood exposure.',
                'method': 'elevation',
            }
        return {
            'risk_level': 'low',
            'zone_name': '',
            'flood_type': '',
            'peak_months': '',
            'last_major_flood_year': None,
            'data_source': 'Elevation heuristic',
            'notes': 'Elevation does not indicate elevated flood exposure.',
            'method': 'elevation',
        }

    return {
        'risk_level': 'unknown',
        'zone_name': '',
        'flood_type': '',
        'peak_months': '',
        'last_major_flood_year': None,
        'data_source': '',
        'notes': 'Insufficient data for flood assessment.',
        'method': 'none',
    }


def check_erosion_risk(lat: float, lng: float, state: str = '') -> dict:
    """Assess erosion risk using regional heuristics for Nigerian states."""
    del lat, lng
    state_name = (state or '').strip()

    if state_name in HIGH_EROSION_STATES:
        return {
            'risk_level': 'high',
            'reason': f'{state_name} is in a high-erosion belt.',
            'recommendation': 'Commission a soil survey and erosion-control design review before development.',
        }

    if state_name in COASTAL_STATES:
        return {
            'risk_level': 'medium',
            'reason': f'{state_name} has coastal or riverine erosion exposure.',
            'recommendation': 'Assess shoreline, drainage, and embankment conditions before purchase or construction.',
        }

    return {
        'risk_level': 'low',
        'reason': 'No elevated regional erosion risk identified.',
        'recommendation': 'Standard site inspection remains recommended.',
    }


def check_dam_proximity(lat: float, lng: float) -> dict:
    """Find the nearest seeded dam and classify proximity risk by distance."""
    from apps.scans.models import Dam

    dams = Dam.objects.all()
    if not dams.exists():
        return {
            'nearest_dam': '',
            'distance_km': None,
            'risk_level': 'unknown',
            'river_basin': '',
            'capacity_mcm': None,
            'height_m': None,
            'year_completed': None,
            'purpose': '',
            'downstream_states': '',
            'notes': 'Dam data unavailable.',
        }

    nearest_dam = None
    min_distance = float('inf')
    for dam in dams:
        distance_km = haversine_distance(lat, lng, float(dam.latitude), float(dam.longitude))
        if distance_km < min_distance:
            min_distance = distance_km
            nearest_dam = dam

    if min_distance < 5:
        risk_level = 'critical'
    elif min_distance < 20:
        risk_level = 'high'
    elif min_distance < 50:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    return {
        'nearest_dam': nearest_dam.name if nearest_dam else '',
        'distance_km': round(min_distance, 2) if nearest_dam else None,
        'risk_level': risk_level,
        'river_basin': nearest_dam.river_basin if nearest_dam else '',
        'capacity_mcm': nearest_dam.capacity_mcm if nearest_dam else None,
        'height_m': nearest_dam.height_m if nearest_dam else None,
        'year_completed': nearest_dam.year_completed if nearest_dam else None,
        'purpose': nearest_dam.purpose if nearest_dam else '',
        'downstream_states': nearest_dam.downstream_states if nearest_dam else '',
        'notes': nearest_dam.notes if nearest_dam else '',
    }


def calculate_risk_score(legal: dict, flood: dict, erosion: dict, dam: dict) -> int:
    """Calculate the overall Landrify risk score on a 0-100 scale."""
    legal_score = 100 if legal.get('is_government') else 0
    flood_score = RISK_SCORE_MAP.get(flood.get('risk_level', 'unknown'), 30)
    erosion_score = RISK_SCORE_MAP.get(erosion.get('risk_level', 'unknown'), 30)
    dam_score = RISK_SCORE_MAP.get(dam.get('risk_level', 'unknown'), 10)

    weighted_score = (
        legal_score * RISK_WEIGHTS['legal'] / 100
        + flood_score * RISK_WEIGHTS['flood'] / 100
        + erosion_score * RISK_WEIGHTS['erosion'] / 100
        + dam_score * RISK_WEIGHTS['dam'] / 100
    )
    return min(100, max(0, round(weighted_score)))


def get_risk_level(score: int) -> str:
    """Map a numeric risk score to the public risk-level band."""
    if score < 25:
        return 'low'
    if score < 50:
        return 'medium'
    if score < 75:
        return 'high'
    return 'critical'


def run_land_scan(scan, full_report: bool = False) -> dict:
    """Run the full scan pipeline for a ``LandScan`` instance."""
    from django.utils import timezone

    lat = float(scan.latitude)
    lng = float(scan.longitude)
    radius_km = float(scan.radius_km or DEFAULT_RADIUS_KM)

    location_info = get_location_info(lat, lng)
    if location_info:
        scan.address = location_info.get('address', scan.address)
        scan.state = location_info.get('state', scan.state)
        scan.lga = location_info.get('lga', scan.lga)
        scan.place_id = location_info.get('place_id', scan.place_id)
    elif not scan.address:
        scan.address = scan.address_hint or f'{lat}, {lng}'

    scan.satellite_image_url = get_satellite_image_url(lat, lng, radius_km) or ''

    elevation = get_elevation(lat, lng)
    if elevation is not None:
        scan.elevation_meters = elevation

    try:
        weather_current = get_current_weather(lat, lng)
    except Exception as exc:
        logger.warning("Weather current fetch failed: %s", exc)
        weather_current = None

    try:
        weather_historical = get_historical_weather(lat, lng, years=10)
    except Exception as exc:
        logger.warning("Weather historical fetch failed: %s", exc)
        weather_historical = None

    try:
        weather_projection = get_climate_projection(lat, lng)
    except Exception as exc:
        logger.warning("Weather projection fetch failed: %s", exc)
        weather_projection = None

    scan.weather_current = weather_current
    scan.weather_historical = weather_historical
    scan.weather_projection = weather_projection
    scan.weather_summary = summarise_weather(weather_current, weather_historical, weather_projection)

    legal = check_legal_status(lat, lng)
    scan.is_government_land = legal.get('is_government', False)
    scan.is_under_acquisition = legal.get('under_acquisition', False)
    scan.acquisition_authority = legal.get('authority', '')
    scan.acquisition_type = legal.get('acquisition_type', '')
    scan.gazette_reference = legal.get('gazette_reference', '')
    scan.legal_notes = legal.get('note', '')

    flood = check_flood_risk(lat, lng, elevation)
    scan.flood_risk_level = flood.get('risk_level', 'unknown')
    scan.flood_zone_name = flood.get('zone_name', '')
    scan.flood_type = flood.get('flood_type', '')
    scan.flood_peak_months = flood.get('peak_months', '')
    scan.flood_last_major_year = flood.get('last_major_flood_year')
    scan.flood_notes = flood.get('notes', '')
    scan.flood_data_source = flood.get('data_source', '')

    erosion = check_erosion_risk(lat, lng, scan.state)
    scan.erosion_risk_level = erosion.get('risk_level', 'unknown')

    dam = check_dam_proximity(lat, lng)
    scan.nearest_dam_name = dam.get('nearest_dam', '')
    scan.nearest_dam_distance_km = dam.get('distance_km')
    scan.dam_risk_level = dam.get('risk_level', 'unknown')
    scan.dam_river_basin = dam.get('river_basin', '')
    scan.dam_capacity_mcm = dam.get('capacity_mcm')
    scan.dam_height_m = dam.get('height_m')
    scan.dam_year_completed = dam.get('year_completed')
    scan.dam_purpose = dam.get('purpose', '')
    scan.dam_downstream_states = dam.get('downstream_states', '')
    scan.dam_notes = dam.get('notes', '')

    scan.risk_score = calculate_risk_score(legal, flood, erosion, dam)
    scan.risk_level = get_risk_level(scan.risk_score)
    scan.status = 'completed'
    scan.save()

    if not full_report:
        scan.report_generated = True
        scan.report_generated_at = timezone.now()
        scan.save(update_fields=['report_generated', 'report_generated_at'])
        return {
            'legal': legal,
            'flood': flood,
            'erosion': erosion,
            'dam': dam,
            'elevation': elevation,
            'weather_current': weather_current,
            'weather_historical': weather_historical,
            'weather_projection': weather_projection,
            'ai_report_status': 'skipped_basic_plan',
        }

    from apps.scans.ai_report import generate_ai_report

    scan_data = {
        'latitude': lat,
        'longitude': lng,
        'radius_km': radius_km,
        'address_hint': scan.address_hint,
        'address': scan.address,
        'state': scan.state,
        'lga': scan.lga,
        'elevation_meters': scan.elevation_meters,
        'satellite_image_url': scan.satellite_image_url,
        'is_government_land': scan.is_government_land,
        'is_under_acquisition': scan.is_under_acquisition,
        'acquisition_authority': scan.acquisition_authority,
        'acquisition_type': scan.acquisition_type,
        'gazette_reference': scan.gazette_reference,
        'legal_notes': scan.legal_notes,
        'flood_risk_level': scan.flood_risk_level,
        'flood_zone_name': scan.flood_zone_name,
        'flood_type': scan.flood_type,
        'flood_peak_months': scan.flood_peak_months,
        'flood_last_major_year': scan.flood_last_major_year,
        'flood_notes': scan.flood_notes,
        'flood_data_source': scan.flood_data_source,
        'erosion_risk_level': scan.erosion_risk_level,
        'nearest_dam_name': scan.nearest_dam_name,
        'nearest_dam_distance_km': scan.nearest_dam_distance_km,
        'dam_risk_level': scan.dam_risk_level,
        'dam_river_basin': scan.dam_river_basin,
        'dam_capacity_mcm': scan.dam_capacity_mcm,
        'dam_height_m': scan.dam_height_m,
        'dam_year_completed': scan.dam_year_completed,
        'dam_purpose': scan.dam_purpose,
        'dam_downstream_states': scan.dam_downstream_states,
        'dam_notes': scan.dam_notes,
        'risk_score': scan.risk_score,
        'risk_level': scan.risk_level,
        'accuracy_meters': float(scan.accuracy_meters) if scan.accuracy_meters else None,
        'weather_current': weather_current,
        'weather_historical': weather_historical,
        'weather_projection': weather_projection,
        'weather_summary': scan.weather_summary,
    }

    ai_result = generate_ai_report(scan_data)
    scan.ai_report = ai_result.get('report', '')
    scan.ai_report_model = ai_result.get('model', '')
    scan.ai_report_tokens = (ai_result.get('tokens_used') or {}).get('total')
    scan.report_generated = True
    scan.report_generated_at = timezone.now()
    scan.save(
        update_fields=[
            'ai_report',
            'ai_report_model',
            'ai_report_tokens',
            'report_generated',
            'report_generated_at',
        ]
    )

    return {
        'legal': legal,
        'flood': flood,
        'erosion': erosion,
        'dam': dam,
        'elevation': elevation,
        'weather_current': weather_current,
        'weather_historical': weather_historical,
        'weather_projection': weather_projection,
        'ai_report_status': ai_result.get('status'),
    }


def forward_geocode(query: str, limit: int = DEFAULT_GEOCODE_LIMIT) -> list[dict]:
    """Forward geocode a Nigerian address using Mapbox first, Nominatim second."""
    capped_limit = max(1, min(int(limit), MAX_GEOCODE_LIMIT))
    mapbox_results = _mapbox_forward_geocode(query, capped_limit)
    if len(mapbox_results) >= capped_limit:
        return mapbox_results[:capped_limit]

    fallback_results = _nominatim_forward_geocode(query, capped_limit)
    return _dedupe_geocode_results(mapbox_results + fallback_results, capped_limit)


def get_current_weather(lat: float, lng: float) -> dict | None:
    """Fetch current weather conditions from Open-Meteo."""
    data = _request_json(
        'GET',
        OPEN_METEO_FORECAST_URL,
        service_name='Open-Meteo current weather',
        params={
            'latitude': lat,
            'longitude': lng,
            'current': 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
            'timezone': WEATHER_TIMEZONE,
        },
        timeout=10,
    )
    if not isinstance(data, dict):
        return None

    current = data.get('current') or {}
    weather_code = current.get('weather_code')
    if weather_code is None:
        return None

    return {
        'temperature_c': _round_or_none(_safe_float(current.get('temperature_2m'))),
        'humidity_percent': _round_or_none(_safe_float(current.get('relative_humidity_2m'))),
        'precipitation_mm': _round_or_none(_safe_float(current.get('precipitation'))),
        'wind_speed_kmh': _round_or_none(_safe_float(current.get('wind_speed_10m'))),
        'weather_code': int(weather_code),
        'description': _weather_description(int(weather_code)),
    }


def get_historical_weather(lat: float, lng: float, years: int = 10) -> dict | None:
    """Fetch and summarise historical weather for the requested point."""
    today = date.today()
    start_date = _years_ago(today, years)
    end_date = today - timedelta(days=1)

    data = _request_json(
        'GET',
        OPEN_METEO_ARCHIVE_URL,
        service_name='Open-Meteo historical weather',
        params={
            'latitude': lat,
            'longitude': lng,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'daily': 'precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration',
            'timezone': WEATHER_TIMEZONE,
        },
        timeout=30,
    )
    if not isinstance(data, dict):
        return None

    daily = data.get('daily') or {}
    dates = daily.get('time') or []
    rainfall = daily.get('precipitation_sum') or []
    max_temps = daily.get('temperature_2m_max') or []
    min_temps = daily.get('temperature_2m_min') or []

    if not dates:
        return None

    per_year: dict[int, dict[str, list | float | int]] = defaultdict(
        lambda: {
            'rainfall_total': 0.0,
            'max_temps': [],
            'min_temps': [],
            'extreme_rain_days': 0,
        }
    )

    for index, date_value in enumerate(dates):
        try:
            year = int(str(date_value)[:4])
        except (TypeError, ValueError):
            continue

        rain_value = _safe_float(rainfall[index]) if index < len(rainfall) else None
        max_temp = _safe_float(max_temps[index]) if index < len(max_temps) else None
        min_temp = _safe_float(min_temps[index]) if index < len(min_temps) else None
        bucket = per_year[year]

        if rain_value is not None:
            bucket['rainfall_total'] += rain_value
            if rain_value > EXTREME_RAIN_THRESHOLD_MM:
                bucket['extreme_rain_days'] += 1
        if max_temp is not None:
            bucket['max_temps'].append(max_temp)
        if min_temp is not None:
            bucket['min_temps'].append(min_temp)

    years_sorted = sorted(per_year)
    if not years_sorted:
        return None

    rainfall_by_year = [(year, float(per_year[year]['rainfall_total'])) for year in years_sorted]
    avg_max_temp_by_year = [
        (year, _average(per_year[year]['max_temps']))  # type: ignore[arg-type]
        for year in years_sorted
    ]
    avg_min_temp_by_year = [
        (year, _average(per_year[year]['min_temps']))  # type: ignore[arg-type]
        for year in years_sorted
    ]

    total_rainfall_period = sum(value for _, value in rainfall_by_year)
    wettest_year, wettest_rainfall = max(rainfall_by_year, key=lambda item: item[1])
    driest_year, driest_rainfall = min(rainfall_by_year, key=lambda item: item[1])

    all_yearly_maxes = [value for _, value in avg_max_temp_by_year if value is not None]
    all_yearly_mins = [value for _, value in avg_min_temp_by_year if value is not None]
    total_extreme_rain_days = sum(int(per_year[year]['extreme_rain_days']) for year in years_sorted)

    return {
        'avg_annual_rainfall_mm': round(total_rainfall_period / len(years_sorted), 2),
        'total_rainfall_period_mm': round(total_rainfall_period, 2),
        'rainfall_trend': _trend_from_halves(rainfall_by_year),
        'avg_max_temp_c': _round_or_none(_average(all_yearly_maxes)),
        'avg_min_temp_c': _round_or_none(_average(all_yearly_mins)),
        'temp_trend': _temperature_trend_from_halves(
            [(year, value) for year, value in avg_max_temp_by_year if value is not None]
        ),
        'years_analysed': len(years_sorted),
        'wettest_year': wettest_year,
        'wettest_year_rainfall_mm': round(wettest_rainfall, 2),
        'driest_year': driest_year,
        'driest_year_rainfall_mm': round(driest_rainfall, 2),
        'extreme_rain_days_per_year': round(total_extreme_rain_days / len(years_sorted), 2),
    }


def get_climate_projection(lat: float, lng: float) -> dict | None:
    """Fetch MRI_AGCM3_2_S climate projections and summarise key milestones."""
    data = _request_json(
        'GET',
        OPEN_METEO_CLIMATE_URL,
        service_name='Open-Meteo climate projection',
        params={
            'latitude': lat,
            'longitude': lng,
            'start_date': '2025-01-01',
            'end_date': '2050-12-31',
            'models': 'MRI_AGCM3_2_S',
            'daily': 'precipitation_sum,temperature_2m_max,temperature_2m_min',
            'timezone': WEATHER_TIMEZONE,
        },
        timeout=60,
    )
    if not isinstance(data, dict):
        return None
    if data.get('error'):
        logger.warning("Open-Meteo climate projection returned an error: %s", data.get('reason'))
        return None

    daily = data.get('daily') or {}
    dates = daily.get('time') or []
    rainfall = daily.get('precipitation_sum') or []
    max_temps = daily.get('temperature_2m_max') or []

    if not dates:
        return None

    per_year: dict[int, dict[str, list | float]] = defaultdict(
        lambda: {
            'rainfall_total': 0.0,
            'max_temps': [],
        }
    )

    for index, date_value in enumerate(dates):
        try:
            year = int(str(date_value)[:4])
        except (TypeError, ValueError):
            continue

        rain_value = _safe_float(rainfall[index]) if index < len(rainfall) else None
        max_temp = _safe_float(max_temps[index]) if index < len(max_temps) else None
        bucket = per_year[year]

        if rain_value is not None:
            bucket['rainfall_total'] += rain_value
        if max_temp is not None:
            bucket['max_temps'].append(max_temp)

    def _projection_snapshot(target_year: int) -> dict:
        bucket = per_year.get(target_year) or {}
        return {
            'avg_annual_rainfall_mm': round(float(bucket.get('rainfall_total', 0.0)), 2)
            if bucket
            else None,
            'avg_max_temp_c': _round_or_none(_average(bucket.get('max_temps', []))),  # type: ignore[arg-type]
        }

    projection_2025 = _projection_snapshot(2025)
    projection_2050 = _projection_snapshot(2050)
    rainfall_2025 = projection_2025['avg_annual_rainfall_mm']
    rainfall_2050 = projection_2050['avg_annual_rainfall_mm']
    temp_2025 = projection_2025['avg_max_temp_c']
    temp_2050 = projection_2050['avg_max_temp_c']

    rainfall_change_percent = None
    if rainfall_2025 not in (None, 0) and rainfall_2050 is not None:
        rainfall_change_percent = round(((rainfall_2050 - rainfall_2025) / rainfall_2025) * 100, 2)

    temp_change_c = None
    if temp_2025 is not None and temp_2050 is not None:
        temp_change_c = round(temp_2050 - temp_2025, 2)

    if rainfall_change_percent is None:
        flood_risk_trajectory = 'stable'
    elif rainfall_change_percent > FLOOD_TRAJECTORY_THRESHOLD_RATIO * 100:
        flood_risk_trajectory = 'worsening'
    elif rainfall_change_percent < -FLOOD_TRAJECTORY_THRESHOLD_RATIO * 100:
        flood_risk_trajectory = 'improving'
    else:
        flood_risk_trajectory = 'stable'

    return {
        'projection_2030': _projection_snapshot(2030),
        'projection_2035': _projection_snapshot(2035),
        'projection_2040': _projection_snapshot(2040),
        'projection_2050': projection_2050,
        'rainfall_change_2025_to_2050_percent': rainfall_change_percent,
        'temp_change_2025_to_2050_c': temp_change_c,
        'flood_risk_trajectory': flood_risk_trajectory,
        'model': 'MRI_AGCM3_2_S',
    }


def summarise_weather(
    current: dict | None,
    historical: dict | None,
    projection: dict | None,
) -> str:
    """Build a concise weather summary string for UI and AI grounding."""
    parts: list[str] = []

    if current:
        parts.append(
            (
                f"Current conditions: {current.get('temperature_c', '?')} C, "
                f"{current.get('humidity_percent', '?')}% humidity, "
                f"{current.get('precipitation_mm', '?')} mm precipitation, "
                f"{current.get('description', 'Unknown conditions')}."
            )
        )

    if historical:
        parts.append(
            (
                f"Historical climate: average annual rainfall "
                f"{historical.get('avg_annual_rainfall_mm', '?')} mm with a "
                f"{historical.get('rainfall_trend', 'stable')} trend; average maximum temperature "
                f"{historical.get('avg_max_temp_c', '?')} C with a "
                f"{historical.get('temp_trend', 'stable')} trend."
            )
        )

    if projection:
        projection_2050 = projection.get('projection_2050') or {}
        parts.append(
            (
                f"Climate projection ({projection.get('model', 'model unavailable')}): 2050 rainfall "
                f"{projection_2050.get('avg_annual_rainfall_mm', '?')} mm/year, average max temperature "
                f"{projection_2050.get('avg_max_temp_c', '?')} C, flood trajectory "
                f"{projection.get('flood_risk_trajectory', 'stable')}."
            )
        )

    return ' '.join(parts)
