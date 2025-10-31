import { useEffect, useState } from 'react';
import { Polyline } from 'react-leaflet';

interface RealRouteProps {
  start: [number, number]; // [lat, lng]
  end: [number, number];   // [lat, lng]
  color: string;
  onRouteFound?: (route: any) => void;
}

const RealRoute: React.FC<RealRouteProps> = ({ start, end, color, onRouteFound }) => {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  // Función para calcular distancia entre dos puntos
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Generar ruta simulando calles principales de Lima
  const generateRealisticRoute = (startCoord: [number, number], endCoord: [number, number]): [number, number][] => {
    const points: [number, number][] = [startCoord];
    
    const [startLat, startLng] = startCoord;
    const [endLat, endLng] = endCoord;
    
    const deltaLat = endLat - startLat;
    const deltaLng = endLng - startLng;
    const distance = calculateDistance(startLat, startLng, endLat, endLng);
    
    // Crear más puntos para rutas más largas
    const numPoints = Math.max(3, Math.min(15, Math.floor(distance * 2)));
    
    // Simular ruta siguiendo patrón urbano (como avenidas principales)
    for (let i = 1; i < numPoints; i++) {
      const progress = i / numPoints;
      
      // Ruta base interpolada
      const baseLat = startLat + deltaLat * progress;
      const baseLng = startLng + deltaLng * progress;
      
      // Agregar desviación que simula seguir calles principales
      let deviationLat = 0;
      let deviationLng = 0;
      
      // Simular patrones de calles urbanas
      if (progress < 0.3) {
        // Primera parte: seguir avenida principal hacia el este/oeste
        deviationLng += deltaLng > 0 ? distance * 0.05 * Math.sin(progress * Math.PI) : -distance * 0.05 * Math.sin(progress * Math.PI);
      } else if (progress < 0.7) {
        // Parte media: transición hacia norte/sur
        deviationLat += deltaLat > 0 ? distance * 0.03 * Math.sin(progress * Math.PI * 2) : -distance * 0.03 * Math.sin(progress * Math.PI * 2);
        deviationLng += deltaLng > 0 ? distance * 0.02 * Math.cos(progress * Math.PI) : -distance * 0.02 * Math.cos(progress * Math.PI);
      } else {
        // Última parte: aproximación al destino
        deviationLat += deltaLat > 0 ? distance * 0.02 * (1 - progress) : -distance * 0.02 * (1 - progress);
      }
      
      // Aplicar desviaciones pero mantener dentro de límites realistas
      const finalLat = baseLat + Math.max(-0.005, Math.min(0.005, deviationLat));
      const finalLng = baseLng + Math.max(-0.005, Math.min(0.005, deviationLng));
      
      points.push([finalLat, finalLng]);
    }
    
    points.push(endCoord);
    return points;
  };

  useEffect(() => {
    console.log(`🛣️ Generando ruta desde [${start[0]}, ${start[1]}] hasta [${end[0]}, ${end[1]}]`);
    
    // Generar ruta realista sin APIs externas
    const route = generateRealisticRoute(start, end);
    setRouteCoordinates(route);
    
    // Calcular métricas de la ruta
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += calculateDistance(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
    }
    
    if (onRouteFound) {
      onRouteFound({
        distance: totalDistance * 1000, // en metros
        duration: (totalDistance / 25) * 3600, // estimación: 25 km/h promedio en ciudad
        coordinates: route
      });
    }
    
    console.log(`✅ Ruta generada: ${route.length} puntos, ${totalDistance.toFixed(2)}km`);
  }, [start, end, onRouteFound]);

  if (routeCoordinates.length === 0) return null;

  return (
    <Polyline
      positions={routeCoordinates}
      pathOptions={{
        color: color,
        weight: 5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }}
    />
  );
};

export default RealRoute;