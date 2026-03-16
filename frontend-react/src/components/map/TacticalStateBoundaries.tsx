import { useEffect, useState, memo } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';

interface TacticalStateBoundariesProps {
  selectedStateId: string | null;
  onStateSelect: (id: string | null) => void;
}

/**
 * Tactical State Boundaries Component
 * Correlates feed data with geographic boundaries in real-time.
 */
export const TacticalStateBoundaries = memo(({ selectedStateId, onStateSelect }: TacticalStateBoundariesProps) => {
  const [geoData, setGeoData] = useState<any>(null);
  const map = useMap();

  useEffect(() => {
    // Parallel fetching of strategic boundaries
    const sources = [
      'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson',
      'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/japan.geojson'
    ];

    Promise.all(sources.map(url => fetch(url).then(r => r.json())))
      .then(datasets => {
        const unified = {
          type: 'FeatureCollection',
          features: datasets.flatMap(d => d.features)
        };
        setGeoData(unified);
      })
      .catch(err => console.error('Strategic Intelligence Failure - Boundaries:', err));
  }, []);


  const onEachFeature = (feature: any, layer: any) => {
    const stateId = feature.id || feature.properties.name;

    layer.on({
      click: (e: any) => {
        const target = e.target;
        onStateSelect(stateId);
        map.fitBounds(target.getBounds(), { padding: [20, 20], duration: 1.0 });
      }
    });
  };

  const geoJsonStyle = (feature: any) => {
    const isSelected = selectedStateId === (feature.id || feature.properties.name);
    return {
      color: isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
      weight: 1,
      fillColor: 'transparent',
      fillOpacity: 0,
    };
  };

  if (!geoData) return null;

  return (
    <GeoJSON 
      key={`geo-static-${selectedStateId}`}
      data={geoData} 
      style={geoJsonStyle}
      onEachFeature={onEachFeature}
    />
  );
});
