"""
Landrify Risk Engine
--------------------
Synchronous risk calculation service.
Uses 100% free APIs — no credit card required:
  - Nominatim (OpenStreetMap) for geocoding
  - Open-Elevation API for elevation data
  - Mapbox Static Maps for satellite imagery (free token, no card)
"""
import math
import logging
import time
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Nominatim requires a descriptive User-Agent
NOMINATIM_HEADERS = {
    'User-Agent': 'Landrify/1.0 (land verification platform Nigeria; contact@landrify.ng)',
    'Accept-Language': 'en',
}


# ─── Haversine Distance ───────────────────────────────────────────────────────

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in kilometers."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi    = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ─── Geocoding: Nominatim (OpenStreetMap) — FREE, no key, no card ─────────────

def get_location_info(lat: float, lng: float) -> dict:
    """
    Reverse geocode coordinates → address, state, LGA.
    Uses Nominatim (OpenStreetMap) — completely free, no API key needed.
    Rate limit: 1 request/second (we respect this with a small sleep).
    """
    try:
        time.sleep(0.5)   # Nominatim fair-use policy
        response = requests.get(
            'https://nominatim.openstreetmap.org/reverse',
            params={
                'lat':            lat,
                'lon':            lng,
                'format':         'json',
                'addressdetails': 1,
                'zoom':           14,
            },
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )

        if response.status_code != 200:
            logger.warning(f"Nominatim returned {response.status_code}")
            return {}

        data = response.json()
        if 'error' in data:
            return {}

        address = data.get('address', {})

        # Nominatim uses 'state' and various sub-fields for LGA
        state = address.get('state', '')
        lga   = (
            address.get('county') or
            address.get('city_district') or
            address.get('city') or
            address.get('town') or
            address.get('village') or
            ''
        )

        # Clean up common Nigerian state suffix
        state = state.replace(' State', '').strip()

        full_address = data.get('display_name', f'{lat}, {lng}')

        return {
            'address':  full_address,
            'state':    state,
            'lga':      lga,
            'place_id': data.get('osm_id', ''),
        }

    except Exception as e:
        logger.error(f"Nominatim geocoding error: {e}")
        return {}


# ─── Elevation: Open-Elevation API — FREE, no key, no card ───────────────────

