import React from 'react';
import { Polyline, Popup } from 'react-leaflet';

interface DirectRouteProps {
  start: [number, number]; // [lat, lng]
  end: [number, number];   // [lat, lng]
  color: string;
  categoria: string;
  cuadrillaName?: string;
}

const DirectRoute: React.FC<DirectRouteProps> = ({ 
  start, 
  end, 
  color, 
  categoria, 
  cuadrillaName
}) => {
  // Calcular distancia directa usando Haversine
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distance = calculateDistance(start[0], start[1], end[0], end[1]);
  const distanceKm = distance.toFixed(2);

  console.log(`✅ Renderizando línea directa para categoría ${categoria}: ${distanceKm}km`);

  return (
    <Polyline
      positions={[start, end]}
      pathOptions={{
        color: color,
        weight: 4,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: categoria === 'A' ? undefined : categoria === 'B' ? '10, 5' : '5, 10' // Diferentes estilos por categoría
      }}
    >
      <Popup>
        <div style={{ minWidth: '200px' }}>
          <strong>Ruta Categoría {categoria}</strong>
          {cuadrillaName && (
            <div><strong>Cuadrilla:</strong> {cuadrillaName}</div>
          )}
          <div><strong>Distancia directa:</strong> {distanceKm} km</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            📏 Línea directa punto inicial → punto final
          </div>
        </div>
      </Popup>
    </Polyline>
  );
};

export default DirectRoute;