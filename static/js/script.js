const i18n = {
    por: {
        title: 'Painel tático para voluntários e equipes de busca e resgate',
        subtitle: 'Selecione o ponto de referência e gere rapidamente uma estimativa de deslocamento.',
        languageLabel: 'Selecionar idioma',
        github: 'Repositório',
        panelTitle: 'Coordenadas da ocorrência',
        panelDescription: 'Use coordenadas GPS conhecidas, ou clique diretamente no mapa para preencher os campos.',
        latitude: 'Latitude',
        longitude: 'Longitude',
        latitudePlaceholder: 'Ex.: -20.135896',
        longitudePlaceholder: 'Ex.: -44.123509',
        calculate: 'Calcular estimativa',
        calculating: 'Calculando…',
        clearMap: 'Limpar marcações',
        quickActions: 'Ações rápidas',
        presets: {
            center: 'Ir para centro da operação',
            north: 'Foco na zona norte de busca',
            south: 'Foco na zona sul de busca'
        },
        cfd: {
            title: 'Simulação de Enchente (CFD simplificado)',
            description: 'Este módulo usa uma aproximação inicial de dinâmica de fluidos para projetar direção e alcance da massa de água/rejeito.',
            step1: 'Entrada principal: coordenada inicial (lat/lng) e cenário de vazão disponível na API.',
            step2: 'Saída operacional: direção estimada de deslocamento e ponto provável para priorização da busca.',
            step3: 'Use em conjunto com camadas de relevo/topografia para validar obstáculos e rotas de acesso.',
            endpointLabel: 'Endpoint da simulação',
            note: 'Importante: resultado é apoio tático inicial e não substitui validação da engenharia de campo.'
        },
        statusLabel: 'Situação',
        legendTitle: 'Como usar em campo',
        legendItems: {
            click: 'Clique no mapa para definir a última posição conhecida.',
            flow: 'Use “Calcular estimativa” para gerar direção e ponto provável.',
            hotArea: 'Área quente em destaque para priorização operacional.'
        },
        services: {
            title: 'Módulos operacionais disponíveis no MVP',
            description: 'Atalhos para serviços já implementados na API e usados no fluxo de busca, triagem e coordenação.',
            items: [
                { name: 'Hotspots', desc: 'Ranking de áreas críticas para priorização.' },
                { name: 'Rescue Support', desc: 'Snapshot tático com agentes e locais prováveis.' },
                { name: 'Searched Areas', desc: 'Registro das áreas já verificadas por equipes.' },
                { name: 'Report Info', desc: 'Relatos de pessoas e animais desaparecidos.' },
                { name: 'Identify Victim', desc: 'Triagem inicial para identificação.' }
            ]
        },
        status: {
            idle: 'Aguardando coordenadas para iniciar.',
            pointSelected: 'Ponto selecionado no mapa. Pronto para cálculo.',
            calculating: 'Processando estimativa de deslocamento…',
            success: 'Estimativa gerada com sucesso.',
            cleared: 'Marcações removidas do mapa.'
        },
        errors: {
            invalidCoordinates: 'Informe latitude e longitude válidas antes de calcular.',
            requestFailed: 'Não foi possível calcular agora. Verifique a conexão e tente novamente.'
        },
        markerLabels: {
            start: 'Localização inicial',
            destination: 'Localização final (estimada)',
            selected: 'Localização selecionada'
        },
        baseLayers: {
            relief: 'Relevo sombreado (deslizamentos)',
            topo: 'Topográfico',
            streets: 'Ruas (OSM)'
        }
    },
    eng: {
        title: 'Tactical panel for volunteers and search-and-rescue teams',
        subtitle: 'Set a reference point and quickly generate an estimated displacement.',
        languageLabel: 'Select language',
        github: 'Repository',
        panelTitle: 'Incident coordinates',
        panelDescription: 'Use known GPS coordinates or click directly on the map to fill the fields.',
        latitude: 'Latitude',
        longitude: 'Longitude',
        latitudePlaceholder: 'Example: -20.135896',
        longitudePlaceholder: 'Example: -44.123509',
        calculate: 'Calculate estimate',
        calculating: 'Calculating…',
        clearMap: 'Clear markers',
        quickActions: 'Quick actions',
        presets: {
            center: 'Go to operations center',
            north: 'Focus on northern search area',
            south: 'Focus on southern search area'
        },
        cfd: {
            title: 'Flood simulation (simplified CFD)',
            description: 'This module uses an initial fluid-dynamics approximation to project water/tailings direction and reach.',
            step1: 'Primary input: starting coordinate (lat/lng) and available flow scenario in the API.',
            step2: 'Operational output: estimated displacement direction and probable destination for search prioritization.',
            step3: 'Use together with relief/topography layers to validate barriers and access routes.',
            endpointLabel: 'Simulation endpoint',
            note: 'Important: this is initial tactical support and does not replace field engineering validation.'
        },
        statusLabel: 'Status',
        legendTitle: 'Field usage',
        legendItems: {
            click: 'Click the map to define the last known position.',
            flow: 'Use “Calculate estimate” to generate direction and probable destination.',
            hotArea: 'Highlighted hot area to prioritize operations.'
        },
        services: {
            title: 'Operational modules available in the MVP',
            description: 'Shortcuts to services already implemented in the API for search, triage and coordination.',
            items: [
                { name: 'Hotspots', desc: 'Ranking of critical areas for prioritization.' },
                { name: 'Rescue Support', desc: 'Tactical snapshot with agents and probable locations.' },
                { name: 'Searched Areas', desc: 'Registry of areas already inspected by teams.' },
                { name: 'Report Info', desc: 'Reports of missing people and animals.' },
                { name: 'Identify Victim', desc: 'Initial victim identification triage.' }
            ]
        },
        status: {
            idle: 'Waiting for coordinates.',
            pointSelected: 'Map point selected. Ready to calculate.',
            calculating: 'Processing estimated displacement…',
            success: 'Estimate generated successfully.',
            cleared: 'Map markers were removed.'
        },
        errors: {
            invalidCoordinates: 'Please provide valid latitude and longitude before calculating.',
            requestFailed: 'Calculation failed. Check your connection and try again.'
        },
        markerLabels: {
            start: 'Initial location',
            destination: 'Estimated destination',
            selected: 'Selected location'
        },
        baseLayers: {
            relief: 'Shaded relief (landslides)',
            topo: 'Topographic',
            streets: 'Streets (OSM)'
        }
    }
};

