"""
Landrify AI Analysis Engine
─────────────────────────────
Powered by Groq (llama-3.3-70b-versatile).

Takes all gathered land data — flood zones, elevation, erosion belt,
dam proximity, legal status, satellite context, location — and generates
a comprehensive TIME-BASED REPORT projecting how the land will be affected
over 5, 10, 15, 20, 30, 40, and 50 years.

This is the core product differentiator.
"""
import logging
from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)


def build_analysis_prompt(scan_data: dict) -> str:
    """
    Build the full prompt sent to the LLM.
    scan_data contains everything gathered about the land parcel.
    """
    lat        = scan_data.get('latitude')
    lng        = scan_data.get('longitude')
    address    = scan_data.get('address') or f"coordinates ({lat}, {lng})"
    state      = scan_data.get('state', 'Nigeria')
    lga        = scan_data.get('lga', '')
    radius_m   = scan_data.get('radius_meters', 500)
    elevation  = scan_data.get('elevation_meters')
    risk_score = scan_data.get('risk_score', 0)
    risk_level = scan_data.get('risk_level', 'unknown')

    # Legal
    is_govt        = scan_data.get('is_government_land', False)
    under_acq      = scan_data.get('is_under_acquisition', False)
    acq_authority  = scan_data.get('acquisition_authority', '')
    legal_notes    = scan_data.get('legal_notes', '')

    # Environmental
    flood_level    = scan_data.get('flood_risk_level', 'unknown')
    flood_zone     = scan_data.get('flood_zone_name', '')
    flood_source   = scan_data.get('flood_data_source', '')
    erosion_level  = scan_data.get('erosion_risk_level', 'unknown')
    dam_name       = scan_data.get('nearest_dam_name', '')
    dam_dist       = scan_data.get('nearest_dam_distance_km', 'unknown')
    dam_risk       = scan_data.get('dam_risk_level', 'unknown')

    location_ctx = f"{address}, {lga}, {state}" if lga else f"{address}, {state}"
    elevation_ctx = f"{elevation}m above sea level" if elevation else "elevation data unavailable"
    govt_ctx = (
        f"⚠️ GOVERNMENT LAND — Under acquisition by {acq_authority}. {legal_notes}"
        if is_govt else "No government acquisition records found for this area."
    )
    flood_ctx = (
        f"{flood_level.upper()} flood risk"
        + (f" — zone: {flood_zone}" if flood_zone else "")
        + (f" (source: {flood_source})" if flood_source else "")
    )
    dam_ctx = (
        f"Nearest dam: {dam_name} at {dam_dist}km — {dam_risk} dam risk"
        if dam_name else "No significant dams within analysis range."
    )

    return f"""You are Landrify's AI land analyst. You specialise in Nigerian real estate risk assessment combining environmental science, climate projections, and urban planning.

A user has scanned a land parcel using our platform. Based on ALL the data gathered below, produce a comprehensive TIME-BASED RISK REPORT.

═══════════════════════════════════════════════════════
LAND DATA GATHERED
═══════════════════════════════════════════════════════

Location:         {location_ctx}
Coordinates:      {lat}°N, {lng}°E
Scan radius:      {radius_m} metres
Elevation:        {elevation_ctx}
Overall risk:     {risk_level.upper()} (score: {risk_score}/100)

LEGAL STATUS:
{govt_ctx}

ENVIRONMENTAL RISKS:
• Flood risk:    {flood_ctx}
• Erosion risk:  {erosion_level.upper()} — {'Southeast Nigeria high-erosion belt' if erosion_level == 'high' else 'Standard regional erosion exposure'}
• Dam/reservoir: {dam_ctx}

═══════════════════════════════════════════════════════
REPORT REQUIREMENTS
═══════════════════════════════════════════════════════

Generate a structured, detailed land risk report with the following EXACT sections:

---

## EXECUTIVE SUMMARY
A plain-language 3–4 sentence summary of the land's current risk profile and whether the user should consider purchasing it.

## CURRENT CONDITIONS (2025)
Detailed assessment of the land RIGHT NOW — flood exposure, soil stability, legal standing, infrastructure context, and any immediate concerns.

## TIME-BASED RISK PROJECTIONS

### 5-Year Outlook (2030)
Concrete analysis of how this specific land parcel will change in 5 years. Consider: climate trends for this Nigerian region, urban expansion pressures, sea level/river dynamics, infrastructure projects, government policy direction. Be specific to this location.

### 10-Year Outlook (2035)
How risks evolve at the 10-year mark. What environmental or legal changes are likely?

### 15-Year Outlook (2040)
Mid-term assessment. Key inflection points or risk escalations by 2040.

### 20-Year Outlook (2045)
Long-term structural risks. How will climate change manifest at this specific Nigerian location by 2045?

### 30-Year Outlook (2055)
Major climate shift projections. What does published research say about flooding, erosion, and habitability for this region by 2055?

### 40-Year Outlook (2065)
Deep-future risk. By 2065, how does this land compare to current standards? Would a building constructed today still be safe?

### 50-Year Outlook (2075)
Worst-case and best-case scenario for this parcel in 50 years. What would make it significantly safer or more dangerous?

## INVESTMENT ASSESSMENT
Should someone buy this land today? Rate it as: STRONG BUY / BUY WITH CAUTION / HOLD / AVOID / STRONG AVOID. Give specific reasoning tied to the time projections above.

## CRITICAL WARNINGS
Bullet list of the most important risks the user MUST act on before purchasing. Be direct and specific.

## MITIGATION RECOMMENDATIONS
Concrete, actionable steps that would reduce identified risks — engineering solutions, legal due diligence, insurance, monitoring.

## DATA SOURCES USED
List the types of data that informed this analysis.

---

IMPORTANT GUIDELINES:
- Be specific to Nigeria and this exact location — not generic global advice
- Cite real Nigerian context: NIHSA, NIMET, climate research, Lagos/Abuja policy, Niger Delta dynamics where relevant
- Use concrete language ("flooding will worsen" not "flooding may increase")
- The time projections must get progressively more detailed about long-term climate impact
- If the land is low risk, say so clearly — don't exaggerate
- If the land is in a critical zone, be frank — this is about protecting people's life savings
- Keep the tone professional but accessible — most users are not technical

Generate the full report now."""


