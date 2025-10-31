// Servicio de rutas REAL (con routing por calles)
// Usa OpenRouteService para obtener rutas reales por calles como Uber

export interface RouteResult {
  cuadrillaId: number;
  cuadrillaCodigo: string;
  cuadrillaNombre: string;
  distanciaKm: number;
  tiempoMinutos: number;
  tiempoConTrafico: number;
  ruta: [number, number][]; // Coordenadas de la ruta
  categoria?: string; // A, B, o C
}

export interface CategoryRouteResult {
  categoria: string;
  cuadrillaId: number;
  cuadrillaCodigo: string;
  cuadrillaNombre: string;
  distanciaKm: number;
  tiempoMinutos: number;
  tiempoConTrafico: number;
  ruta: [number, number][];
  color: string; // Color de la línea para esta categoría
}

export interface TrafficRouteService {
  calculateBestRoute(
    ticketLat: number, 
    ticketLng: number, 
    cuadrillas: Array<{
      id: number;
      codigo: string;
      nombre: string;
      latitud: number;
      longitud: number;
    }>
  ): Promise<RouteResult[]>;
  
  calculateBestRouteByCategory(
    ticketLat: number,
    ticketLng: number,
    cuadrillas: Array<{
      id: number;
      codigo: string;
      nombre: string;
      latitud: number;
      longitud: number;
      categoria?: string;
    }>
  ): Promise<CategoryRouteResult[]>;
}

class LocalRouteService implements TrafficRouteService {
  
