from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from apps.scans.services import forward_geocode, get_location_info


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
