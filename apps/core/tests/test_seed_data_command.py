from django.core.management import call_command
from django.test import TestCase

from apps.core.management.commands.seed_data import FLOOD_ZONES, DAMS, ACQUISITION_AREAS
from apps.scans.models import FloodRiskZone, Dam, AcquisitionArea


class SeedDataCommandTests(TestCase):
    def test_flood_zone_model_has_all_seed_fields(self):
        seed_keys = set(FLOOD_ZONES[0].keys())
        model_fields = {field.name for field in FloodRiskZone._meta.get_fields() if hasattr(field, 'attname')}

        self.assertTrue(seed_keys.issubset(model_fields), msg=f"Missing fields: {sorted(seed_keys - model_fields)}")

    def test_seed_command_is_idempotent(self):
        call_command('seed_data')
        first_counts = (
            FloodRiskZone.objects.count(),
            Dam.objects.count(),
            AcquisitionArea.objects.count(),
        )

        call_command('seed_data')
        second_counts = (
            FloodRiskZone.objects.count(),
            Dam.objects.count(),
            AcquisitionArea.objects.count(),
        )

        self.assertEqual(first_counts, (len(FLOOD_ZONES), len(DAMS), len(ACQUISITION_AREAS)))
        self.assertEqual(second_counts, first_counts)
