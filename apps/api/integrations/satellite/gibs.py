from apps.api.integrations.core.cache import shared_cache


DEFAULT_LAYERS = [
    {
        'id': 'MODIS_Terra_CorrectedReflectance_TrueColor',
        'title': 'MODIS Terra True Color',
        'type': 'wmts',
        'templateUrl': 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
        'attribution': 'NASA GIBS',
        'timeSupport': 'daily',
    },
    {
        'id': 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
        'title': 'VIIRS SNPP True Color',
        'type': 'wmts',
        'templateUrl': 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
        'attribution': 'NASA GIBS',
        'timeSupport': 'daily',
    },
    {
        'id': 'GOES-East_ABI_GeoColor',
        'title': 'GOES-East ABI GeoColor',
        'type': 'wms',
        'templateUrl': 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=GOES-East_ABI_GeoColor&FORMAT=image/jpeg&TRANSPARENT=true&TIME={time}&CRS=EPSG:4326&WIDTH=1024&HEIGHT=1024&BBOX={bbox-epsg-4326}',
        'attribution': 'NASA GIBS',
        'timeSupport': 'subdaily',
    },
]


def get_layers_manifest():
    key = 'satellite:gibs:layers'
    cached, hit = shared_cache.get(key)
    if hit:
        return cached, True
    shared_cache.set(key, DEFAULT_LAYERS, ttl=86400)
    return DEFAULT_LAYERS, False
