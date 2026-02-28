import os

from django.views.generic.base import RedirectView


class ViewMap(RedirectView):
    permanent = False
    query_string = True
    pattern_name = None
    url = os.getenv('FRONTEND_URL', 'http://localhost:8088/')


viewmap = ViewMap.as_view()
