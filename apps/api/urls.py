from django.urls import path

from apps.api.views import (
    calculatecoordinate,
    cfd_ideas,
    collapse_reports,
    hotspots,
    identify_victim,
    location_flow_simulation,
    missing_people_csv,
    report_info,
    rescue_support,
    searched_areas,
)

app_name = 'api'

urlpatterns = [
    path('calculate', calculatecoordinate, name='coordinate_calculate'),
    path('hotspots', hotspots, name='hotspots'),
    path('collapse-reports', collapse_reports, name='collapse_reports'),
    path('rescue-support', rescue_support, name='rescue_support'),
    path('location/flow-simulation', location_flow_simulation, name='location_flow_simulation'),
    path('searched-areas', searched_areas, name='searched_areas'),
    path('report-info', report_info, name='report_info'),
    path('missing-people.csv', missing_people_csv, name='missing_people_csv'),
    path('identify-victim', identify_victim, name='identify_victim'),
    path('cfd/ideas', cfd_ideas, name='cfd_ideas'),
]
