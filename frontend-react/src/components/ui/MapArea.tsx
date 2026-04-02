import { useState, useEffect } from 'react';
import { Circle, GeoJSON } from 'react-leaflet';
import axios from 'axios';
import type { GeoJsonObject } from 'geojson';

interface NominatimReverseResponse {
  geojson?: GeoJsonObject;
}

interface MapAreaProps {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  polygon?: unknown;
}

// Simple global cache for boundaries to avoid redundant fetches across re-renders/components
const boundaryCache = new Map<string, GeoJsonObject>();

const isGeoJsonBoundary = (value: unknown): value is GeoJsonObject => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { type?: unknown };
  return typeof candidate.type === 'string';
};

export function MapArea({ id, latitude, longitude, category, polygon }: MapAreaProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [boundary, setBoundary] = useState<GeoJsonObject | null>(isGeoJsonBoundary(polygon) ? polygon : null);
  const [isLoadingBoundary, setIsLoadingBoundary] = useState(false);
  const styles = getCategoryStyles(category);

  useEffect(() => {
    if (isGeoJsonBoundary(polygon)) {
      setBoundary(polygon);
      return;
    }

    const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    
    if (boundaryCache.has(cacheKey)) {
      const cachedBoundary = boundaryCache.get(cacheKey);
      if (cachedBoundary) {
        setBoundary(cachedBoundary);
      }
      return;
    }

    const fetchBoundary = async () => {
      setIsLoadingBoundary(true);
      try {
        // Fetch regional boundary (city level) using Nominatim reverse geocoding
        // zoom=10 typically targets the city/municipality level
        const response = await axios.get<NominatimReverseResponse>('https://nominatim.openstreetmap.org/reverse', {
          params: {
            format: 'json',
            lat: latitude,
            lon: longitude,
            zoom: 10,
            polygon_geojson: 1
          }
        });

        if (response.data && response.data.geojson) {
          boundaryCache.set(cacheKey, response.data.geojson);
          setBoundary(response.data.geojson);
        }
      } catch (err) {
        console.warn(`[MapArea] Boundary fetch failed for ${latitude},${longitude}`, err);
      } finally {
        setIsLoadingBoundary(false);
      }
    };

    const timer = setTimeout(fetchBoundary, 500); // Debounce to avoid hitting rate limits during panning
    return () => clearTimeout(timer);
  }, [latitude, longitude, polygon]);

  // If we have a boundary, render GeoJSON
  if (boundary) {
    return (
      <GeoJSON
        key={`boundary-${id}-${latitude}-${longitude}`}
        data={boundary}
        pathOptions={{
          color: isHovered ? '#fff' : styles.color,
          fillColor: styles.color,
          fillOpacity: isHovered ? styles.opacity + 0.25 : styles.opacity + 0.1,
          weight: isHovered ? 2 : 1,
          className: `${styles.className} transition-all duration-300`,
        }}
        eventHandlers={{
          mouseover: () => setIsHovered(true),
          mouseout: () => setIsHovered(false),
        }}
      />
    );
  }

  // Fallback to circle while loading or if fetch fails
  return (
    <Circle
      key={`area-${id}`}
      center={[latitude, longitude]}
      radius={isLoadingBoundary ? styles.radius / 2 : styles.radius}
      pathOptions={{
        color: isHovered ? '#fff' : styles.color,
        fillColor: styles.color,
        fillOpacity: isHovered ? styles.opacity + 0.2 : styles.opacity,
        weight: isHovered ? 4 : 1,
        dashArray: isLoadingBoundary ? "5, 5" : "none", // Visual cue for loading
        className: `${styles.className} transition-all duration-300`,
      }}
      eventHandlers={{
        mouseover: () => setIsHovered(true),
        mouseout: () => setIsHovered(false),
      }}
    />
  );
}

const getCategoryStyles = (category: string) => {
  const cat = category.toLowerCase();
  switch (cat) {
    case 'flood':
    case 'enchente':
      return { color: '#3182ce', radius: 15000, opacity: 0.1, className: '' };
    case 'earthquake':
    case 'terremoto':
      return { color: '#e53e3e', radius: 40000, opacity: 0.15, className: '' };
    case 'wildfire':
    case 'incêndio':
      return { color: '#ed8936', radius: 10000, opacity: 0.1, className: '' };
    case 'tsunami':
      return { color: '#319795', radius: 50000, opacity: 0.15, className: '' };
    case 'storm':
    case 'tempestade':
    case 'hurricane':
    case 'furação':
    case 'cyclone':
      return { color: '#805ad5', radius: 35000, opacity: 0.15, className: '' };
    case 'weather':
    case 'clima':
    case 'rain':
    case 'chuva':
      return { color: '#63b3ed', radius: 12000, opacity: 0.1, className: '' };
    case 'war':
    case 'conflict':
    case 'guerra':
      return { color: '#FF0000', radius: 30000, opacity: 0.18, className: 'tactical-pulse' };
    case 'humanitarian':
    case 'crise':
      return { color: '#ECC94B', radius: 20000, opacity: 0.12, className: '' };
    case 'heat':
    case 'calor':
      return { color: '#DD6B20', radius: 25000, opacity: 0.18, className: '' };
    default:
      return { color: 'rgba(255,255,255,0.4)', radius: 20000, opacity: 0.05, className: '' };
  }
};
