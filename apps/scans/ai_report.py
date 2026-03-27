"""
Landrify AI Analysis Engine
----------------------------
Uses Groq (llama-3.3-70b) to analyse all collected land data and generate
a time-based projection report covering how the land will be affected
over 5, 10, 15, 20, 30, 40, and 50 years.

This is the core differentiator of Landrify.
"""
import logging
from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)


def build_analysis_prompt(scan_data: dict) -> str:
    """
    Build a detailed prompt from all scan data.
    The richer the data we feed in, the better the LLM report.
    """

    # ── Location context ─────────────────────────────────────────────
    location_block = f"""
LOCATION DETAILS:
- Address: {scan_data.get('address') or 'Not available'}
- State: {scan_data.get('state') or 'Unknown'}
- LGA: {scan_data.get('lga') or 'Unknown'}
- Coordinates: {scan_data.get('latitude')}, {scan_data.get('longitude')}
- Scan radius: {scan_data.get('radius_km', 1)} km
- GPS Accuracy: {scan_data.get('accuracy_meters', 'Unknown')} meters
- Elevation: {scan_data.get('elevation_meters', 'Unknown')} meters above sea level
"""

    # ── Legal status ─────────────────────────────────────────────────
    is_govt = scan_data.get('is_government_land') or scan_data.get('is_under_acquisition')
    legal_block = f"""
LEGAL & OWNERSHIP STATUS:
- Government/Acquisition Area: {'YES - CRITICAL' if is_govt else 'No government acquisition detected'}
- Acquiring Authority: {scan_data.get('acquisition_authority') or 'N/A'}
- Acquisition Type: {scan_data.get('acquisition_type') or 'N/A'}
- Gazette Reference: {scan_data.get('gazette_reference') or 'N/A'}
- Legal Notes: {scan_data.get('legal_notes') or 'N/A'}
"""

    # ── Environmental risks ──────────────────────────────────────────
    env_block = f"""
ENVIRONMENTAL RISK DATA:
Flood Risk:
  - Current Risk Level: {scan_data.get('flood_risk_level') or 'Unknown'}
  - Flood Zone Name: {scan_data.get('flood_zone_name') or 'No named flood zone'}
  - Data Source: {scan_data.get('flood_data_source') or 'N/A'}

Erosion Risk:
  - Current Risk Level: {scan_data.get('erosion_risk_level') or 'Unknown'}
  - State Context: {scan_data.get('state')} — {"HIGH EROSION BELT (Southeast Nigeria)" if scan_data.get('state') in ['Anambra','Enugu','Imo','Ebonyi','Abia','Cross River','Akwa Ibom'] else "Standard erosion exposure"}

Dam & Water Infrastructure:
  - Nearest Dam: {scan_data.get('nearest_dam_name') or 'None identified'}
  - Distance to Nearest Dam: {scan_data.get('nearest_dam_distance_km') or 'Unknown'} km
  - Dam Risk Level: {scan_data.get('dam_risk_level') or 'Unknown'}

Overall Risk Score: {scan_data.get('risk_score') or 'N/A'} / 100
Overall Risk Level: {scan_data.get('risk_level') or 'Unknown'}
"""

    # ── Satellite imagery description ────────────────────────────────
    imagery_block = f"""
SATELLITE IMAGERY ANALYSIS:
- Imagery captured for {scan_data.get('radius_km', 1)}km radius around coordinates
- Area Type: {_infer_area_type(scan_data)}
- Terrain: {_infer_terrain(scan_data)}
"""

    # ── Climate context for Nigeria ──────────────────────────────────
    climate_block = """
NIGERIA CLIMATE CONTEXT (for projection modelling):
- Nigeria experiences two seasons: rainy (April-October) and dry (November-March)
- Sea level rise projections for West Africa: 0.3-0.6m by 2050, 0.5-1.0m by 2100
- Rainfall intensity increasing 10-20% due to climate change
- Niger Delta subsidence: 25mm/year in some areas
- Urbanisation increasing impervious surface area, worsening flood runoff
- NIHSA projects 40% increase in flood-affected communities by 2035
"""

    # ── Full prompt ──────────────────────────────────────────────────
    prompt = f"""You are Landrify AI, an expert land risk analyst specialising in Nigerian real estate, 
environmental science, climate change projections, and urban planning. 

You have been given comprehensive scan data for a piece of land in Nigeria. 
Your task is to generate a detailed TIME-BASED PROJECTION REPORT that tells the user 
exactly how this land will be affected over the coming decades.

{location_block}
{legal_block}
{env_block}
{imagery_block}
{climate_block}

Generate a STRUCTURED TIME-BASED PROJECTION REPORT with the following format:

## EXECUTIVE SUMMARY
A 3-4 sentence overview of this land's risk profile and overall verdict.

## CURRENT STATE (2025)
Describe the current condition of the land based on all data provided.

## 5-YEAR PROJECTION (2030)
What risks will intensify or emerge by 2030? Be specific about flood patterns, infrastructure development, legal changes, and climate shifts expected in this timeframe.

## 10-YEAR PROJECTION (2035)
How will climate change, urbanisation, and government policy affect this land by 2035? Include sea level impact if coastal, or upstream dam capacity if near rivers.

## 15-YEAR PROJECTION (2040)
Describe medium-term structural changes. Will this area be more or less developable? How will Nigeria's population growth affect land value and risk?

## 20-YEAR PROJECTION (2045)
Long-term climate modelling for this location. Include IPCC projections relevant to Nigeria.

## 30-YEAR PROJECTION (2055)
Significant climate and demographic shifts. What will the risk landscape look like?

## 40-YEAR PROJECTION (2065)
Consider infrastructure decay, political land use changes, and major climate scenarios.

## 50-YEAR PROJECTION (2075)
Long-term outlook under both optimistic and pessimistic climate scenarios.

## INVESTMENT VERDICT
A clear recommendation: BUY / BUY WITH CAUTION / AVOID — with specific conditions.

## RISK MITIGATION RECOMMENDATIONS
5-7 specific, actionable recommendations for a buyer if they proceed.

## DATA DISCLAIMER
Brief note about data sources and limitations.

Be specific, data-driven, and grounded in Nigerian context. Use actual place names, 
Nigerian institutions (NIHSA, NESREA, LASURA, FCDA), and real climate projections.
Do NOT use generic filler. Every projection must be tied to the actual data provided above.
"""
    return prompt