var app = new Vue({
    el: '#app',
    data: {
        locale: 'por',
        locales: {
            por: 'Português',
            eng: 'English'
        },
        lat: '-20.135896',
        lng: '-44.123509',
        loading: false,
        statusMessage: i18n.por.status.idle,
        errorMessage: ''
    },
    computed: {
        t: function() {
            return i18n[this.locale];
        }
    },
    methods: {
        calculate: calculate,
        clearMap: clearMap,
        setPreset: setPreset
    },
    watch: {
        locale: function() {
            this.statusMessage = this.t.status.idle;
            this.errorMessage = '';
        }
    }
});

function createMarker(name, point) {
    return L.marker(point).bindPopup(
        '<b>' + name + '</b>' +
        '<br/>Latitude: ' + point.lat +
        '<br/>Longitude: ' + point.lng
    ).addTo(window.overlayGroup);
}

function drawVector(pointA, pointB) {
    createMarker(app.t.markerLabels.start, pointA);
    createMarker(app.t.markerLabels.destination, pointB);

    const line = new L.Polyline([pointA, pointB], {
        color: '#c23a3a',
        weight: 3,
        opacity: 0.8,
        smoothFactor: 1
    }).addTo(window.overlayGroup);

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
                        color: '#c23a3a',
                        weight: 3,
                        opacity: 0.8,
                        smoothFactor: 1
                    }
                })
            }
        ]
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
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(srcPoint)
    });

    if (!result.ok) {
        app.loading = false;
        app.errorMessage = app.t.errors.requestFailed;
        return;
    }

    const data = await result.json();
    const destPoint = new L.LatLng(data.lat, data.lng);
    drawVector(srcPoint, destPoint);
    window.map.panTo(destPoint);
    app.statusMessage = app.t.status.success;
    app.loading = false;
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
    app.errorMessage = '';
}

function initMap() {
    const osmLayer = L.tileLayer.provider('OpenStreetMap.Mapnik');
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

    const baseLayers = {};
    baseLayers[i18n.por.baseLayers.relief] = terrainReliefLayer;
    baseLayers[i18n.por.baseLayers.topo] = topographicLayer;
    baseLayers[i18n.por.baseLayers.streets] = osmLayer;

    L.control.layers(baseLayers, null, {
        collapsed: false,
        position: 'topright'
    }).addTo(map);

    window.overlayGroup = L.layerGroup().addTo(map);

    map.on('click', function(e) {
        app.lat = e.latlng.lat.toFixed(6);
        app.lng = e.latlng.lng.toFixed(6);
        window.overlayGroup.clearLayers();
        const point = new L.LatLng(e.latlng.lat, e.latlng.lng);
        createMarker(app.t.markerLabels.selected, point).openPopup();
        app.statusMessage = app.t.status.pointSelected;
        app.errorMessage = '';
    });

    fetch('/static/geodata/hot_area.json').then(function(response) {
        return response.json();
    }).then(function(data) {
        const areaQuenteLayer = L.geoJSON(data, {
            style: {
                color: '#7d1f1f',
                weight: 2,
                fillOpacity: 0.15
            }
        });
        map.fitBounds(areaQuenteLayer.getBounds());
        areaQuenteLayer.addTo(map);
    });

    return map;
}

document.addEventListener('DOMContentLoaded', function() {
    window.map = initMap();
});
