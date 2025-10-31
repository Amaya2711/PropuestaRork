import { useState, useCallback } from 'react';
import { RouteResult, CategoryRouteResult, routeService } from '@/lib/routeService';

export interface CuadrillaWithRoute {
  id: number;
  codigo: string;
  nombre: string;
  latitud: number;
  longitud: number;
  distanciaKm?: number;
  tiempoMinutos?: number;
  tiempoConTrafico?: number;
  ruta?: [number, number][];
  esMasRapida?: boolean;
}

export const useRouteCalculator = () => {
  const [calculando, setCalculando] = useState(false);
  const [resultados, setResultados] = useState<RouteResult[]>([]);
  const [cuadrillaMasRapida, setCuadrillaMasRapida] = useState<RouteResult | null>(null);
  const [rutasPorCategoria, setRutasPorCategoria] = useState<CategoryRouteResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const calcularMejorRuta = useCallback(async (
    ticketLat: number,
    ticketLng: number,
    cuadrillas: Array<{
      id: number;
      codigo: string;
      nombre: string;
      latitud: number;
      longitud: number;
    }>
  ) => {
    if (cuadrillas.length === 0) {
      setError('No hay cuadrillas disponibles');
      return;
    }

    setCalculando(true);
    setError(null);
    
    try {
      console.log(`🚗 Calculando rutas desde ${cuadrillas.length} cuadrillas al ticket...`);
      
      const routes = await routeService.calculateBestRoute(
        ticketLat, 
        ticketLng, 
        cuadrillas
      );
      
      setResultados(routes);
      
      if (routes.length > 0) {
        const masRapida = routes[0]; // Ya viene ordenado por tiempo
        setCuadrillaMasRapida(masRapida);
        
        console.log(`🏆 Cuadrilla más rápida: ${masRapida.cuadrillaCodigo}`);
        console.log(`⏱️ Tiempo estimado: ${masRapida.tiempoConTrafico.toFixed(1)} minutos`);
        console.log(`📏 Distancia: ${masRapida.distanciaKm.toFixed(2)} km`);
      }
      
    } catch (err: any) {
      console.error('Error calculando rutas:', err);
      setError(err.message || 'Error calculando rutas');
    } finally {
      setCalculando(false);
    }
  }, []);

  const calcularRutasPorCategoria = useCallback(async (
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
  ) => {
    try {
      setCalculando(true);
      setError(null);
      
      console.log(`🎯 Calculando rutas por categoría...`);
      
      const routes = await routeService.calculateBestRouteByCategory(
        ticketLat,
        ticketLng,
        cuadrillas
      );
      
      setRutasPorCategoria(routes);
      
      console.log(`✅ Rutas por categoría calculadas: ${routes.length} categorías`);
      routes.forEach(route => {
        console.log(`📍 Categoría ${route.categoria}: ${route.cuadrillaCodigo} (${route.tiempoConTrafico.toFixed(1)} min)`);
      });
      
    } catch (err: any) {
      console.error('Error calculando rutas por categoría:', err);
      setError(err.message || 'Error calculando rutas por categoría');
    } finally {
      setCalculando(false);
    }
  }, []);

  const limpiarRutas = useCallback(() => {
    setResultados([]);
    setCuadrillaMasRapida(null);
    setRutasPorCategoria([]);
    setError(null);
  }, []);

  return {
    calculando,
    resultados,
    cuadrillaMasRapida,
    rutasPorCategoria,
    error,
    calcularMejorRuta,
    calcularRutasPorCategoria,
    limpiarRutas
  };
};