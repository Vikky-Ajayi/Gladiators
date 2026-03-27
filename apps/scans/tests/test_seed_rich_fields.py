from django.test import TestCase

from apps.scans.models import FloodRiskZone, Dam
from apps.scans.services import check_flood_risk, check_dam_proximity


class SeedRichFieldsTests(TestCase):
    def test_flood_risk_returns_rich_seed_fields(self):
        FloodRiskZone.objects.create(
            zone_name='Test Flood Zone',
            risk_level='high',
            state='Lagos',
            lga='Eti-Osa',
            min_lat=6.4000,
            max_lat=6.5000,
            min_lng=3.3000,
            max_lng=3.5000,
            flood_type='coastal',
            peak_months='June-October',
            last_major_flood_year=2022,
            data_source='Test Source',
            notes='Critical coastal surge history.',
        )

        result = check_flood_risk(6.45, 3.40, elevation=2)

        self.assertEqual(result['zone_name'], 'Test Flood Zone')
        self.assertEqual(result['flood_type'], 'coastal')
        self.assertEqual(result['peak_months'], 'June-October')
        self.assertEqual(result['last_major_flood_year'], 2022)
        self.assertEqual(result['notes'], 'Critical coastal surge history.')

    def test_dam_proximity_returns_rich_seed_fields(self):
        Dam.objects.create(
            name='Test Dam',
            river_basin='Niger',
            state='Kogi',
            country='Nigeria',
            latitude=7.50,
            longitude=6.50,
            capacity_mcm=2500,
            height_m=92,
            year_completed=2021,
            purpose='Hydropower, irrigation',
            risk_level='high',
            downstream_states='Kogi, Anambra, Delta',
            data_source='Test Source',
            notes='Downstream release can trigger flood pulses.',
        )

        result = check_dam_proximity(7.51, 6.49)

        self.assertEqual(result['nearest_dam'], 'Test Dam')
        self.assertEqual(result['river_basin'], 'Niger')
        self.assertEqual(str(result['capacity_mcm']), '2500.00')
        self.assertEqual(str(result['height_m']), '92.00')
        self.assertEqual(result['year_completed'], 2021)
        self.assertEqual(result['purpose'], 'Hydropower, irrigation')
        self.assertEqual(result['downstream_states'], 'Kogi, Anambra, Delta')
        self.assertEqual(result['notes'], 'Downstream release can trigger flood pulses.')
