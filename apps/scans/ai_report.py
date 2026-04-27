"""Groq-backed AI reporting for Landrify scan results."""

from __future__ import annotations

import logging

from django.conf import settings
from groq import Groq

logger = logging.getLogger(__name__)

GROQ_MODEL = 'llama-3.3-70b-versatile'
GROQ_MAX_TOKENS = 4000
SYSTEM_PROMPT = (
    'You are a senior environmental risk analyst and land investment advisor '
    'specialising in Nigerian real estate and climate science. You write '
    'professional land risk reports used by lawyers, estate agents, '
    'investors, and individual buyers to make high-stakes purchase decisions. '
    'Your reports are authoritative, specific, data-driven, and written in '
    'clear English accessible to non-technical readers. You never use vague '
    'language. Every risk assessment must cite the specific data provided to '
    'you. Every projection must reference the actual weather figures and '
    'climate model data provided.'
)


def _display_value(value, default: str = 'Not available') -> str:
    """Format a scalar value for prompt insertion."""
    if value in (None, ''):
        return default
    return str(value)


def _format_bool(value) -> str:
    """Render booleans consistently for the prompt."""
    return 'Yes' if bool(value) else 'No'


def build_analysis_prompt(scan_data: dict) -> str:
    """Build the user prompt supplied to Groq."""
    current = scan_data.get('weather_current') or {}
    historical = scan_data.get('weather_historical') or {}
    projection = scan_data.get('weather_projection') or {}

    projection_2030 = projection.get('projection_2030') or {}
    projection_2035 = projection.get('projection_2035') or {}
    projection_2040 = projection.get('projection_2040') or {}
    projection_2050 = projection.get('projection_2050') or {}

    address = scan_data.get('address') or scan_data.get('address_hint') or 'Unknown location'
    address_hint = scan_data.get('address_hint') or 'None provided'

    return f"""
LAND SCAN REPORT REQUEST

Location: {address}
Plot description / address hint: {address_hint}
State: {_display_value(scan_data.get('state'))}, LGA: {_display_value(scan_data.get('lga'))}
Coordinates: {_display_value(scan_data.get('latitude'))}, {_display_value(scan_data.get('longitude'))}
Scan radius: {_display_value(scan_data.get('radius_km'))}km
Elevation: {_display_value(scan_data.get('elevation_meters'))}m above sea level

RISK SCORES
Overall risk score: {_display_value(scan_data.get('risk_score'))}/100 ({_display_value(scan_data.get('risk_level'))})
Flood risk: {_display_value(scan_data.get('flood_risk_level'))} — Zone: {_display_value(scan_data.get('flood_zone_name'))}
Erosion risk: {_display_value(scan_data.get('erosion_risk_level'))}
Dam proximity: {_display_value(scan_data.get('nearest_dam_name'))} is {_display_value(scan_data.get('nearest_dam_distance_km'))}km away (risk: {_display_value(scan_data.get('dam_risk_level'))})

LEGAL STATUS
Government acquisition: {_format_bool(scan_data.get('is_government_land'))}
Under active acquisition: {_format_bool(scan_data.get('is_under_acquisition'))}
Authority: {_display_value(scan_data.get('acquisition_authority'))}
Gazette reference: {_display_value(scan_data.get('gazette_reference'))}
Legal notes: {_display_value(scan_data.get('legal_notes'))}

CURRENT WEATHER CONDITIONS
Temperature: {_display_value(current.get('temperature_c'))}°C
Humidity: {_display_value(current.get('humidity_percent'))}%
Today's precipitation: {_display_value(current.get('precipitation_mm'))}mm
Wind speed: {_display_value(current.get('wind_speed_kmh'))} km/h
Conditions: {_display_value(current.get('description'))}

HISTORICAL WEATHER (past 10 years)
Average annual rainfall: {_display_value(historical.get('avg_annual_rainfall_mm'))}mm/year
Rainfall trend: {_display_value(historical.get('rainfall_trend'))} (comparing first 5 years to last 5 years)
Wettest year on record: {_display_value(historical.get('wettest_year'))} with {_display_value(historical.get('wettest_year_rainfall_mm'))}mm
Driest year on record: {_display_value(historical.get('driest_year'))} with {_display_value(historical.get('driest_year_rainfall_mm'))}mm
Average maximum temperature: {_display_value(historical.get('avg_max_temp_c'))}°C
Temperature trend: {_display_value(historical.get('temp_trend'))}
Extreme rain days (>50mm) per year: {_display_value(historical.get('extreme_rain_days_per_year'))}

CLIMATE PROJECTIONS (MRI_AGCM3_2_S CMIP6 model)
2030: {_display_value(projection_2030.get('avg_annual_rainfall_mm'))}mm/year avg rainfall, {_display_value(projection_2030.get('avg_max_temp_c'))}°C avg max temp
2035: {_display_value(projection_2035.get('avg_annual_rainfall_mm'))}mm/year avg rainfall, {_display_value(projection_2035.get('avg_max_temp_c'))}°C avg max temp
2040: {_display_value(projection_2040.get('avg_annual_rainfall_mm'))}mm/year avg rainfall, {_display_value(projection_2040.get('avg_max_temp_c'))}°C avg max temp
2050: {_display_value(projection_2050.get('avg_annual_rainfall_mm'))}mm/year avg rainfall, {_display_value(projection_2050.get('avg_max_temp_c'))}°C avg max temp
Projected rainfall change by 2050: {_display_value(projection.get('rainfall_change_2025_to_2050_percent'))}%
Projected temperature rise by 2050: +{_display_value(projection.get('temp_change_2025_to_2050_c'), default='0')}°C
Flood risk trajectory: {_display_value(projection.get('flood_risk_trajectory'))}

Generate a comprehensive land risk report with the following sections:

## Executive Summary
2-3 sentences. Current overall risk. Suitable or not suitable for purchase without conditions.

## Current Environmental Conditions
Analyse the current flood, erosion, and dam risk using the specific data above. Explain what each risk level means practically for this location. Reference the flood zone name if present.

## Historical Weather Analysis
Analyse the 10-year rainfall and temperature data. Is this area getting wetter or hotter? What does the {_display_value(historical.get('rainfall_trend'))} trend mean for flood risk? Reference the actual mm figures.

## 5-Year Projection (2030)
Based on the CMIP6 climate model projection for 2030, what conditions should a buyer expect? Reference the projected rainfall and temperature figures. What infrastructure or insurance considerations apply?

## 10-Year Projection (2035)
Same structure. Reference 2035 figures specifically.

## 15-Year Projection (2040)
Same structure. Reference 2040 figures specifically.

## 25-Year Projection (2050)
Long-term outlook. Reference the 2050 projected rainfall change ({_display_value(projection.get('rainfall_change_2025_to_2050_percent'))}%) and temperature change (+{_display_value(projection.get('temp_change_2025_to_2050_c'), default='0')}°C). What is the long-term investment viability given the {_display_value(projection.get('flood_risk_trajectory'))} trajectory?

## Legal Risk Assessment
Analyse the legal status. If government acquisition is found, explain the risk clearly. If clear, confirm what independent verification is still recommended (C of O, survey plan, gazette search).

## Recommendations
5-7 specific, actionable recommendations for this exact plot. Reference the actual risks identified. Number each recommendation.

## Risk Mitigation
Practical steps the buyer or developer can take to reduce the identified risks — insurance, foundation design, drainage, legal verification, survey.

## Disclaimer
This report is generated from environmental data and AI analysis. It does not constitute legal or engineering advice. Independent professional verification is strongly recommended before any land transaction.
""".strip()


