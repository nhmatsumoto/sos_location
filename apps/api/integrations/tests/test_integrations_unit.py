import unittest
from unittest.mock import MagicMock, patch

from apps.api.integrations.alerts.inmet_cap import _parse_feed_xml, AlertFeedRegistry
from apps.api.integrations.core.cache import TTLCache
from apps.api.integrations.transparency.cgu import TransparencyApiKeyMissing, _build_url


class TTLCacheUnitTest(unittest.TestCase):
    def test_cache_roundtrip(self):
        cache = TTLCache(default_ttl=60)
        cache.set('a', {'ok': True}, ttl=5)
        value, hit = cache.get('a')
        self.assertTrue(hit)
        self.assertEqual(value, {'ok': True})


class InmetCapParserUnitTest(unittest.TestCase):
    def test_parse_cap_root_alert(self):
        xml = '''
        <alert>
          <identifier>ID-1</identifier>
          <references>https://example/ref</references>
          <info>
            <event>Chuva forte</event>
            <severity>Severe</severity>
            <urgency>Immediate</urgency>
            <certainty>Likely</certainty>
            <effective>2025-01-01T00:00:00+00:00</effective>
            <expires>2025-01-01T04:00:00+00:00</expires>
            <area>
              <areaDesc>Centro</areaDesc>
              <polygon>-20,-44 -21,-44 -21,-43 -20,-43 -20,-44</polygon>
            </area>
          </info>
        </alert>
        '''
        items = _parse_feed_xml(xml)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['identifier'], 'ID-1')
        self.assertEqual(items[0]['event'], 'Chuva forte')

    @patch('apps.api.integrations.alerts.inmet_cap.urlopen')
    def test_registry_handles_bad_feed_without_crashing(self, mock_urlopen):
        from urllib.error import URLError
        mock_urlopen.side_effect = URLError('down')
        registry = AlertFeedRegistry()
        registry.feeds = ['https://feed.invalid']
        items, cache_hit = registry.fetch()
        self.assertEqual(items, [])
        self.assertFalse(cache_hit)


class TransparencyUnitTest(unittest.TestCase):
    def test_build_url(self):
        self.assertTrue(_build_url('/busca-livre').endswith('/busca-livre'))

    def test_missing_key_raises(self):
        from apps.api.integrations.transparency import cgu
        with patch.dict('os.environ', {'TRANSPARENCIA_API_KEY': ''}, clear=False):
            with self.assertRaises(TransparencyApiKeyMissing):
                cgu._headers()


if __name__ == '__main__':
    unittest.main()
