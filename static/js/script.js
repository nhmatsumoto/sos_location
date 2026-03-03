const i18n = {
    por: {
        title: 'Centro de comando integrado ao mapa',
        languageLabel: 'Selecionar idioma',
        github: 'Repositório',
        panelTitle: 'Simulação rápida',
        panelDescription: 'Clique no mapa para preencher coordenadas e executar estimativas.',
        latitude: 'Latitude',
        longitude: 'Longitude',
        latitudePlaceholder: 'Ex.: -20.135896',
        longitudePlaceholder: 'Ex.: -44.123509',
        calculate: 'Calcular estimativa',
        calculating: 'Calculando…',
        clearMap: 'Limpar',
        quickActions: 'Ações rápidas',
        presets: {
            center: 'Centro da operação',
            north: 'Zona norte',
            south: 'Zona sul'
        },
        statusLabel: 'Situação',
        status: {
            idle: 'Aguardando ação no mapa.',
            pointSelected: 'Ponto selecionado no mapa.',
            calculating: 'Processando simulação de deslocamento…',
            success: 'Estimativa concluída.',
            cleared: 'Camadas limpas.',
            missingSaved: 'Desaparecido cadastrado com sucesso.'
        },
        errors: {
            invalidCoordinates: 'Informe latitude e longitude válidas.',
            requestFailed: 'Falha ao consultar API.',
            missingFields: 'Preencha nome e último local visto.'
        },
        markerLabels: {
            start: 'Localização inicial',
            destination: 'Destino estimado',
            selected: 'Ponto selecionado',
            missing: 'Desaparecido'
        },
        missingTitle: 'Cadastro de desaparecidos por clique',
        missingSubtitle: 'Selecione um ponto no mapa e cadastre a pessoa nas coordenadas clicadas.',
        selectedPoint: 'Coordenadas selecionadas',
        missingName: 'Nome',
        missingNamePlaceholder: 'Ex.: Maria Silva',
        missingLastSeen: 'Último local visto',
        missingLastSeenPlaceholder: 'Ex.: Rua principal / comunidade',
        missingDetails: 'Observações',
        addMissing: 'Adicionar desaparecido',
        savingMissing: 'Salvando…',
        baseLayers: {
            relief: 'Relevo sombreado',
            topo: 'Topográfico',
            streets: 'Ruas (OSM)'
        }
    },
    eng: {
        title: 'Map-integrated command center',
        languageLabel: 'Select language',
        github: 'Repository',
        panelTitle: 'Quick simulation',
        panelDescription: 'Click on the map to fill coordinates and run estimates.',
        latitude: 'Latitude',
        longitude: 'Longitude',
        latitudePlaceholder: 'Example: -20.135896',
        longitudePlaceholder: 'Example: -44.123509',
        calculate: 'Calculate estimate',
        calculating: 'Calculating…',
        clearMap: 'Clear',
        quickActions: 'Quick actions',
        presets: {
            center: 'Operations center',
            north: 'North zone',
            south: 'South zone'
        },
        statusLabel: 'Status',
        status: {
            idle: 'Waiting for map action.',
            pointSelected: 'Point selected on map.',
            calculating: 'Processing displacement simulation…',
            success: 'Estimate completed.',
            cleared: 'Layers cleared.',
            missingSaved: 'Missing person registered successfully.'
        },
        errors: {
            invalidCoordinates: 'Provide valid latitude and longitude.',
            requestFailed: 'API request failed.',
            missingFields: 'Fill name and last seen location.'
        },
        markerLabels: {
            start: 'Initial location',
            destination: 'Estimated destination',
            selected: 'Selected point',
            missing: 'Missing person'
        },
        missingTitle: 'Click-to-register missing people',
        missingSubtitle: 'Select a point on the map and register a missing person on clicked coordinates.',
        selectedPoint: 'Selected coordinates',
        missingName: 'Name',
        missingNamePlaceholder: 'Example: Maria Silva',
        missingLastSeen: 'Last seen location',
        missingLastSeenPlaceholder: 'Example: Main street / community',
        missingDetails: 'Notes',
        addMissing: 'Add missing person',
        savingMissing: 'Saving…',
        baseLayers: {
            relief: 'Shaded relief',
            topo: 'Topographic',
            streets: 'Streets (OSM)'
        }
    }
};

var app = new Vue({
    el: '#app',
    data: {
        locale: 'por',
        locales: { por: 'Português', eng: 'English' },
        lat: '-20.135896',
        lng: '-44.123509',
        loading: false,
        savingMissing: false,
        statusMessage: i18n.por.status.idle,
        errorMessage: '',
        missingForm: {
            name: '',
            lastSeen: '',
            details: ''
        }
    },
    computed: {
        t: function() { return i18n[this.locale]; }
    },
    methods: {
        calculate: calculate,
        clearMap: clearMap,
        setPreset: setPreset,
        registerMissingPerson: registerMissingPerson
    },
    watch: {
        locale: function() {
            this.statusMessage = this.t.status.idle;
            this.errorMessage = '';
        }
    }
});

function createMarker(name, point, markerStyle) {
    const marker = L.circleMarker(point, markerStyle || {
        radius: 7,
        color: '#1458a6',
        fillColor: '#2f7cd9',
        fillOpacity: 0.8,
        weight: 2
    }).bindPopup(
        '<b>' + name + '</b>' +
        '<br/>Latitude: ' + point.lat +
        '<br/>Longitude: ' + point.lng
    );
    marker.addTo(window.overlayGroup);
    return marker;
}

