import React from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { useRealRoute } from '../../hooks/useRealRoute';

interface RealStreetRouteProps {
  start: [number, number]; // [lat, lng]
  end: [number, number];   // [lat, lng]
  color: string;
  categoria: string;
  cuadrillaName?: string;
  onRouteCalculated?: (route: any) => void;
}

const RealStreetRoute: React.FC<RealStreetRouteProps> = ({ 
  start, 
  end, 
  color, 
  categoria, 
  cuadrillaName,
  onRouteCalculated 
}) => {
  const { route, loading } = useRealRoute(start, end);

  // Notificar cuando la ruta esté calculada
  React.useEffect(() => {
    if (route && onRouteCalculated) {
      onRouteCalculated({
        categoria,
        distance: route.distance,
        duration: route.duration,
        coordinates: route.coordinates,
        cuadrillaName
      });
    }
  }, [route, onRouteCalculated, categoria, cuadrillaName]);

  if (loading) {
    console.log(`🔄 Calculando ruta REAL para categoría ${categoria}...`);
    // Mostrar una línea punteada temporal mientras se carga la ruta real
    return (
      <Polyline
        positions={[start, end]}
        pathOptions={{
          color: color,
          weight: 2,
          opacity: 0.4,
          dashArray: '5, 5'
        }}
      >
        <Popup>
          <div>
            <strong>Calculando ruta categoría {categoria}...</strong>
            <br />
            <small>🔄 Obteniendo ruta siguiendo calles reales</small>
          </div>
        </Popup>
      </Polyline>
    );
  }

  if (!route || !route.success || route.coordinates.length === 0) {
    console.log(`❌ No se pudo calcular ruta REAL para categoría ${categoria}, usando ruta directa`);
    // Fallback: mostrar línea directa si no se puede obtener ruta real
    return (
      <Polyline
        positions={[start, end]}
        pathOptions={{
          color: color,
          weight: 3,
          opacity: 0.6,
          dashArray: '10, 5'
        }}
      >
        <Popup>
          <div>
            <strong>Ruta Categoría {categoria}</strong>
            {cuadrillaName && (
              <div><strong>Cuadrilla:</strong> {cuadrillaName}</div>
            )}
            <div style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '8px' }}>
              ⚠️ Ruta directa (servicio de calles no disponible)
            </div>
          </div>
        </Popup>
      </Polyline>
    );
  }

  // Convertir coordenadas al formato esperado por Polyline
  const polylinePositions: [number, number][] = route.coordinates.map(coord => [coord.lat, coord.lng]);

  // Preparar información para el popup
  const distanceKm = (route.distance / 1000).toFixed(2);
  const durationMin = Math.round(route.duration / 60);

  console.log(`✅ Renderizando ruta REAL para categoría ${categoria}: ${distanceKm}km, ${durationMin}min, ${polylinePositions.length} puntos`);

  return (
    <>
      <Polyline
        positions={polylinePositions}
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
            <div><strong>Distancia:</strong> {distanceKm} km</div>
            <div><strong>Tiempo estimado:</strong> {durationMin} min</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              {route.error ? (
                <span style={{ color: '#ff6b6b' }}>⚠️ {route.error}</span>
              ) : (
                <span style={{ color: '#51cf66' }}>✅ Ruta siguiendo calles reales</span>
              )}
            </div>
          </div>
        </Popup>
      </Polyline>
    </>
  );
};

export default RealStreetRoute;