def generate_ai_report(scan_data: dict) -> dict:
    """Generate the Landrify AI report or a structured fallback when unavailable."""
    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not set; using placeholder report.")
        fallback = _placeholder_report(scan_data)
        fallback['status'] = 'missing_api_key'
        return fallback

    try:
        client = Groq(api_key=api_key)
    except Exception as exc:
        logger.error("Failed to initialise Groq client: %s", exc)
        fallback = _placeholder_report(scan_data)
        fallback['status'] = 'client_init_failed'
        return fallback

    prompt = build_analysis_prompt(scan_data)

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': prompt},
            ],
            temperature=0.2,
            max_tokens=GROQ_MAX_TOKENS,
            top_p=0.9,
        )
        report_text = (response.choices[0].message.content or '').strip()
        usage = response.usage
        return {
            'status': 'success',
            'report': report_text,
            'model': GROQ_MODEL,
            'tokens_used': {
                'prompt': getattr(usage, 'prompt_tokens', None),
                'completion': getattr(usage, 'completion_tokens', None),
                'total': getattr(usage, 'total_tokens', None),
            },
        }
    except Exception as exc:
        logger.error("Groq AI report generation failed: %s", exc)
        fallback = _placeholder_report(scan_data)
        fallback['status'] = 'error'
        return fallback