def generate_llm_report(scan_data: dict) -> dict:
    """
    Call Groq API to generate the full time-based land analysis report.

    Returns a dict with:
        success: bool
        report_text: str  (the full markdown report)
        model: str
        tokens_used: int
        error: str (if failed)
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not set — returning fallback report.")
        return {
            'success': False,
            'error': 'AI analysis unavailable — GROQ_API_KEY not configured.',
            'report_text': _fallback_report(scan_data),
            'model': 'fallback',
            'tokens_used': 0,
        }

    client = Groq(api_key=api_key)
    prompt = build_analysis_prompt(scan_data)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Landrify's AI land analyst specialising in Nigerian real estate "
                        "risk assessment. You produce detailed, time-based risk reports combining "
                        "environmental science, climate projections, and Nigerian urban planning context. "
                        "Always be specific to the Nigerian context provided. Never give generic advice."
                    )
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            temperature=0.3,       # Low temp = consistent, factual analysis
            max_tokens=4000,       # Long report
            top_p=0.9,
        )

        report_text  = response.choices[0].message.content
        tokens_used  = response.usage.total_tokens if response.usage else 0
        model_used   = response.model

        logger.info(f"Groq report generated: {tokens_used} tokens, model={model_used}")

        return {
            'success': True,
            'report_text': report_text,
            'model': model_used,
            'tokens_used': tokens_used,
            'error': None,
        }

    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return {
            'success': False,
            'error': str(e),
            'report_text': _fallback_report(scan_data),
            'model': 'fallback',
            'tokens_used': 0,
        }


def _fallback_report(scan_data: dict) -> str:
    """
    Rule-based fallback report when Groq is unavailable.
    Ensures the endpoint always returns something useful.
    """
    risk_level = scan_data.get('risk_level', 'unknown').upper()
    state      = scan_data.get('state', 'this area')
    flood      = scan_data.get('flood_risk_level', 'unknown')
    erosion    = scan_data.get('erosion_risk_level', 'unknown')
    is_govt    = scan_data.get('is_government_land', False)
    score      = scan_data.get('risk_score', 0)

    warning = ""
    if is_govt:
        warning = "\n\n⚠️ **CRITICAL: This land is in a government acquisition area. Do not purchase without legal clearance.**\n"

    return f"""## EXECUTIVE SUMMARY
{warning}
This land parcel has an overall risk rating of **{risk_level}** (score: {score}/100).
Flood risk is **{flood}**, erosion risk is **{erosion}** for the {state} region.
AI-powered time analysis is temporarily unavailable. Please configure your GROQ_API_KEY for full projections.

## CURRENT CONDITIONS (2025)
- **Flood Risk:** {flood.upper()}
- **Erosion Risk:** {erosion.upper()}
- **Legal Status:** {'Government acquisition detected — high legal risk' if is_govt else 'No acquisition records found'}
- **Overall Score:** {score}/100

## TIME-BASED RISK PROJECTIONS
Full AI-powered 5–50 year projections require a valid GROQ_API_KEY.
Set GROQ_API_KEY in your environment variables and re-run the scan.

## INVESTMENT ASSESSMENT
Based on available data: {'**AVOID** — Government land detected.' if is_govt else f'Risk score {score}/100 — verify independently before purchase.'}

## DISCLAIMER
This report is advisory only. Consult a licensed surveyor, lawyer, and engineer before purchasing land.
"""
