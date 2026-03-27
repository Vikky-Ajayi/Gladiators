from django.test import SimpleTestCase

from landrify.settings import _normalize_allowed_host


class AllowedHostNormalizationTests(SimpleTestCase):
    def test_normalize_allowed_host_strips_scheme_and_path(self):
        self.assertEqual(_normalize_allowed_host('https://landrify.up.railway.app/'), 'landrify.up.railway.app')
        self.assertEqual(_normalize_allowed_host('http://api.example.com/path'), 'api.example.com')

    def test_normalize_allowed_host_keeps_wildcard(self):
        self.assertEqual(_normalize_allowed_host('*'), '*')
