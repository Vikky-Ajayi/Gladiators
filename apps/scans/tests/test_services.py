from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from apps.scans.services import forward_geocode, get_climate_projection, get_location_info


class GeocodeServiceTests(SimpleTestCase):
    @override_settings(MAPBOX_TOKEN='pk.test-token')
    @patch('apps.scans.services.time.sleep', return_value=None)
    @patch('apps.scans.services._request_json')
    def test_forward_geocode_prefers_mapbox_results(self, mock_request_json, _mock_sleep):
        mock_request_json.return_value = {
            'features': [
                {
                    'id': 'mapbox.test.1',
                    'geometry': {'coordinates': [3.487438, 6.442287]},
                    'properties': {
                        'mapbox_id': 'mapbox.test.1',
                        'feature_type': 'locality',
                        'full_address': 'Lekki Phase 1, Lagos, Lagos, Nigeria',
                        'context': {
                            'place': {
                                'name': 'Lagos',
                                'alternate': {'name': 'Eti-Osa'},
                            },
                            'region': {'name': 'Lagos'},
                        },
                    },
                },
            ],
        }

        results = forward_geocode('Lekki Phase 1', limit=5)

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['label'], 'Lekki Phase 1, Lagos, Lagos, Nigeria')
        self.assertEqual(results[0]['state'], 'Lagos')
        self.assertEqual(results[0]['lga'], 'Eti-Osa')
        self.assertEqual(results[0]['place_id'], 'mapbox.test.1')

    @override_settings(MAPBOX_TOKEN='pk.test-token')
    @patch('apps.scans.services.time.sleep', return_value=None)
    @patch('apps.scans.services._request_json')
    def test_forward_geocode_falls_back_to_nominatim_when_mapbox_empty(self, mock_request_json, _mock_sleep):
        mock_request_json.side_effect = [
            {'features': []},
            [
                {
                    'lat': '6.5244',
                    'lon': '3.3792',
                    'display_name': 'Lagos, Nigeria',
                    'type': 'city',
                    'place_id': '12345',
                    'address': {'state': 'Lagos State', 'city': 'Lagos'},
                },
            ],
        ]

        results = forward_geocode('Lagos', limit=5)

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['label'], 'Lagos, Nigeria')
        self.assertEqual(results[0]['state'], 'Lagos')
        self.assertEqual(results[0]['lga'], 'Lagos')

    @override_settings(MAPBOX_TOKEN='pk.test-token')
    @patch('apps.scans.services._request_json')
    def test_get_location_info_uses_mapbox_reverse_geocode(self, mock_request_json):
        mock_request_json.return_value = {
            'features': [
                {
                    'id': 'address.1',
                    'properties': {
                        'mapbox_id': 'address.1',
                        'full_address': 'Lekki-Epe Expressway, Lagos 10, Lagos, Nigeria',
                        'context': {
                            'place': {
                                'name': 'Lagos',
                                'alternate': {'name': 'Eti-Osa'},
                            },
                            'region': {'name': 'Lagos'},
                        },
                    },
                },
            ],
        }

        result = get_location_info(6.4698, 3.5852)

        self.assertEqual(result['address'], 'Lekki-Epe Expressway, Lagos 10, Lagos, Nigeria')
        self.assertEqual(result['state'], 'Lagos')
        self.assertEqual(result['lga'], 'Eti-Osa')
        self.assertEqual(result['place_id'], 'address.1')

    @patch('apps.scans.services._request_json')
    def test_get_climate_projection_includes_2075_horizon(self, mock_request_json):
        mock_request_json.return_value = {
            'daily': {
                'time': [
                    '2025-01-01',
                    '2030-01-01',
                    '2035-01-01',
                    '2040-01-01',
                    '2050-01-01',
                    '2060-01-01',
                    '2075-01-01',
                ],
                'precipitation_sum': [1000, 1100, 1150, 1200, 1300, 1400, 1500],
                'temperature_2m_max': [30, 31, 31.5, 32, 33, 34, 35],
            }
        }

        result = get_climate_projection(6.4698, 3.5852)

        self.assertIsNotNone(result)
        self.assertEqual(result['projection_2075']['avg_annual_rainfall_mm'], 1500.0)
        self.assertEqual(result['projection_2060']['avg_max_temp_c'], 34.0)
        self.assertEqual(result['rainfall_change_2025_to_2075_percent'], 50.0)
        self.assertEqual(result['temp_change_2025_to_2075_c'], 5.0)