def _infer_area_type(scan_data: dict) -> str:
    state = scan_data.get('state', '').lower()
    lga = scan_data.get('lga', '').lower()
    if 'island' in lga or 'vi' in lga or 'ikoyi' in lga:
        return 'High-density urban commercial/residential'
    if 'ibeju' in lga or 'epe' in lga or 'ikorodu' in lga:
        return 'Peri-urban / developing suburban'
    if state in ['rivers', 'bayelsa', 'delta']:
        return 'Niger Delta waterfront'
    if state in ['anambra', 'enugu', 'imo']:
        return 'Southeast Nigeria inland'
    if 'abuja' in state.lower() or 'fct' in state.lower():
        return 'FCT planned urban district'
    return 'Nigerian urban/suburban'


def _infer_terrain(scan_data: dict) -> str:
    elevation = scan_data.get('elevation_meters')
    if elevation is None:
        return 'Terrain data unavailable'
    elev = float(elevation)
    if elev < 5:
        return f'Very low-lying ({elev}m) — high coastal/flood exposure'
    if elev < 15:
        return f'Low elevation ({elev}m) — moderate flood exposure'
    if elev < 50:
        return f'Moderate elevation ({elev}m) — manageable flood risk'
    return f'Elevated terrain ({elev}m) — lower flood risk'


def generate_ai_report(scan_data: dict) -> dict:
    """
    Call Groq to generate the time-based projection report.
    Returns a dict with the full report and metadata.

    Uses llama-3.3-70b-versatile — fast, highly capable, free tier generous.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not set — returning placeholder report.")
        return _placeholder_report(scan_data)

    client = Groq(api_key=api_key)
    prompt = build_analysis_prompt(scan_data)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Landrify AI — Nigeria's most advanced land risk analysis engine. "
                        "You provide precise, data-driven, time-projected land risk reports. "
                        "You write with the authority of a senior environmental consultant, "
                        "urban planner, and climate scientist combined. "
                        "Always ground your analysis in Nigerian-specific data, institutions, and context."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4,      # Balanced: factual but readable
            max_tokens=4096,
            top_p=0.9,
        )

        report_text = response.choices[0].message.content
        usage = response.usage

        return {
            'status': 'success',
            'report': report_text,
            'model': response.model,
            'tokens_used': {
                'prompt': usage.prompt_tokens,
                'completion': usage.completion_tokens,
                'total': usage.total_tokens,
            },
            'ai_powered': True,
        }

    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return {
            'status': 'error',
            'report': _placeholder_report(scan_data)['report'],
            'error': str(e),
            'ai_powered': False,
        }


def _placeholder_report(scan_data: dict) -> dict:
    """
    Fallback report when Groq API key is not set.
    Shows the structure — useful for testing without an API key.
    """
    state = scan_data.get('state', 'the selected area')
    risk = scan_data.get('risk_level', 'unknown')
    score = scan_data.get('risk_score', 'N/A')
    flood = scan_data.get('flood_risk_level', 'unknown')

    report = f"""## EXECUTIVE SUMMARY
This land in {state} has an overall risk score of {score}/100 ({risk} risk level). 
Current flood risk is {flood}. AI analysis requires a Groq API key — set GROQ_API_KEY in your environment to enable full time-projection reports.

## CURRENT STATE (2025)
[Groq API key required for full analysis]

## 5-YEAR PROJECTION (2030)
[Set GROQ_API_KEY to unlock AI-powered projections]

## 10-YEAR PROJECTION (2035) through 50-YEAR PROJECTION (2075)
[Full time-based projections available with Groq API key]

## INVESTMENT VERDICT
ANALYSIS PENDING — Configure GROQ_API_KEY to get a full AI-powered verdict.

## DATA DISCLAIMER
Get your free Groq API key at console.groq.com to enable the full Landrify AI report.
"""
    return {
        'status': 'placeholder',
        'report': report,
        'ai_powered': False,
        'message': 'Set GROQ_API_KEY in .env to enable full AI reports. Free at console.groq.com'
    }
