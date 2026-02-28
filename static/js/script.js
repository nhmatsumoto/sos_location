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
        toolsTitle: 'Caixa de ferramentas',
        notificationsTitle: 'Notificações operacionais',
        locationInfoTitle: 'Informações relevantes do local',
        refreshLocationInfo: 'Atualizar contexto local',
        updatedAt: 'Atualizado em',
        rainfall: 'Chuva 24h (mm)',
        elevation: 'Elevação (m)',
        soilSaturation: 'Saturação do solo',
        flowMobility: 'Índice de mobilidade',
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
        missingHint: 'Formulário simplificado: os demais dados são preenchidos automaticamente pela plataforma.',
        selectedPoint: 'Coordenadas selecionadas',
        missingName: 'Nome',
        missingNamePlaceholder: 'Ex.: Maria Silva',
        missingLastSeen: 'Último local visto',
        missingLastSeenPlaceholder: 'Ex.: Rua principal / comunidade',
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
        toolsTitle: 'Toolbox',
        notificationsTitle: 'Operational notifications',
        locationInfoTitle: 'Relevant location information',
        refreshLocationInfo: 'Refresh local context',
        updatedAt: 'Updated at',
        rainfall: 'Rainfall 24h (mm)',
        elevation: 'Elevation (m)',
        soilSaturation: 'Soil saturation',
        flowMobility: 'Flow mobility index',
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
        missingHint: 'Simplified form: remaining fields are auto-filled by the platform.',
        selectedPoint: 'Selected coordinates',
        missingName: 'Name',
        missingNamePlaceholder: 'Example: Maria Silva',
        missingLastSeen: 'Last seen location',
        missingLastSeenPlaceholder: 'Example: Main street / community',
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
            lastSeen: ''
        },
        locationInfo: {
            rainfallMm24h: '-',
            elevationM: '-',
            soilSaturation: '-',
            flowMobilityIndex: '-',
            updatedAt: ''
        },
        notifications: []
    },
    computed: {
        t: function() { return i18n[this.locale]; }
    },
    methods: {
        calculate: calculate,
        clearMap: clearMap,
        setPreset: setPreset,
        registerMissingPerson: registerMissingPerson,
        refreshLocationInfo: refreshLocationInfo,
        openTool: openTool
    },
    watch: {
        locale: function() {
            this.statusMessage = this.t.status.idle;
            this.errorMessage = '';
        }
    }
});

function pushNotification(message, level) {
    const now = new Date();
    app.notifications.unshift({
        id: now.getTime() + Math.random(),
        message: message,
        level: level || 'info',
        time: now.toLocaleTimeString()
    });
    app.notifications = app.notifications.slice(0, 8);
}

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

async function refreshLocationInfo() {
    const lat = Number(app.lat);
    const lng = Number(app.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
    }

    try {
        const result = await fetch('/api/terrain/context?lat=' + lat + '&lng=' + lng);
        if (!result.ok) {
            throw new Error('terrain-error');
        }
        const payload = await result.json();
        const ctx = payload.context || {};
        app.locationInfo = {
            rainfallMm24h: ctx.rainfallMm24h ?? '-',
            elevationM: ctx.elevationM ?? '-',
            soilSaturation: ctx.soilSaturation ?? '-',
            flowMobilityIndex: ctx.flowMobilityIndex ?? '-',
            updatedAt: new Date().toLocaleTimeString()
        };
        pushNotification('Contexto local atualizado.', 'info');
    } catch (_) {
        pushNotification(app.t.errors.requestFailed, 'error');
    }
}

function openTool(kind) {
    const routes = {
        hotspots: '/api/hotspots',
        rescue: '/api/rescue-support',
        terrain: '/api/terrain/context?lat=' + app.lat + '&lng=' + app.lng,
        transparency: '/api/transparency/search?query=auxilio'
    };
    const route = routes[kind] || '/api/hotspots';
    window.open(route, '_blank', 'noopener,noreferrer');
    pushNotification('Ferramenta aberta: ' + kind, 'info');
}

