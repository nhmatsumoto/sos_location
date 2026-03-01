from django.urls import path

from apps.api.views import (
    calculatecoordinate,
    attention_alerts,
    cfd_ideas,
    collapse_reports,
    climate_integrations,
    hotspots,
    identify_victim,
    location_flow_simulation,
    unified_easy_simulation,
    missing_people_csv,
    news_updates,
    missing_persons,
    push_register,
    report_info,
    rescue_support,
    splat_convert,
    searched_areas,
    terrain_context,
)

from apps.api.views_integrations import (
    alerts as alerts_feed,
    satellite_goes_recent,
    satellite_layers,
    satellite_stac_search,
    transparency_search,
    transparency_transfers,
    weather_archive,
    weather_forecast,
)


app_name = 'api'

urlpatterns = [
    path('calculate', calculatecoordinate, name='coordinate_calculate'),
    path('hotspots', hotspots, name='hotspots'),
    path('collapse-reports', collapse_reports, name='collapse_reports'),
    path('rescue-support', rescue_support, name='rescue_support'),
    path('climate/integrations', climate_integrations, name='climate_integrations'),
    path('location/flow-simulation', location_flow_simulation, name='location_flow_simulation'),
    path('simulation/easy', unified_easy_simulation, name='unified_easy_simulation'),
    path('terrain/context', terrain_context, name='terrain_context'),
    path('searched-areas', searched_areas, name='searched_areas'),
    path('report-info', report_info, name='report_info'),
    path('missing-people.csv', missing_people_csv, name='missing_people_csv'),
    path('missing-persons', missing_persons, name='missing_persons'),
    path('news-updates', news_updates, name='news_updates'),
    path('identify-victim', identify_victim, name='identify_victim'),
    path('cfd/ideas', cfd_ideas, name='cfd_ideas'),
    path('splat/convert', splat_convert, name='splat_convert'),
    path('push/register', push_register, name='push_register'),
    path('attention-alerts', attention_alerts, name='attention_alerts'),
    path('weather/forecast', weather_forecast, name='weather_forecast'),
    path('weather/archive', weather_archive, name='weather_archive'),
    path('alerts', alerts_feed, name='alerts_feed'),
    path('transparency/transfers', transparency_transfers, name='transparency_transfers'),
    path('transparency/search', transparency_search, name='transparency_search'),
    path('satellite/layers', satellite_layers, name='satellite_layers'),
    path('satellite/stac/search', satellite_stac_search, name='satellite_stac_search'),
    path('satellite/goes/recent', satellite_goes_recent, name='satellite_goes_recent'),
]
