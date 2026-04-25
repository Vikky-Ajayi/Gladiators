"""
Landrify AI Analysis Engine
----------------------------
Uses Groq (llama-3.3-70b-versatile) to turn every signal we have collected
about a parcel — flood zones, dam capacity, elevation, legal status, regional
context — into a long-form, time-projected risk report (now ~12 sections).

This is the core differentiator of Landrify.
"""
import logging
from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)


# ── Regional context table ────────────────────────────────────────────────────
# Carefully curated per-state qualitative context that the LLM uses to ground
# projections. Sourced from NIHSA AFOs, NEMA bulletins, NEWMAP reports,
# CBN inflation series, World Bank Nigeria Economic Updates and Lagos / FCT
# master plans. Keep concise — the model does the writing.

NIGERIA_REGIONS = {
    # South West
    'Lagos':     'Coastal megacity, sea-level rise + sand mining + tidal flooding; land prices grow ~12-18%/yr in priced corridors (Lekki, VI, Ikoyi). LASURA Building Control Agency active.',
    'Ogun':      'Lagos overflow corridor; Ogun River basin floods; rapid industrial estates (Sagamu, Agbara). Oyan Dam releases compound flood risk.',
    'Oyo':       'Inland Yoruba heartland; Asejire/Eleyele dams; gully erosion belt around Ibadan; relatively stable land tenure.',
    'Osun':      'Inland; Osun River basin; mining-related land contests in Ilesa/Ife axis.',
    'Ondo':      'Mixed coastal-inland; bitumen belt; Owena Dam; coastal communities (Ilaje) under tidal stress.',
    'Ekiti':     'Highland inland; lower flood exposure; severe rural-urban migration shrinking some land values.',

    # South South / Niger Delta
    'Rivers':    'Niger Delta tidal floodplain; oil & gas concession overlap; subsidence ~25mm/yr; Bonny LNG zone restricts private titles.',
    'Bayelsa':   'Almost entirely <5m elevation; >70% perennial flood risk; oil acquisition zones widespread.',
    'Delta':     'Niger River terminus; Warri petroleum zone; Lagdo + Kainji + Jebba release impact zone.',
    'Akwa Ibom': 'Coastal; ExxonMobil Qua Iboe corridor; rising oil-driven land prices in Uyo & Eket.',
    'Cross River': 'Coastal + tropical rainforest; Calabar port zone; Obudu mountains lower flood risk inland.',
    'Edo':       'Forest belt + Benin City urban core; gully erosion in Auchi/Igarra; Ovia rainforest reserve restricts titles.',

    # South East
    'Anambra':   'Severe gully erosion belt (Nanka, Agulu, Oko); Niger River floodplain along Onitsha/Ogbaru; NEWMAP active.',
    'Enugu':     'Coal-belt geology; gully erosion; cooler highland climate moderates flooding.',
    'Imo':       'Gully erosion + petroleum prospecting; Owerri urban expansion fast.',
    'Ebonyi':    'Lead/zinc mining zones; gully erosion; agrarian.',
    'Abia':      'Aba commercial corridor; gully erosion belt; Aba Free Trade Zone restricts private titles.',

    # North Central / FCT
    'FCT':       'Federal land — ALL land owned by FG under Decree No. 6 of 1976. Only allocated, never sold. AGIS title essential.',
    'Niger':     'Hosts Kainji, Jebba, Shiroro, Zungeru dams — most concentrated dam footprint in Nigeria; high flood pulse risk.',
    'Kogi':      'Niger-Benue confluence at Lokoja — annual perennial flood; Lagdo Dam direct impact zone.',
    'Benue':     'Benue River basin; direct downstream impact of Lagdo Dam (Cameroon); 2022 floods displaced 200,000+.',
    'Plateau':   'Highland (~1,200m); cooler; tin mining ponds; communal land conflicts in Jos/Barkin Ladi.',
    'Nasarawa':  'Abuja overflow corridor; Karu/Mararaba growing fast; Benue floodplain east.',
    'Kwara':     'Niger River basin; Jebba Dam; agricultural land plentiful.',

    # North West
    'Kano':      'Sahel margin; Tiga + Challawa Gorge dams; severe heat stress projected; arable land pressure.',
    'Kaduna':    'Mixed climate; Shiroro/Kaduna River basin; political-religious land contestation.',
    'Katsina':   'Sahel; Zobe/Jibiya dams; declining rainfall; insecurity discount on land values.',
    'Sokoto':    'Sahel; Goronyo Dam flood pulses; insecurity discount.',
    'Kebbi':     'Niger River basin; rice irrigation; flood plains.',
    'Zamfara':   'Bakolori Dam; insecurity strongly suppresses land values.',
    'Jigawa':    'Sahel; Hadejia-Nguru wetlands; Komadugu river basin floods.',

    # North East
    'Borno':     'Lake Chad basin shrinkage; security risk dominates valuation; Maiduguri urban core resilient.',
    'Yobe':      'Komadugu river basin; Sahel; insurgency discount.',
    'Bauchi':    "Jama'are River; Kafin Zaki Dam (under construction); medium flood profile.",
    'Gombe':     'Gongola River basin; Dadin Kowa Dam; urban Gombe expanding.',
    'Adamawa':   'Direct downstream of Lagdo Dam (Cameroon); 2022 catastrophic flooding; Yola is high-risk.',
    'Taraba':    'Taraba/Benue river basins; downstream of Lagdo; annual major flooding.',
}