def _placeholder_report(scan_data: dict) -> dict:
    """Return a deterministic fallback report when Groq is unavailable."""
    address = scan_data.get('address') or scan_data.get('address_hint') or 'the selected plot'
    state = _display_value(scan_data.get('state'))
    lga = _display_value(scan_data.get('lga'))
    risk_level = _display_value(scan_data.get('risk_level'))
    risk_score = _display_value(scan_data.get('risk_score'))
    flood_level = _display_value(scan_data.get('flood_risk_level'))
    erosion_level = _display_value(scan_data.get('erosion_risk_level'))
    dam_name = _display_value(scan_data.get('nearest_dam_name'))
    dam_distance = _display_value(scan_data.get('nearest_dam_distance_km'))
    legal_notes = _display_value(scan_data.get('legal_notes'))

    current = scan_data.get('weather_current') or {}
    historical = scan_data.get('weather_historical') or {}
    projection = scan_data.get('weather_projection') or {}
    projection_2030 = projection.get('projection_2030') or {}
    projection_2035 = projection.get('projection_2035') or {}
    projection_2040 = projection.get('projection_2040') or {}
    projection_2050 = projection.get('projection_2050') or {}

    report = f"""## Executive Summary
The scan for {address} in {lga}, {state} produced an overall risk score of {risk_score}/100, classified as {risk_level}. This plot should not be treated as purchase-ready until the environmental and legal items below are independently checked.

## Current Environmental Conditions
Flood exposure is currently rated {flood_level}, erosion exposure is rated {erosion_level}, and the nearest tracked dam is {dam_name} at approximately {dam_distance}km. These values indicate the site should be reviewed with local drainage, soil, and watershed conditions in mind before development begins.

## Historical Weather Analysis
Over the past 10 years, the site has averaged {_display_value(historical.get('avg_annual_rainfall_mm'))}mm of rainfall per year with a {_display_value(historical.get('rainfall_trend'))} rainfall trend. Average maximum temperature is {_display_value(historical.get('avg_max_temp_c'))}°C with a {_display_value(historical.get('temp_trend'))} temperature trend, which should be considered in drainage sizing and long-term land-use planning.

## 5-Year Projection (2030)
The MRI_AGCM3_2_S model projects {_display_value(projection_2030.get('avg_annual_rainfall_mm'))}mm/year of rainfall and an average maximum temperature of {_display_value(projection_2030.get('avg_max_temp_c'))}°C by 2030. Buyers should factor these projections into early drainage, grading, and insurance decisions.

## 10-Year Projection (2035)
By 2035, projected rainfall is {_display_value(projection_2035.get('avg_annual_rainfall_mm'))}mm/year and projected average maximum temperature is {_display_value(projection_2035.get('avg_max_temp_c'))}°C. Medium-term planning should account for heat load, runoff control, and maintenance budgets.

## 15-Year Projection (2040)
The 2040 outlook indicates {_display_value(projection_2040.get('avg_annual_rainfall_mm'))}mm/year rainfall and {_display_value(projection_2040.get('avg_max_temp_c'))}°C average maximum temperature. Long-life assets on the plot should therefore be designed with resilient drainage and robust foundation detailing.

## 25-Year Projection (2050)
The 2050 climate outlook shows {_display_value(projection_2050.get('avg_annual_rainfall_mm'))}mm/year rainfall and {_display_value(projection_2050.get('avg_max_temp_c'))}°C average maximum temperature, with projected rainfall change of {_display_value(projection.get('rainfall_change_2025_to_2050_percent'))}% and temperature change of +{_display_value(projection.get('temp_change_2025_to_2050_c'), default='0')}°C. The projected flood trajectory is {_display_value(projection.get('flood_risk_trajectory'))}, which should influence the long-term investment case.

## Legal Risk Assessment
Government acquisition indicators currently read {_format_bool(scan_data.get('is_government_land'))}, and the scan notes are: {legal_notes}. Independent checks should still include title verification, survey plan validation, and gazette review before any payment is made.

## Recommendations
1. Confirm title documents with a qualified Nigerian property lawyer.
2. Validate the survey plan and physical beacons on site.
3. Review local drainage, runoff paths, and fill levels before construction.
4. Compare the site elevation and flood rating with nearby parcels.
5. Budget for insurance and resilient foundation design where flood exposure is material.

## Risk Mitigation
Use engineered drainage, site grading, and foundation design suited to the reported flood and erosion profile. Pair environmental mitigation with legal verification, including C of O checks, survey confirmation, and any relevant gazette search.

## Disclaimer
This report is generated from environmental data and AI analysis. It does not constitute legal or engineering advice. Independent professional verification is strongly recommended before any land transaction."""

    return {
        'report': report,
        'model': 'placeholder',
        'tokens_used': {'prompt': 0, 'completion': 0, 'total': 0},
    }
