var app = new Vue({
    el: '#app',
    data: {
        locale: 'eng',
        locales: {
            eng: 'English',
            por: 'Portuguese'
        },
        lat: '-20.135896',
        lng: '-44.123509'
    },
    methods: {
        calculate: calculate
    }
});

// WARNING: doesn't sanitize inputs
function createMarker(name, point) {
    return L.marker(point).bindPopup(
        '<b>' + name + '</b>' +
        '<br/>Latitude:' + point.lat +
        '<br/>Longitude:' + point.lng
    ).addTo(map);
}

function drawVector(pointA, pointB) {
    createMarker('Localização inicial', pointA);
    createMarker('Localização final (estimada)', pointB);

    const line = new L.Polyline([pointA, pointB], {
        color: 'red',
        weight: 3,
        opacity: 0.5,
        smoothFactor: 1
    }).addTo(map);

    L.polylineDecorator(line, {
        patterns: [
            {
                offset: '100%',
                repeat: 0,
                symbol: L.Symbol.arrowHead({
                    pixelSize: 15,
                    polygon: false,
                    pathOptions: {
                        stroke: true,
                        color: 'red',
                        weight: 3,
                        opacity: 0.5,
                        smoothFactor: 1
                    }
                })
            }
        ]
    }).addTo(map);
}

async function calculate() {
    const srcPoint = new L.LatLng(app.lat, app.lng);

    const result = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(srcPoint)
    });
    const data = await result.json();
    const destPoint = new L.LatLng(data.lat, data.lng);
    drawVector(srcPoint, destPoint);
}

function initMap() {
    const osmLayer = L.tileLayer.provider('OpenStreetMap.Mapnik');

    // Camada em relevo para apoiar análise de deslizamentos.
    const terrainReliefLayer = L.tileLayer.provider('Esri.WorldShadedRelief', {
        maxZoom: 13
    });

    const topographicLayer = L.tileLayer.provider('OpenTopoMap', {
        maxZoom: 17
    });

    const map = L.map('map', {
        layers: [terrainReliefLayer],
        zoomControl: true
    });

    const baseLayers = {
        'Relevo sombreado (deslizamentos)': terrainReliefLayer,
        'Topográfico': topographicLayer,
        'Ruas (OSM)': osmLayer
    };

    L.control.layers(baseLayers, null, {
        collapsed: false,
        position: 'topright'
    }).addTo(map);

    var marker = null;

    map.on('click', function(e) {
        if (marker != null) marker.remove();
        app.lat = e.latlng.lat;
        app.lng = e.latlng.lng;
        var point = new L.LatLng(e.latlng.lat, e.latlng.lng);
        marker = createMarker('Localização selecionada', point);
    });

    fetch('/static/geodata/hot_area.json').then(function(response) {
        return response.json();
    }).then(function(data) {
        const areaQuenteLayer = L.geoJSON(data);
        map.fitBounds(areaQuenteLayer.getBounds());
        areaQuenteLayer.addTo(map);
    });

    return map;
}


document.addEventListener('DOMContentLoaded', function() {
    window.map = initMap();
});