def _nigeria_region_note(state: str) -> str:
    key = (state or '').strip().title()
    return NIGERIA_REGIONS.get(key, 'General Nigerian land context applies.')


def _infer_area_type(scan_data: dict) -> str:
    state = (scan_data.get('state') or '').lower()
    lga = (scan_data.get('lga') or '').lower()
    if any(k in lga for k in ['island', 'ikoyi', 'victoria', 'eti-osa', 'eti osa']):
        return 'High-density urban commercial / luxury residential'
    if any(k in lga for k in ['ibeju', 'epe', 'ikorodu', 'sangotedo']):
        return 'Peri-urban / rapidly developing suburban'
    if state in ['rivers', 'bayelsa', 'delta', 'akwa ibom', 'cross river']:
        return 'Niger Delta / coastal lowland'
    if state in ['anambra', 'enugu', 'imo', 'ebonyi', 'abia']:
        return 'South-East inland (gully erosion belt)'
    if 'abuja' in state or 'fct' in state:
        return 'FCT planned urban district (federal land)'
    if state in ['kano', 'katsina', 'sokoto', 'borno', 'yobe', 'kebbi', 'zamfara', 'jigawa']:
        return 'Sahel / Sudan savanna'
    return 'Nigerian urban/suburban'


def _infer_terrain(elevation):
    if elevation is None:
        return 'Terrain elevation unavailable'
    elev = float(elevation)
    if elev < 5:
        return f'Very low-lying ({elev}m) — high coastal/tidal/flood exposure'
    if elev < 15:
        return f'Low elevation ({elev}m) — moderate flood exposure'
    if elev < 50:
        return f'Moderate elevation ({elev}m) — manageable flood risk'
    if elev < 200:
        return f'Elevated terrain ({elev}m) — lower flood risk'
    return f'Highland ({elev}m) — cooler climate, low flood risk, possible erosion/landslide'


