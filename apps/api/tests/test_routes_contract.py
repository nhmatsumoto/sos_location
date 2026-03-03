from django.test import SimpleTestCase
from django.urls import resolve, reverse


class ApiRoutesContractTestCase(SimpleTestCase):
    def test_named_routes_resolve_without_404_regression(self):
        named_routes = [
            'api:coordinate_calculate',
            'api:hotspots',
            'api:collapse_reports',
            'api:rescue_support',
            'api:climate_integrations',
            'api:location_flow_simulation',
            'api:unified_easy_simulation',
            'api:terrain_context',
            'api:searched_areas',
            'api:report_info',
            'api:missing_people_csv',
            'api:missing_persons',
            'api:news_updates',
            'api:identify_victim',
            'api:cfd_ideas',
            'api:splat_convert',
            'api:push_register',
            'api:attention_alerts',
            'api:weather_forecast',
            'api:weather_archive',
            'api:alerts_feed',
            'api:transparency_transfers',
            'api:transparency_search',
            'api:satellite_layers',
            'api:satellite_stac_search',
            'api:satellite_goes_recent',
            'api:integrations_weather_forecast',
            'api:integrations_weather_history',
            'api:integrations_alerts',
            'api:integrations_transparency_transfers',
            'api:integrations_transparency_summary',
            'api:integrations_satellite_layers',
            'api:disasters_events',
            'api:disasters_stats_by_country',
            'api:disasters_stats_timeseries',
            'api:disasters_crawl_trigger',
        ]

        for route_name in named_routes:
            with self.subTest(route_name=route_name):
                path = reverse(route_name)
                match = resolve(path)
                self.assertIsNotNone(match.func)