async function calculate() {
    const lat = Number(app.lat);
    const lng = Number(app.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        app.errorMessage = app.t.errors.invalidCoordinates;
        pushNotification(app.t.errors.invalidCoordinates, 'error');
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
        pushNotification(app.t.errors.requestFailed, 'error');
        return;
    }

    const data = await result.json();
    drawVector(srcPoint, new L.LatLng(data.lat, data.lng));
    window.map.panTo([data.lat, data.lng]);
    app.statusMessage = app.t.status.success;
    app.loading = false;
    pushNotification(app.t.status.success, 'info');
    refreshLocationInfo();
}

async function registerMissingPerson() {
    const lat = Number(app.lat);
    const lng = Number(app.lng);

    if (!app.missingForm.name || !app.missingForm.lastSeen || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        app.errorMessage = app.t.errors.missingFields;
        pushNotification(app.t.errors.missingFields, 'error');
        return;
    }

    app.savingMissing = true;
    app.errorMessage = '';

    const payload = {
        personName: app.missingForm.name,
        lastSeenLocation: app.missingForm.lastSeen,
        city: app.locale === 'por' ? 'Não informado' : 'Not informed',
        additionalInfo: `Registro via mapa em lat=${lat}, lng=${lng}`,
        lat: lat,
        lng: lng,
        source: 'map-ui-simplified'
    };

    const result = await fetch('/api/missing-persons', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!result.ok) {
        app.savingMissing = false;
        app.errorMessage = app.t.errors.requestFailed;
        pushNotification(app.t.errors.requestFailed, 'error');
        return;
    }

    createMissingMarker({ name: app.missingForm.name, lat: lat, lng: lng, lastSeen: app.missingForm.lastSeen });
    app.missingForm.name = '';
    app.missingForm.lastSeen = '';
    app.statusMessage = app.t.status.missingSaved;
    app.savingMissing = false;
    pushNotification(app.t.status.missingSaved, 'info');
}

function createMissingMarker(item) {
    const marker = L.marker([item.lat, item.lng], {
        title: app.t.markerLabels.missing
    }).bindPopup(
        '<b>' + app.t.markerLabels.missing + '</b>' +
        '<br/>' + item.name +
        '<br/>' + (item.lastSeenLocation || item.lastSeen || '-') +
        '<br/>Lat: ' + item.lat + ' / Lng: ' + item.lng
    );
    marker.addTo(window.missingGroup);
}

async function loadMissingReports() {
    const result = await fetch('/api/missing-persons');
    if (!result.ok) return;
    const list = await result.json();
    list.forEach(function(item) {
        const lat = Number(item.lat);
        const lng = Number(item.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            createMissingMarker({
                name: item.personName || item.name || 'Desconhecido',
                lastSeenLocation: item.lastSeenLocation || item.lastSeen || '-',
                lat: lat,
                lng: lng
            });
        }
    });
}

function clearMap() {
    window.overlayGroup.clearLayers();
    app.statusMessage = app.t.status.cleared;
    app.errorMessage = '';
    pushNotification(app.t.status.cleared, 'info');
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
    refreshLocationInfo();
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
        pushNotification(app.t.status.pointSelected, 'info');
        refreshLocationInfo();
    });

    fetch('/static/geodata/hot_area.json').then(function(response) {
        return response.json();
    }).then(function(data) {
        const areaLayer = L.geoJSON(data, { style: { color: '#7d1f1f', weight: 2, fillOpacity: 0.15 } });
        map.fitBounds(areaLayer.getBounds());
        areaLayer.addTo(map);
    });

    loadMissingReports();
    refreshLocationInfo();
    pushNotification('Centro de comando inicializado.', 'info');
    return map;
}

document.addEventListener('DOMContentLoaded', function() {
    window.map = initMap();
});