function drawVector(pointA, pointB) {
    createMarker(app.t.markerLabels.start, pointA);
    createMarker(app.t.markerLabels.destination, pointB, {
        radius: 7,
        color: '#8d1c1c',
        fillColor: '#d84343',
        fillOpacity: 0.85,
        weight: 2
    });

    const line = new L.Polyline([pointA, pointB], {
        color: '#c23a3a',
        weight: 3,
        opacity: 0.8,
        smoothFactor: 1
    }).addTo(window.overlayGroup);

    L.polylineDecorator(line, {
        patterns: [{
            offset: '100%',
            repeat: 0,
            symbol: L.Symbol.arrowHead({
                pixelSize: 15,
                polygon: false,
                pathOptions: { stroke: true, color: '#c23a3a', weight: 3, opacity: 0.8 }
            })
        }]
    }).addTo(window.overlayGroup);
}

async function calculate() {
    const lat = Number(app.lat);
    const lng = Number(app.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        app.errorMessage = app.t.errors.invalidCoordinates;
        return;
    }

    app.loading = true;
    app.errorMessage = '';
    app.statusMessage = app.t.status.calculating;

    const srcPoint = new L.LatLng(lat, lng);
    const result = await fetch('/api/calculate', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(srcPoint)
    });

    if (!result.ok) {
        app.loading = false;
        app.errorMessage = app.t.errors.requestFailed;
        return;
    }

    const data = await result.json();
    drawVector(srcPoint, new L.LatLng(data.lat, data.lng));
    window.map.panTo([data.lat, data.lng]);
    app.statusMessage = app.t.status.success;
    app.loading = false;
}

async function registerMissingPerson() {
    const lat = Number(app.lat);
    const lng = Number(app.lng);

    if (!app.missingForm.name || !app.missingForm.lastSeen || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        app.errorMessage = app.t.errors.missingFields;
        return;
    }

    app.savingMissing = true;
    app.errorMessage = '';

    const payload = new URLSearchParams({
        kind: 'person',
        name: app.missingForm.name,
        lastSeen: app.missingForm.lastSeen,
        details: app.missingForm.details,
        lat: String(lat),
        lng: String(lng)
    });

    const result = await fetch('/api/report-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: payload.toString()
    });

    if (!result.ok) {
        app.savingMissing = false;
        app.errorMessage = app.t.errors.requestFailed;
        return;
    }

    createMissingMarker({ name: app.missingForm.name, lat: lat, lng: lng, lastSeen: app.missingForm.lastSeen });
    app.missingForm.name = '';
    app.missingForm.lastSeen = '';
    app.missingForm.details = '';
    app.statusMessage = app.t.status.missingSaved;
    app.savingMissing = false;
}

function createMissingMarker(item) {
    const safeName = escapeHtml(item.name);
    const safeLastSeen = escapeHtml(item.lastSeen);
    const marker = L.marker([item.lat, item.lng], {
        title: app.t.markerLabels.missing
    }).bindPopup(
        '<b>' + app.t.markerLabels.missing + '</b>' +
        '<br/>' + safeName +
        '<br/>' + safeLastSeen +
        '<br/>Lat: ' + item.lat + ' / Lng: ' + item.lng
    );
    marker.addTo(window.missingGroup);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadMissingReports() {
    const result = await fetch('/api/report-info');
    if (!result.ok) return;
    const list = await result.json();
    list.forEach(function(item) {
        if (Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))) {
            createMissingMarker(item);
        }
    });
}

function clearMap() {
    window.overlayGroup.clearLayers();
    app.statusMessage = app.t.status.cleared;
    app.errorMessage = '';
}

function setPreset(zone) {
    const presets = {
        center: { lat: -20.135896, lng: -44.123509, zoom: 14 },
        north: { lat: -20.1265, lng: -44.1221, zoom: 14 },
        south: { lat: -20.1472, lng: -44.1247, zoom: 14 }
    };
    const preset = presets[zone] || presets.center;
    app.lat = String(preset.lat);
    app.lng = String(preset.lng);
    window.map.setView([preset.lat, preset.lng], preset.zoom);
    app.statusMessage = app.t.status.pointSelected;
}

function initMap() {
    const osmLayer = L.tileLayer.provider('OpenStreetMap.Mapnik');
    const terrainReliefLayer = L.tileLayer.provider('Esri.WorldShadedRelief', { maxZoom: 13 });
    const topographicLayer = L.tileLayer.provider('OpenTopoMap', { maxZoom: 17 });

    const map = L.map('map', { layers: [terrainReliefLayer], zoomControl: true });

    const baseLayers = {};
    baseLayers[i18n.por.baseLayers.relief] = terrainReliefLayer;
    baseLayers[i18n.por.baseLayers.topo] = topographicLayer;
    baseLayers[i18n.por.baseLayers.streets] = osmLayer;

    L.control.layers(baseLayers, null, { collapsed: false, position: 'topright' }).addTo(map);

    window.overlayGroup = L.layerGroup().addTo(map);
    window.missingGroup = L.layerGroup().addTo(map);

    map.on('click', function(e) {
        app.lat = e.latlng.lat.toFixed(6);
        app.lng = e.latlng.lng.toFixed(6);
        window.overlayGroup.clearLayers();
        createMarker(app.t.markerLabels.selected, e.latlng).openPopup();
        app.statusMessage = app.t.status.pointSelected;
        app.errorMessage = '';
    });

    fetch('/static/geodata/hot_area.json').then(function(response) {
        return response.json();
    }).then(function(data) {
        const areaLayer = L.geoJSON(data, { style: { color: '#7d1f1f', weight: 2, fillOpacity: 0.15 } });
        map.fitBounds(areaLayer.getBounds());
        areaLayer.addTo(map);
    });

    loadMissingReports();
    return map;
}

document.addEventListener('DOMContentLoaded', function() {
    window.map = initMap();
});