def build_analysis_prompt(scan_data: dict) -> str:
    state = scan_data.get('state', 'Nigeria')
    region_note = _nigeria_region_note(state)

    location_block = f"""
LOCATION DETAILS
- Address:        {scan_data.get('address') or 'Not available'}
- State:          {state}
- LGA:            {scan_data.get('lga') or 'Unknown'}
- Coordinates:    {scan_data.get('latitude')}, {scan_data.get('longitude')}
- Scan radius:    {scan_data.get('radius_km', 1)} km (≈ {round(float(scan_data.get('radius_km') or 1) ** 2 * 3.14159 * 100)} hectares)
- GPS accuracy:   ±{scan_data.get('accuracy_meters', 'Unknown')} m
- Elevation:      {scan_data.get('elevation_meters', 'Unknown')} m above sea level
- Terrain read:   {_infer_terrain(scan_data.get('elevation_meters'))}
- Area type:      {_infer_area_type(scan_data)}
- Regional note:  {region_note}
"""

    is_govt = scan_data.get('is_government_land') or scan_data.get('is_under_acquisition')
    legal_block = f"""
LEGAL & OWNERSHIP STATUS
- Government / acquisition area: {'YES — CRITICAL' if is_govt else 'No government acquisition records detected within scan radius'}
- Acquiring authority:           {scan_data.get('acquisition_authority') or 'N/A'}
- Acquisition type:              {scan_data.get('acquisition_type') or 'N/A'}
- Gazette reference:             {scan_data.get('gazette_reference') or 'N/A'}
- Legal notes:                   {scan_data.get('legal_notes') or 'N/A'}
"""

    env_block = f"""
ENVIRONMENTAL RISK DATA
Flood:
- Risk level:                    {scan_data.get('flood_risk_level') or 'Unknown'}
- Flood zone name:               {scan_data.get('flood_zone_name') or 'No named zone within scan radius'}
- Flood type:                    {scan_data.get('flood_type') or 'Unknown'}
- Peak flood months:             {scan_data.get('flood_peak_months') or 'Unknown'}
- Last major flood year:         {scan_data.get('flood_last_major_year') or 'Unknown'}
- Notes:                         {scan_data.get('flood_notes') or 'N/A'}
- Source:                        {scan_data.get('flood_data_source') or 'N/A'}

Erosion:
- Risk level:                    {scan_data.get('erosion_risk_level') or 'Unknown'}

Dam & water infrastructure:
- Nearest dam:                   {scan_data.get('nearest_dam_name') or 'None within search range'}
- Distance to nearest dam:       {scan_data.get('nearest_dam_distance_km') or 'Unknown'} km
- Dam-driven risk level:         {scan_data.get('dam_risk_level') or 'Unknown'}
- River basin:                   {scan_data.get('dam_river_basin') or 'Unknown'}
- Dam capacity:                  {scan_data.get('dam_capacity_mcm') or 'Unknown'} million m³
- Dam height:                    {scan_data.get('dam_height_m') or 'Unknown'} m
- Year completed:                {scan_data.get('dam_year_completed') or 'Unknown'}
- Purpose:                       {scan_data.get('dam_purpose') or 'Unknown'}
- Downstream states impacted:    {scan_data.get('dam_downstream_states') or 'Unknown'}
- Operator notes:                {scan_data.get('dam_notes') or 'N/A'}

Composite:
- Overall risk score:            {scan_data.get('risk_score') or 'N/A'} / 100
- Overall risk level:            {scan_data.get('risk_level') or 'Unknown'}
"""

    climate_block = """
NIGERIA CLIMATE & MACRO CONTEXT (for projection modelling)
- Two-season climate: rainy April–October, dry November–March; rainy season intensifying.
- IPCC AR6 projections for West Africa: +1.5–2.5°C by 2050; +2.5–4.5°C by 2100 (RCP8.5).
- West African coast sea-level rise: +0.3–0.6m by 2050; +0.5–1.0m by 2100.
- Niger Delta land subsidence: 5–25mm/yr in many sites.
- Rainfall intensity: +10–20% per major rain event since 2000 (NIMET).
- NIHSA AFO projects ~40% increase in flood-affected communities by 2035.
- Lagdo Dam (Cameroon) releases continue annually; Nigerian buffer Dasin Hausa never built.
- Naira inflation: 25–35% YoY since 2023; CBN base rate ~27%; suppresses formal mortgage market.
- Population: 230M today → projected ~400M by 2050; informal urbanisation accelerating.
- Lagos Megacity Plan, Abuja Master Plan revisions, Ibadan Master Plan all under federal review.
"""

    return f"""You are LANDRIFY AI — Nigeria's most precise land-risk analysis engine. Your reader is a Nigerian land buyer who needs a clear, data-driven verdict before signing anything. Write with the authority of a senior environmental consultant, urban planner and climate scientist combined.

You have been given comprehensive scan data for a piece of land in Nigeria.
Use ONLY the data below — do not invent unsupported figures. Where data is missing, say "limited data" and reason from regional context. Cite Nigerian institutions (NIHSA, NEMA, NESREA, LASURA, FCDA, AGIS, NEWMAP, CBN, NIMET, NPC) where relevant.

{location_block}
{legal_block}
{env_block}
{climate_block}

Generate a detailed STRUCTURED REPORT in clean Markdown with EXACTLY these sections (use ## headings):

## Executive Summary
4–5 sentence verdict. State the headline risk, the single biggest factor, and one hard number the buyer should remember.

## Current State (2026)
Describe today's land condition: terrain, drainage, neighbourhood character, dominant land use, infrastructure access (water, power, road quality). Reference the actual address and LGA.

## Legal & Title Outlook
Explain the legal posture (government acquisition, gazettes, customary land risk, C of O / Governor's Consent likelihood). Specify what title checks the buyer must run, and which Nigerian agency holds the records (e.g., LASURA / AGIS / state Ministry of Lands).

## Environmental Risk Profile
Quantify flood, erosion and dam-release risk in plain language. Include peak months, last major flood year, expected return period, and downstream/upstream context.

## Time Projections
Give specific, dated projections for: **2030**, **2035**, **2040**, **2045**, **2055**, **2065**, **2075**.
For each year, write 2–3 sentences covering (a) physical risk evolution, (b) likely infrastructure / policy change, (c) directional land-value impact in real (inflation-adjusted) terms.

## Property Value Outlook
Estimate directional value trajectory (e.g., "compounded ~8–12%/yr nominal, ~2–4%/yr real over 10 years if Pro infrastructure delivers; flat-to-negative if flood frequency doubles"). Identify the 3 levers that move the value most.

## Comparable Areas
Name 3 nearby Nigerian areas that share the risk profile (or sit one step better/worse) so the buyer has a frame of reference. Be specific (e.g., "Comparable to Sangotedo before 2018 corridor upgrade").

## Climate-Adaptation & Mitigation Plan
Concrete, costed actions the buyer should budget for in the first 5 years (foundation elevation, perimeter drainage, retaining wall, insurance, slope stabilisation). Use Naira ranges where you can.

## Insurance & Financing Implications
Will Nigerian banks finance here? Expected mortgage LTV / interest premium. Which insurance products apply (flood, fire, builders risk) and roughly what they cost.

## Investment Verdict
One of: **BUY**, **BUY WITH CAUTION**, **HOLD**, **AVOID**. Justify in 3 sentences with 1–2 specific conditions that must be true for the verdict to hold.

## Action Checklist
A concise 7-item checklist (numbered) the buyer should complete BEFORE signing — title search, charting, survey beacons, neighbour interviews, NIHSA flood map cross-check, etc.

## Data Sources & Disclaimer
List the data sources actually used (e.g., NIHSA AFO 2024, Mapbox satellite, Nominatim, OpenElevation) and a one-paragraph disclaimer that this is advisory only.

Style requirements:
- Be specific, data-driven, and Nigerian. Use real institution names and real place names.
- Use **bold** for the most important numbers in each paragraph.
- Avoid generic filler. Every projection must trace back to data above.
- Where the data is silent, state so plainly and reason carefully from regional context.
"""


