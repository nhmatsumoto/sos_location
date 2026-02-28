from django.views.generic.base import RedirectView


class ViewMap(RedirectView):
    permanent = False
    query_string = True
    pattern_name = None
    url = 'http://localhost:8080/'


viewmap = ViewMap.as_view()