  // Usar OpenRouteService para obtener rutas reales por calles
  private async getRealRouteFromAPI(startLng: number, startLat: number, endLng: number, endLat: number): Promise<[number, number][] | null> {
    try {
      // API Key gratuita de OpenRouteService (reemplaza con tu propia key)
      const API_KEY = '5b3ce3597851110001cf62481a4a7c38540a4052b5e82c9a8e3a6f23';
      
      const url = `https://api.openrouteservice.org/v2/directions/driving-car`;
      
      const requestBody = {
        coordinates: [[startLng, startLat], [endLng, endLat]],
        format: "geojson",
        instructions: false,
        geometry_simplify: false
      };
      
      console.log(`🚗 Obteniendo ruta real desde [${startLat}, ${startLng}] hasta [${endLat}, ${endLng}]`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        console.warn(`⚠️ OpenRouteService error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.features && data.features[0] && data.features[0].geometry) {
        const coordinates = data.features[0].geometry.coordinates;
        console.log(`✅ Ruta real obtenida: ${coordinates.length} puntos`);
        return coordinates; // Ya está en formato [lng, lat]
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Error obteniendo ruta real:', error);
      return null;
    }
  }

  async calculateBestRoute(
    ticketLat: number,
    ticketLng: number,
    cuadrillas: Array<{
      id: number;
      codigo: string;
      nombre: string;
      latitud: number;
      longitud: number;
    }>
  ): Promise<RouteResult[]> {
    
    const results: RouteResult[] = [];
    
    console.log(`🚗 Calculando rutas locales para ${cuadrillas.length} cuadrillas...`);
    
    // Calcular para cada cuadrilla
    for (const cuadrilla of cuadrillas) {
      try {
        // Distancia directa (haversine) en km
        const distanciaDirecta = this.calculateDistance(
          cuadrilla.latitud, cuadrilla.longitud,
          ticketLat, ticketLng
        );
        
        // Distancia estimada por carretera (factor de detour urbano)
        const factorDetour = this.getDetourFactor(distanciaDirecta, cuadrilla.latitud, cuadrilla.longitud, ticketLat, ticketLng);
        let distanciaKm = distanciaDirecta * factorDetour;
        
        // Tiempo base estimado (considerando velocidades urbanas)
        let tiempoBase = this.calculateTravelTime(distanciaKm, cuadrilla.latitud, cuadrilla.longitud, ticketLat, ticketLng);
        
        // Factor de tráfico basado en hora del día y ubicación
        const factorTrafico = this.getTrafficFactor();
        
        // Intentar obtener ruta real por calles (como Uber)
        let ruta: [number, number][] = [];
        
        const rutaReal = await this.getRealRouteFromAPI(
          cuadrilla.longitud, cuadrilla.latitud,
          ticketLng, ticketLat
        );
        
        if (rutaReal && rutaReal.length > 2) {
          // Usar ruta real obtenida de la API
          ruta = rutaReal;
          
          // Recalcular distancia usando la ruta real
          const distanciaReal = this.calculateRouteDistance(rutaReal);
          if (distanciaReal > 0) {
            distanciaKm = distanciaReal;
            tiempoBase = this.calculateTravelTime(distanciaKm, cuadrilla.latitud, cuadrilla.longitud, ticketLat, ticketLng);
          }
          
          console.log(`🗺️ Usando ruta REAL para ${cuadrilla.codigo}: ${rutaReal.length} puntos, ${distanciaKm.toFixed(2)}km`);
        } else {
          // Fallback: ruta estimada si la API falla
          ruta = this.generateRoutePoints(
            cuadrilla.longitud, cuadrilla.latitud,
            ticketLng, ticketLat,
            distanciaDirecta
          );
          console.log(`⚠️ Usando ruta ESTIMADA para ${cuadrilla.codigo} (API falló)`);
        }
        
        // Calcular tiempo final con tráfico
        const tiempoConTrafico = tiempoBase * factorTrafico;
        
        results.push({
          cuadrillaId: cuadrilla.id,
          cuadrillaCodigo: cuadrilla.codigo,
          cuadrillaNombre: cuadrilla.nombre || '',
          distanciaKm,
          tiempoMinutos: tiempoBase,
          tiempoConTrafico,
          ruta
        });
        
      } catch (error) {
        console.error(`Error calculando ruta para cuadrilla ${cuadrilla.codigo}:`, error);
      }
    }
    
    // Ordenar por tiempo con tráfico (más rápido primero)
    const sortedResults = results.sort((a, b) => a.tiempoConTrafico - b.tiempoConTrafico);
    
    console.log(`✅ Rutas calculadas. Más rápida: ${sortedResults[0]?.cuadrillaCodigo} (${sortedResults[0]?.tiempoConTrafico.toFixed(1)} min)`);
    
    return sortedResults;
  }

  // Calcula la MEJOR ruta de cada categoría (A, B, C) - una línea por categoría disponible
  async calculateBestRouteByCategory(
    ticketLat: number,
    ticketLng: number,
    cuadrillas: Array<{
      id: number;
      codigo: string;
      nombre: string;
      latitud: number;
      longitud: number;
      categoria?: string;
    }>
  ): Promise<CategoryRouteResult[]> {
    
    console.log(`🎯 Calculando MEJOR ruta por categoría para ${cuadrillas.length} cuadrillas...`);
    
    // Colores para cada categoría
    const categoryColors = {
      'A': '#007bff', // Azul
      'B': '#28a745', // Verde  
      'C': '#dc3545'  // Rojo (más visible que blanco)
    };
    
    const results: CategoryRouteResult[] = [];
    
    // Agrupar cuadrillas por categoría
    const cuadrillasPorCategoria = {
      'A': cuadrillas.filter(c => c.categoria === 'A'),
      'B': cuadrillas.filter(c => c.categoria === 'B'), 
      'C': cuadrillas.filter(c => c.categoria === 'C')
    };
    
    // Calcular la MEJOR ruta de cada categoría
    for (const [categoria, cuadrillasCategoria] of Object.entries(cuadrillasPorCategoria)) {
      if (cuadrillasCategoria.length === 0) continue;
      
      console.log(`📍 Procesando categoría ${categoria}: ${cuadrillasCategoria.length} cuadrillas`);
      
      // Calcular rutas para todas las cuadrillas de esta categoría
      const rutasCategoria = await this.calculateBestRoute(ticketLat, ticketLng, cuadrillasCategoria);
      
      if (rutasCategoria.length > 0) {
        // Tomar SOLO la más rápida de esta categoría
        const mejorRuta = rutasCategoria[0];
        
        results.push({
          categoria,
          cuadrillaId: mejorRuta.cuadrillaId,
          cuadrillaCodigo: mejorRuta.cuadrillaCodigo,
          cuadrillaNombre: mejorRuta.cuadrillaNombre,
          distanciaKm: mejorRuta.distanciaKm,
          tiempoMinutos: mejorRuta.tiempoMinutos,
          tiempoConTrafico: mejorRuta.tiempoConTrafico,
          ruta: mejorRuta.ruta,
          color: categoryColors[categoria as keyof typeof categoryColors]
        });
        
        console.log(`✅ MEJOR de categoría ${categoria}: ${mejorRuta.cuadrillaCodigo} (${mejorRuta.tiempoConTrafico.toFixed(1)} min)`);
      }
    }
    
    // Ordenar por tiempo (más rápido primero)
    const sortedResults = results.sort((a, b) => a.tiempoConTrafico - b.tiempoConTrafico);
    
    console.log(`🏆 MEJORES por categoría calculadas: ${results.length} rutas (una por categoría)`);
    
    return sortedResults;
  }

  // Calcula la distancia real de una ruta por sus puntos
  private calculateRouteDistance(route: [number, number][]): number {
    if (route.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const [lng1, lat1] = route[i];
      const [lng2, lat2] = route[i + 1];
      totalDistance += this.calculateDistance(lat1, lng1, lat2, lng2);
    }
    
    return totalDistance;
  }

  // Calcula distancia haversine entre dos puntos geográficos
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  // Calcula tiempo de viaje estimado basado en ubicación urbana
  private calculateTravelTime(distanciaKm: number, lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Velocidades promedio en Lima según tipo de zona
    let velocidadPromedio = 25; // km/h por defecto (urbano normal)
    
    // Detectar si está en zona céntrica de Lima (más congestionada)
    const esCentroLima = this.isInLimaCentro(lat1, lon1) || this.isInLimaCentro(lat2, lon2);
    
    if (esCentroLima) {
      velocidadPromedio = 15; // km/h (centro muy congestionado)
    } else if (distanciaKm > 10) {
      velocidadPromedio = 35; // km/h (vías más rápidas para distancias largas)
    } else if (distanciaKm < 2) {
      velocidadPromedio = 20; // km/h (calles locales)
    }
    
    // Tiempo en minutos
    const tiempoMinutos = (distanciaKm / velocidadPromedio) * 60;
    
    return tiempoMinutos;
  }

  // Detecta si está en el centro de Lima (zona más congestionada)
  private isInLimaCentro(lat: number, lng: number): boolean {
    // Área aproximada del centro histórico de Lima
    const centroLima = {
      norte: -12.0300,
      sur: -12.0700,
      este: -77.0200,
      oeste: -77.0500
    };
    
    return lat >= centroLima.sur && lat <= centroLima.norte &&
           lng >= centroLima.oeste && lng <= centroLima.este;
  }

  // Calcula factor de detour (cuánto más larga es la ruta real vs línea recta)
  private getDetourFactor(distanciaDirecta: number, lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Factor base urbano (las calles no son líneas rectas)
    let factor = 1.3; // 30% más larga que línea recta por defecto
    
    // En centro de Lima: más serpenteante debido a calles coloniales
    const origenEnCentro = this.isInLimaCentro(lat1, lng1);
    const destinoEnCentro = this.isInLimaCentro(lat2, lng2);
    
    if (origenEnCentro || destinoEnCentro) {
      factor = 1.5; // 50% más larga en centro histórico
    }
    
    // Para distancias muy cortas: menos detour
    if (distanciaDirecta < 1) {
      factor = 1.2; // Solo 20% más para distancias cortas
    }
    
    // Para distancias largas: pueden usar vías más directas
    if (distanciaDirecta > 15) {
      factor = 1.25; // 25% más para distancias largas (autopistas)
    }
    
    return factor;
  }

  // Factor de tráfico basado en hora del día
  private getTrafficFactor(): number {
    const ahora = new Date();
    const hora = ahora.getHours();
    const diaDeLaSemana = ahora.getDay(); // 0 = domingo, 6 = sábado
    
    // Fines de semana: menos tráfico
    if (diaDeLaSemana === 0 || diaDeLaSemana === 6) {
      return 1.1; // 10% más lento que ideal
    }
    
    // Horas pico en Lima (días laborales)
    if ((hora >= 7 && hora <= 9) || (hora >= 18 && hora <= 20)) {
      return 1.8; // 80% más lento (hora pico)
    } else if ((hora >= 12 && hora <= 14) || (hora >= 16 && hora <= 18)) {
      return 1.4; // 40% más lento (tráfico moderado)
    } else if (hora >= 22 || hora <= 6) {
      return 0.9; // 10% más rápido (madrugada)
    }
    
    return 1.2; // 20% más lento que ideal (tráfico normal)
  }

  // Principales avenidas y calles de Lima (coordenadas aproximadas para ruteo realista)
  private readonly limaMainRoads = [
    // Avenidas principales Norte-Sur
    { name: "Av. Arequipa", lat: -12.0464, lng: -77.0428, type: "north-south" },
    { name: "Av. Brasil", lat: -12.0464, lng: -77.0528, type: "north-south" },
    { name: "Av. Universitaria", lat: -12.0464, lng: -77.0828, type: "north-south" },
    { name: "Av. Abancay", lat: -12.0464, lng: -77.0328, type: "north-south" },
    { name: "Av. Tacna", lat: -12.0464, lng: -77.0378, type: "north-south" },
    
    // Avenidas principales Este-Oeste
    { name: "Av. Javier Prado", lat: -12.0864, lng: -77.0428, type: "east-west" },
    { name: "Av. Salaverry", lat: -12.0764, lng: -77.0428, type: "east-west" },
    { name: "Av. La Marina", lat: -12.0664, lng: -77.0428, type: "east-west" },
    { name: "Av. Venezuela", lat: -12.0364, lng: -77.0428, type: "east-west" },
    { name: "Av. Colonial", lat: -12.0564, lng: -77.0428, type: "east-west" },
    
    // Vías de acceso importantes
    { name: "Panamericana Norte", lat: -12.0264, lng: -77.0628, type: "highway" },
    { name: "Panamericana Sur", lat: -12.1264, lng: -77.0328, type: "highway" },
    { name: "Via Expresa", lat: -12.0864, lng: -77.0328, type: "highway" }
  ];

  // Genera puntos de ruta que siguen avenidas principales reales de Lima
  private generateRoutePoints(startLng: number, startLat: number, endLng: number, endLat: number, distance: number): [number, number][] {
    const points: [number, number][] = [];
    
    // Punto de inicio
    points.push([startLng, startLat]);
    
    // Para distancias muy cortas: línea más directa con pequeño ajuste
    if (distance < 0.5) {
      const midLng = (startLng + endLng) / 2;
      const midLat = (startLat + endLat) / 2;
      points.push([midLng + 0.001, midLat + 0.001]); // Pequeña desviación
      points.push([endLng, endLat]);
      return points;
    }
    
    // Buscar avenidas cercanas para crear ruta realista
    const nearbyRoads = this.findNearbyRoads(startLat, startLng, endLat, endLng);
    
    if (nearbyRoads.length > 0) {
      // Usar avenidas reales para crear la ruta
      return this.createRoadBasedRoute(startLng, startLat, endLng, endLat, nearbyRoads);
    } else {
      // Fallback: ruta en forma de L siguiendo patrones urbanos
      return this.createGridBasedRoute(startLng, startLat, endLng, endLat, distance);
    }
  }

  // Encuentra avenidas cercanas a la ruta
  private findNearbyRoads(startLat: number, startLng: number, endLat: number, endLng: number) {
    const routeCenter = {
      lat: (startLat + endLat) / 2,
      lng: (startLng + endLng) / 2
    };
    
    return this.limaMainRoads.filter(road => {
      const distance = this.calculateDistance(routeCenter.lat, routeCenter.lng, road.lat, road.lng);
      return distance < 5; // Avenidas dentro de 5km del centro de la ruta
    }).sort((a, b) => {
      const distA = this.calculateDistance(routeCenter.lat, routeCenter.lng, a.lat, a.lng);
      const distB = this.calculateDistance(routeCenter.lat, routeCenter.lng, b.lat, b.lng);
      return distA - distB;
    });
  }

  // Crea ruta basada en avenidas reales
  private createRoadBasedRoute(startLng: number, startLat: number, endLng: number, endLat: number, roads: any[]): [number, number][] {
    const points: [number, number][] = [[startLng, startLat]];
    
    const deltaLng = endLng - startLng;
    const deltaLat = endLat - startLat;
    
    // Seleccionar avenida principal para la ruta
    const mainRoad = roads[0];
    
    // Punto 1: Hacia la avenida principal (25% del camino)
    const toRoadLng = startLng + deltaLng * 0.25;
    const toRoadLat = startLat + deltaLat * 0.15;
    // Ajustar hacia la avenida real
    const adjustedLng1 = toRoadLng + (mainRoad.lng - toRoadLng) * 0.3;
    const adjustedLat1 = toRoadLat + (mainRoad.lat - toRoadLat) * 0.3;
    points.push([adjustedLng1, adjustedLat1]);
    
    // Punto 2: Siguiendo la avenida (50% del camino)
    let roadLng, roadLat;
    if (mainRoad.type === "north-south") {
      roadLng = mainRoad.lng + (deltaLng * 0.2); // Ligero ajuste
      roadLat = startLat + deltaLat * 0.5;
    } else if (mainRoad.type === "east-west") {
      roadLng = startLng + deltaLng * 0.5;
      roadLat = mainRoad.lat + (deltaLat * 0.2); // Ligero ajuste
    } else { // highway
      roadLng = startLng + deltaLng * 0.4;
      roadLat = startLat + deltaLat * 0.4;
    }
    points.push([roadLng, roadLat]);
    
    // Punto 3: Continuando en la avenida (75% del camino)
    const road2Lng = roadLng + deltaLng * 0.25;
    const road2Lat = roadLat + deltaLat * 0.25;
    points.push([road2Lng, road2Lat]);
    
    // Punto 4: Saliendo de la avenida hacia destino (90% del camino)
    const exitLng = startLng + deltaLng * 0.9;
    const exitLat = startLat + deltaLat * 0.9;
    points.push([exitLng, exitLat]);
    
    // Punto final
    points.push([endLng, endLat]);
    
    return points;
  }

  // Ruta en cuadrícula urbana (fallback)
  private createGridBasedRoute(startLng: number, startLat: number, endLng: number, endLat: number, distance: number): [number, number][] {
    const points: [number, number][] = [[startLng, startLat]];
    
    const deltaLng = endLng - startLng;
    const deltaLat = endLat - startLat;
    
    // Crear ruta que simule cuadrícula urbana (calles perpendiculares)
    const gridSize = 0.005; // Aprox 500m entre calles
    
    // Ir principalmente en una dirección, luego en la otra (patrón L)
    if (Math.abs(deltaLng) > Math.abs(deltaLat)) {
      // Ir principalmente horizontal primero
      
      // 40% horizontal
      points.push([startLng + deltaLng * 0.4, startLat + deltaLat * 0.1]);
      
      // 70% horizontal, empezar vertical
      points.push([startLng + deltaLng * 0.7, startLat + deltaLat * 0.3]);
      
      // 90% horizontal, más vertical
      points.push([startLng + deltaLng * 0.9, startLat + deltaLat * 0.7]);
      
    } else {
      // Ir principalmente vertical primero
      
      // 40% vertical
      points.push([startLng + deltaLng * 0.1, startLat + deltaLat * 0.4]);
      
      // 70% vertical, empezar horizontal
      points.push([startLng + deltaLng * 0.3, startLat + deltaLat * 0.7]);
      
      // 90% vertical, más horizontal
      points.push([startLng + deltaLng * 0.7, startLat + deltaLat * 0.9]);
    }
    
    // Punto final
    points.push([endLng, endLat]);
    
    return points;
  }
}

export const routeService = new LocalRouteService();