def generate_ai_report(scan_data: dict) -> dict:
    """
    Call Groq to generate the long-form land-risk report.
    Returns a dict: {status, report, model, tokens_used, ai_powered}.
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
                        "You are Landrify AI — Nigeria's most precise land-risk analysis engine. "
                        "You write structured, data-grounded, time-projected reports for Nigerian "
                        "land buyers. You ALWAYS ground analysis in the data provided and cite "
                        "Nigerian institutions (NIHSA, NEMA, NESREA, LASURA, FCDA, AGIS, NEWMAP, "
                        "CBN, NIMET) where relevant. You never invent unsupported figures."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.35,
            max_tokens=6500,
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
        fallback = _placeholder_report(scan_data)
        fallback['error'] = str(e)
        fallback['status'] = 'error'
        return fallback


def _placeholder_report(scan_data: dict) -> dict:
    state = scan_data.get('state', 'the selected area')
    risk = scan_data.get('risk_level', 'unknown')
    score = scan_data.get('risk_score', 'N/A')
    flood = scan_data.get('flood_risk_level', 'unknown')

    report = f"""## Executive Summary
This land in {state} has an overall risk score of **{score}/100** ({risk} risk).
Current flood risk reads as **{flood}**. The full Landrify AI time-projection report
requires a Groq API key — set `GROQ_API_KEY` in the server environment to enable it.

## Set GROQ_API_KEY to unlock
1. Get a free key at console.groq.com (no card required).
2. Add `GROQ_API_KEY=...` to the backend `.env`.
3. Re-run this scan — the full ~12-section report will populate automatically.
"""
    return {
        'status': 'placeholder',
        'report': report,
        'ai_powered': False,
        'message': 'Set GROQ_API_KEY to enable full AI reports. Free at console.groq.com',
    }
