import React from 'react';
import { Polyline, Popup } from 'react-leaflet';

interface ComputedRouteProps {
  routeData: {
    categoria: string;
    cuadrillaCodigo: string;
    cuadrillaNombre: string;
    distanciaKm: number;
    tiempoMinutos: number;
    tiempoConTrafico: number;
    ruta: [number, number][]; // Coordenadas ya calculadas por COMPUTE ROUTER
    color: string;
  };
}

const ComputedRoute: React.FC<ComputedRouteProps> = ({ routeData }) => {
  const { categoria, cuadrillaCodigo, cuadrillaNombre, distanciaKm, tiempoConTrafico, ruta, color } = routeData;

  // Verificar que tenemos una ruta válida
  if (!ruta || ruta.length < 2) {
    console.warn(`⚠️ Ruta inválida para categoría ${categoria}: ${ruta?.length || 0} puntos`);
    return null;
  }

  console.log(`🗺️ [ComputedRoute] Renderizando ruta categoría ${categoria}:`, {
    cuadrilla: cuadrillaCodigo,
    puntos: ruta.length,
    distancia: `${distanciaKm.toFixed(2)}km`,
    tiempo: `${tiempoConTrafico.toFixed(1)}min`,
    color
  });

  return (
    <Polyline
      positions={ruta}
      pathOptions={{
        color: color,
        weight: 5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
        // Diferentes estilos por categoría
        dashArray: categoria === 'A' ? undefined : categoria === 'B' ? '10, 5' : '5, 10'
      }}
    >
      <Popup>
        <div style={{ minWidth: '250px', fontSize: '12px' }}>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '14px', 
            color: color,
            marginBottom: '8px',
            borderBottom: `2px solid ${color}`,
            paddingBottom: '4px'
          }}>
            🚗 Ruta Categoría {categoria}
          </div>
          
          <div style={{ marginBottom: '6px' }}>
            <strong>Cuadrilla:</strong> {cuadrillaCodigo}
            {cuadrillaNombre && cuadrillaNombre !== cuadrillaCodigo && (
              <div style={{ fontSize: '11px', color: '#666' }}>
                {cuadrillaNombre}
              </div>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#007bff' }}>⏱️ Tiempo</div>
              <div>{tiempoConTrafico.toFixed(1)} min</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#28a745' }}>📏 Distancia</div>
              <div>{distanciaKm.toFixed(2)} km</div>
            </div>
          </div>
          
          <div style={{ 
            fontSize: '10px', 
            color: '#666', 
            borderTop: '1px solid #eee', 
            paddingTop: '6px',
            textAlign: 'center'
          }}>
            🖥️ Ruta calculada por COMPUTE ROUTER<br/>
            {ruta.length} puntos de navegación
          </div>
        </div>
      </Popup>
    </Polyline>
  );
};

export default ComputedRoute;