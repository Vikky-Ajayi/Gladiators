from django.test import SimpleTestCase

from apps.scans.ai_report import build_analysis_prompt


class AiReportPromptTests(SimpleTestCase):
    def test_prompt_includes_50_year_projection_and_tangible_conclusion(self):
        prompt = build_analysis_prompt(
            {
                'address': 'Lekki Phase 1, Lagos',
                'address_hint': 'Plot 42',
                'state': 'Lagos',
                'lga': 'Eti-Osa',
                'latitude': 6.4698,
                'longitude': 3.5852,
                'radius_km': 0.05,
                'elevation_meters': 7.2,
                'risk_score': 72,
                'risk_level': 'high',
                'flood_risk_level': 'high',
                'flood_zone_name': 'Lekki Coastal Floodplain',
                'erosion_risk_level': 'medium',
                'nearest_dam_name': 'None',
                'nearest_dam_distance_km': '',
                'dam_risk_level': 'low',
                'is_government_land': False,
                'is_under_acquisition': False,
                'acquisition_authority': '',
                'gazette_reference': '',
                'legal_notes': 'Independent title verification required.',
                'weather_current': {'temperature_c': 29, 'humidity_percent': 81, 'precipitation_mm': 2, 'wind_speed_kmh': 15, 'description': 'Partly cloudy'},
                'weather_historical': {
                    'avg_annual_rainfall_mm': 1850,
                    'rainfall_trend': 'increasing',
                    'wettest_year': 2022,
                    'wettest_year_rainfall_mm': 2200,
                    'driest_year': 2018,
                    'driest_year_rainfall_mm': 1400,
                    'avg_max_temp_c': 31.5,
                    'temp_trend': 'warming',
                    'extreme_rain_days_per_year': 4,
                },
                'weather_projection': {
                    'projection_2030': {'avg_annual_rainfall_mm': 1900, 'avg_max_temp_c': 32},
                    'projection_2035': {'avg_annual_rainfall_mm': 1950, 'avg_max_temp_c': 32.4},
                    'projection_2040': {'avg_annual_rainfall_mm': 2000, 'avg_max_temp_c': 32.8},
                    'projection_2050': {'avg_annual_rainfall_mm': 2100, 'avg_max_temp_c': 33.5},
                    'projection_2060': {'avg_annual_rainfall_mm': 2200, 'avg_max_temp_c': 34.0},
                    'projection_2075': {'avg_annual_rainfall_mm': 2350, 'avg_max_temp_c': 35.0},
                    'rainfall_change_2025_to_2075_percent': 18.0,
                    'temp_change_2025_to_2075_c': 3.2,
                    'flood_risk_trajectory': 'worsening',
                },
            }
        )

        self.assertIn('## 50-Year Projection (2075)', prompt)
        self.assertIn('## Tangible Conclusion', prompt)
        self.assertIn('Projected rainfall change by 2075', prompt)
