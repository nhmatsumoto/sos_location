import { TileLayer } from 'react-leaflet';

export function BaseLayers() {
  return (
    <>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
      <TileLayer attribution='Topography by OpenTopoMap (SRTM)' url='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' opacity={0.4} />
    </>
  );
}
