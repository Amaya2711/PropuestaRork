// Servicio de routing real usando OSRM (Open Source Routing Machine)
// Utiliza calles reales para generar rutas como Uber/Google Maps

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResponse {
  coordinates: RoutePoint[];
  distance: number; // en metros
  duration: number; // en segundos
  success: boolean;
  error?: string;
}

class RealRoutingService {
  private osrmBaseUrl = 'https://router.project-osrm.org';
  
  /**
   * Obtiene una ruta real usando OSRM que sigue las calles
   */
  async getRoute(start: [number, number], end: [number, number]): Promise<RouteResponse> {
    try {
      const [startLat, startLng] = start;
      const [endLat, endLng] = end;
      
      // Construir URL para OSRM (formato: lng,lat no lat,lng)
      const url = `${this.osrmBaseUrl}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      
      console.log('🛣️ Solicitando ruta real a OSRM:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No se encontró ruta válida');
      }
      
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map((coord: [number, number]) => ({
        lat: coord[1], // OSRM devuelve [lng, lat], necesitamos [lat, lng]
        lng: coord[0]
      }));
      
      console.log(`✅ Ruta OSRM obtenida: ${coordinates.length} puntos, ${(route.distance/1000).toFixed(2)}km, ${Math.round(route.duration/60)}min`);
      
      return {
        coordinates,
        distance: route.distance,
        duration: route.duration,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo ruta OSRM:', error);
      
      // Fallback: generar ruta directa simple
      return this.getFallbackRoute(start, end);
    }
  }
  
  /**
   * Fallback: ruta directa cuando OSRM falla
   */
  private getFallbackRoute(start: [number, number], end: [number, number]): RouteResponse {
    console.log('🔄 Usando ruta fallback (línea directa)');
    
    const coordinates = [
      { lat: start[0], lng: start[1] },
      { lat: end[0], lng: end[1] }
    ];
    
    // Calcular distancia aproximada usando Haversine
    const distance = this.calculateHaversineDistance(start[0], start[1], end[0], end[1]) * 1000; // metros
    const duration = (distance / 1000) / 25 * 3600; // 25 km/h promedio = segundos
    
    return {
      coordinates,
      distance,
      duration,
      success: true,
      error: 'Usando ruta directa (servicio de routing no disponible)'
    };
  }
  
  /**
   * Calcular distancia Haversine entre dos puntos
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  /**
   * Batch: obtener múltiples rutas de forma eficiente
   */
  async getMultipleRoutes(routes: Array<{ start: [number, number], end: [number, number], id: string }>): Promise<Map<string, RouteResponse>> {
    const results = new Map<string, RouteResponse>();
    
    // Procesar rutas en paralelo (máximo 3 simultáneas para no sobrecargar OSRM)
    const chunks = this.chunkArray(routes, 3);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (route) => {
        const result = await this.getRoute(route.start, route.end);
        return { id: route.id, result };
      });
      
      const chunkResults = await Promise.all(promises);
      chunkResults.forEach(({ id, result }) => {
        results.set(id, result);
      });
      
      // Pequeña pausa entre chunks para ser respetuosos con el servicio gratuito
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
  
  /**
   * Dividir array en chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Singleton para uso global
export const realRoutingService = new RealRoutingService();