def get_elevation(lat: float, lng: float) -> float | None:
    """
    Get elevation in metres above sea level.
    Uses Open-Elevation API — completely free, no API key needed.
    Falls back to a secondary provider if the primary is down.
    """
    # Primary: open-elevation.com
    try:
        response = requests.post(
            'https://api.open-elevation.com/api/v1/lookup',
            json={'locations': [{'latitude': lat, 'longitude': lng}]},
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            if data.get('results'):
                return round(data['results'][0]['elevation'], 2)
    except Exception as e:
        logger.warning(f"Open-Elevation primary error: {e}")

    # Fallback: Open-Meteo elevation (also free)
    try:
        response = requests.get(
            'https://api.open-meteo.com/v1/elevation',
            params={'latitude': lat, 'longitude': lng},
            timeout=8,
        )
        if response.status_code == 200:
            data = response.json()
            elevation = data.get('elevation')
            if elevation and isinstance(elevation, list):
                return round(elevation[0], 2)
            if elevation and isinstance(elevation, (int, float)):
                return round(float(elevation), 2)
    except Exception as e:
        logger.warning(f"Open-Meteo elevation fallback error: {e}")

    return None


# ─── Satellite Imagery: Mapbox — FREE tier, no card ──────────────────────────

def get_satellite_image_url(lat: float, lng: float, radius_km: float = 1.0) -> str | None:
    """
    Build a Mapbox satellite imagery URL.

    Mapbox free tier: 50,000 map loads/month — no credit card required.
    Sign up at: https://account.mapbox.com/auth/signup/
    Set MAPBOX_TOKEN in .env

    Falls back gracefully to None if token not set.
    """
    token = getattr(settings, 'MAPBOX_TOKEN', '') or ''
    if not token:
        logger.info("MAPBOX_TOKEN not set — satellite imagery unavailable.")
        return None

    # Zoom level from radius
    if   radius_km <= 0.25: zoom = 17
    elif radius_km <= 0.5:  zoom = 16
    elif radius_km <= 1:    zoom = 15
    elif radius_km <= 2:    zoom = 14
    elif radius_km <= 5:    zoom = 13
    elif radius_km <= 10:   zoom = 12
    else:                   zoom = 11

    # Mapbox Static Images API
    return (
        f"https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static"
        f"/{lng},{lat},{zoom}"
        f"/600x400@2x"
        f"?access_token={token}"
    )


# ─── Legal Status Check ───────────────────────────────────────────────────────

def check_legal_status(lat: float, lng: float) -> dict:
    """
    Check if land is in a government acquisition area.
    Queries pre-loaded AcquisitionArea table.
    """
    from apps.scans.models import AcquisitionArea

    # Simple bounding box check — fast even without PostGIS
    acquisitions = AcquisitionArea.objects.filter(
        min_lat__lte=lat, max_lat__gte=lat,
        min_lng__lte=lng, max_lng__gte=lng,
    )

    if acquisitions.exists():
        area = acquisitions.first()
        return {
            'is_government': True,
            'under_acquisition': True,
            'authority': area.authority,
            'acquisition_type': area.acquisition_type,
            'area_name': area.area_name,
            'gazette_reference': area.gazette_reference,
            'note': area.notes or 'This land is within a government acquisition area. Proceed with caution.',
        }

    return {
        'is_government': False,
        'under_acquisition': False,
        'note': 'No government acquisition records found for this location. Independent legal verification is still recommended.',
    }


# ─── Flood Risk Check ─────────────────────────────────────────────────────────

def check_flood_risk(lat: float, lng: float, elevation: float | None = None) -> dict:
    """
    Check flood risk using pre-loaded flood zone data.
    Falls back to elevation-based heuristics.
    """
    from apps.scans.models import FloodRiskZone

    zones = FloodRiskZone.objects.filter(
        min_lat__lte=lat, max_lat__gte=lat,
        min_lng__lte=lng, max_lng__gte=lng,
    ).order_by('-risk_level')  # highest risk first

    if zones.exists():
        zone = zones.first()
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

    # Elevation-based fallback
    if elevation is not None:
        if elevation < 5:
            return {'risk_level': 'high', 'reason': 'Very low elevation (< 5m)', 'method': 'elevation'}
        elif elevation < 15:
            return {'risk_level': 'medium', 'reason': 'Low elevation (< 15m)', 'method': 'elevation'}
        else:
            return {'risk_level': 'low', 'reason': 'Adequate elevation', 'method': 'elevation'}

    return {'risk_level': 'unknown', 'reason': 'Insufficient data for flood assessment', 'method': 'none'}


# ─── Erosion Risk Check ───────────────────────────────────────────────────────

def check_erosion_risk(lat: float, lng: float, state: str = '') -> dict:
    """
    Erosion risk based on geographic region.
    Southeast Nigeria (Anambra, Enugu, Imo, Ebonyi, Abia) = high erosion risk.
    Coastal areas = coastal erosion risk.
    """
    HIGH_EROSION_STATES = {
        'Anambra', 'Enugu', 'Imo', 'Ebonyi', 'Abia',
        'Cross River', 'Akwa Ibom'
    }
    COASTAL_STATES = {
        'Lagos', 'Rivers', 'Delta', 'Bayelsa', 'Ondo', 'Edo'
    }

    state_clean = state.strip()

    if state_clean in HIGH_EROSION_STATES:
        return {
            'risk_level': 'high',
            'reason': f'{state_clean} is in the high-erosion belt of Southeast Nigeria.',
            'recommendation': 'Commission a soil survey before construction. Consider erosion-resistant foundation.',
        }

    if state_clean in COASTAL_STATES:
        return {
            'risk_level': 'medium',
            'reason': f'{state_clean} has coastal and riverine erosion exposure.',
            'recommendation': 'Check proximity to coastline and waterways. Consider flood and erosion insurance.',
        }

    return {
        'risk_level': 'low',
        'reason': 'No elevated erosion risk identified for this region.',
        'recommendation': 'Standard site inspection recommended.',
    }


# ─── Dam Proximity Check ──────────────────────────────────────────────────────

def check_dam_proximity(lat: float, lng: float) -> dict:
    """Find nearest dam and assess risk based on distance."""
    from apps.scans.models import Dam

    dams = Dam.objects.all()
    if not dams.exists():
        return {'risk_level': 'unknown', 'reason': 'Dam data not available'}

    nearest = None
    min_distance = float('inf')

    for dam in dams:
        dist = haversine_distance(lat, lng, float(dam.latitude), float(dam.longitude))
        if dist < min_distance:
            min_distance = dist
            nearest = dam

    distance_km = round(min_distance, 2)

    if distance_km < 5:
        risk_level = 'critical'
    elif distance_km < 20:
        risk_level = 'high'
    elif distance_km < 50:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    return {
        'nearest_dam': nearest.name if nearest else None,
        'distance_km': distance_km,
        'risk_level': risk_level,
        'river_basin': nearest.river_basin if nearest else '',
        'capacity_mcm': nearest.capacity_mcm if nearest else None,
        'height_m': nearest.height_m if nearest else None,
        'year_completed': nearest.year_completed if nearest else None,
        'purpose': nearest.purpose if nearest else '',
        'downstream_states': nearest.downstream_states if nearest else '',
        'notes': nearest.notes if nearest else '',
    }


# ─── Risk Score Calculator ────────────────────────────────────────────────────

RISK_WEIGHTS = {
    'legal': 40,       # Government acquisition = highest risk (40%)
    'flood': 30,       # Flood risk (30%)
    'erosion': 15,     # Erosion risk (15%)
    'dam': 15,         # Dam proximity (15%)
}

RISK_SCORE_MAP = {
    'very_low': 0,
    'low': 20,
    'medium': 50,
    'high': 80,
    'very_high': 100,
    'critical': 100,
    'unknown': 30,  # Default to medium-low when unknown
}


def calculate_risk_score(legal: dict, flood: dict, erosion: dict, dam: dict) -> int:
    """
    Calculate overall risk score (0-100).
    Higher score = higher risk.
    """
    # Legal is binary — if government land, add full weight
    legal_score = 100 if legal.get('is_government') else 0

    flood_score = RISK_SCORE_MAP.get(flood.get('risk_level', 'unknown'), 30)
    erosion_score = RISK_SCORE_MAP.get(erosion.get('risk_level', 'unknown'), 30)
    dam_score = RISK_SCORE_MAP.get(dam.get('risk_level', 'unknown'), 10)

    score = (
        legal_score * RISK_WEIGHTS['legal'] / 100 +
        flood_score * RISK_WEIGHTS['flood'] / 100 +
        erosion_score * RISK_WEIGHTS['erosion'] / 100 +
        dam_score * RISK_WEIGHTS['dam'] / 100
    )

    return min(100, max(0, round(score)))


def get_risk_level(score: int) -> str:
    if score < 25:
        return 'low'
    elif score < 50:
        return 'medium'
    elif score < 75:
        return 'high'
    else:
        return 'critical'


# ─── Main Entry Point ─────────────────────────────────────────────────────────

def run_land_scan(scan, full_report: bool = False) -> dict:
    """
    Run all checks for a LandScan instance and update it in-place.
    Synchronous — called directly in the view.

    full_report=True  → Pro users: runs full Groq AI time-projection report
    full_report=False → Basic users: risk data only, no AI projections
    """
    lat = float(scan.latitude)
    lng = float(scan.longitude)
    radius_km = float(scan.radius_km) if scan.radius_km else 1.0

    # 1. Geocode location
    location_info = get_location_info(lat, lng)
    if location_info:
        scan.address = location_info.get('address', scan.address)
        scan.state = location_info.get('state', scan.state)
        scan.lga = location_info.get('lga', scan.lga)
        scan.place_id = location_info.get('place_id', '')

    # 2. Get elevation
    elevation = get_elevation(lat, lng)
    if elevation is not None:
        scan.elevation_meters = elevation

    # 3. Legal status
    legal = check_legal_status(lat, lng)
    scan.is_government_land = legal.get('is_government', False)
    scan.is_under_acquisition = legal.get('under_acquisition', False)
    scan.acquisition_authority = legal.get('authority', '')
    scan.acquisition_type = legal.get('acquisition_type', '')
    scan.gazette_reference = legal.get('gazette_reference', '')
    scan.legal_notes = legal.get('note', '')

    # 4. Flood risk
    flood = check_flood_risk(lat, lng, elevation)
    scan.flood_risk_level = flood.get('risk_level', 'unknown')
    scan.flood_zone_name = flood.get('zone_name', '')
    scan.flood_type = flood.get('flood_type', '')
    scan.flood_peak_months = flood.get('peak_months', '')
    scan.flood_last_major_year = flood.get('last_major_flood_year')
    scan.flood_notes = flood.get('notes', '')
    scan.flood_data_source = flood.get('data_source', '')

    # 5. Erosion risk
    erosion = check_erosion_risk(lat, lng, scan.state)
    scan.erosion_risk_level = erosion.get('risk_level', 'unknown')

    # 6. Dam proximity
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

    # 7. Overall score
    scan.risk_score = calculate_risk_score(legal, flood, erosion, dam)
    scan.risk_level = get_risk_level(scan.risk_score)
    scan.status = 'completed'
    scan.save()

    # 8. Generate AI time-projection report (Pro users only)
    from django.utils import timezone

    if not full_report:
        # Basic scan — skip Groq, mark complete without AI report
        scan.report_generated    = True
        scan.report_generated_at = timezone.now()
        scan.save(update_fields=['report_generated', 'report_generated_at'])
        return {
            'legal': legal, 'flood': flood,
            'erosion': erosion, 'dam': dam, 'elevation': elevation,
            'ai_report_status': 'skipped_basic_plan',
        }

    from apps.scans.ai_report import generate_ai_report

    scan_data = {
        'latitude': lat,
        'longitude': lng,
        'radius_km': radius_km,
        'address': scan.address,
        'state': scan.state,
        'lga': scan.lga,
        'elevation_meters': scan.elevation_meters,
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
    }

    ai_result = generate_ai_report(scan_data)

    scan.ai_report = ai_result.get('report', '')
    scan.ai_report_model = ai_result.get('model', '')
    scan.ai_report_tokens = ai_result.get('tokens_used', {}).get('total')
    scan.report_generated = True
    scan.report_generated_at = timezone.now()
    scan.save()

    return {
        'legal': legal,
        'flood': flood,
        'erosion': erosion,
        'dam': dam,
        'elevation': elevation,
        'ai_report_status': ai_result.get('status'),
    }


# ─── Forward Geocoding (address → coordinates) ────────────────────────────────

def forward_geocode(query: str, limit: int = 6) -> list[dict]:
    """
    Forward-geocode an address using Nominatim, restricted to Nigeria.
    Returns up to `limit` matches: [{label, latitude, longitude, type, state, lga}]
    """
    try:
        time.sleep(0.5)
        response = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={
                'q': query,
                'format': 'json',
                'addressdetails': 1,
                'limit': max(1, min(limit, 10)),
                'countrycodes': 'ng',
            },
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )
        if response.status_code != 200:
            return []
        out = []
        for item in response.json():
            try:
                lat = float(item['lat']); lng = float(item['lon'])
            except (KeyError, TypeError, ValueError):
                continue
            if not (4.0 <= lat <= 14.0 and 2.5 <= lng <= 15.0):
                continue
            addr = item.get('address', {})
            state = (addr.get('state') or '').replace(' State', '').strip()
            lga = addr.get('county') or addr.get('city') or addr.get('town') or addr.get('village') or addr.get('city_district') or ''
            out.append({
                'label': item.get('display_name', f"{lat}, {lng}"),
                'latitude': lat,
                'longitude': lng,
                'type': item.get('type', ''),
                'state': state,
                'lga': lga,
                'place_id': item.get('place_id'),
            })
        return out
    except Exception as e:
        logger.error(f"Nominatim forward geocode error: {e}")
        return []
