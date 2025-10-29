'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabaseClient';

// 👇 Importa componentes de react-leaflet dinámicamente para asegurar entorno cliente
const MapContainer = dynamic(
  async () => (await import('react-leaflet')).MapContainer,
  { ssr: false }
);
const TileLayer = dynamic(
  async () => (await import('react-leaflet')).TileLayer,
  { ssr: false }
);
const CircleMarker = dynamic(
  async () => (await import('react-leaflet')).CircleMarker,
  { ssr: false }
);
const Popup = dynamic(
  async () => (await import('react-leaflet')).Popup,
  { ssr: false }
);
const Polyline = dynamic(
  async () => (await import('react-leaflet')).Polyline,
  { ssr: false }
);

/* ===================== Tipos ===================== */
type SiteDB = {
  id: number | string;
  codigo: string;
  site: string | null;
  region: string | null;
  latitud: number | null;
  longitud: number | null;
};

type CuadrillaDB = {
  id: number;
  codigo: string;
  nombre: string | null;
  supervisor: string | null;
  zona: string | null;
  activo: boolean | null;
  latitud: number | null;
  longitud: number | null;
  telefono: string | null;
};

type TicketDB = {
  id: string;
  ticket_source: string | null;
  site_id: string | null;
  site_name: string | null;
  task_category: string | null;
  estado: string | null;
  created_at: string | null;
};

type Punto = {
  id: number | string;
  codigo: string;
  nombre: string | null;
  region: string | null;
  latitud: number | null;
  longitud: number | null;
  tipo: 'site' | 'cuadrilla' | 'ticket';
  // Campos adicionales para tickets
  ticketId?: string;
  estadoTicket?: string;
  categoria?: string;
};

/* ===================== Componente de Popup Dinámico ===================== */
interface DynamicTicketPopupProps {
  siteCode: string;
  siteName: string;
  region: string;
  latitud: number | null;
  longitud: number | null;
  selectedEstado: string;
  selectedRegion: string;
  getFilteredTicketInfo: (siteCode: string) => Promise<{ count: number; categorias: string[] }>;
}

const DynamicTicketPopup: React.FC<DynamicTicketPopupProps> = ({
  siteCode,
  siteName,
  region,
  latitud,
  longitud,
  selectedEstado,
  selectedRegion,
  getFilteredTicketInfo
}) => {
  const [ticketInfo, setTicketInfo] = useState<{ count: number; categorias: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTicketInfo = async () => {
      setLoading(true);
      try {
        const info = await getFilteredTicketInfo(siteCode);
        setTicketInfo(info);
      } catch (error) {
        console.error('Error cargando info de tickets:', error);
        setTicketInfo({ count: 0, categorias: [] });
      }
      setLoading(false);
    };

    loadTicketInfo();
  }, [siteCode, selectedEstado, selectedRegion, getFilteredTicketInfo]);

  if (loading) {
    return <div><b>🎫 TICKETS</b><br />Cargando...</div>;
  }

  if (!ticketInfo) {
    return <div><b>🎫 TICKETS</b><br />Error cargando datos</div>;
  }

  return (
    <div>
      <b>🎫 TICKETS</b>
      <br />
      Cantidad: {ticketInfo.count} ticket{ticketInfo.count !== 1 ? 's' : ''}
      {selectedEstado && (
        <>
          <br />
          Filtro: Estado = {selectedEstado}
        </>
      )}
      {selectedRegion && (
        <>
          <br />
          Filtro: Región = {selectedRegion}
        </>
      )}
      <br />
      Site: {siteCode}
      {siteName && (
        <>
          <br />
          Nombre: {siteName}
        </>
      )}
      <br />
      Categorías: {ticketInfo.categorias.length > 0 ? ticketInfo.categorias.join(', ') : 'N/A'}
      <br />
      Región: {region}
      <br />
      Latitud: {latitud}
      <br />
      Longitud: {longitud}
    </div>
  );
};

/* ===================== Util: paginación ===================== */
const PAGE_SIZE = 1000;

async function fetchAll<T>(table: string, select: string) {
  let all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const chunk = (data || []) as T[];
    all = all.concat(chunk);

    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

/* ===================== Página ===================== */
export default function ClientMap() {
  const [map, setMap] = useState<any>(null);
  const [sites, setSites] = useState<Punto[]>([]);
  const [cuadrillas, setCuadrillas] = useState<Punto[]>([]);
  const [tickets, setTickets] = useState<Punto[]>([]);
  const [allPoints, setAllPoints] = useState<Punto[]>([]);

  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingCuadrillas, setLoadingCuadrillas] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showSites, setShowSites] = useState(false);
  const [showCuadrillas, setShowCuadrillas] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  
  // Estados para saber si los datos han sido cargados
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const [cuadrillasLoaded, setCuadrillasLoaded] = useState(false);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Punto[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<Punto | null>(null);

  // Selector de región
  const [selectedRegion, setSelectedRegion] = useState<string>(''); // '' = todas
  const [selectedEstado, setSelectedEstado] = useState<string>(''); // '' = todos
  
  // Total real de tickets en la base de datos
  const [totalTicketsDB, setTotalTicketsDB] = useState<number>(0);
  // Total de tickets filtrados por estado
  const [totalTicketsFiltrados, setTotalTicketsFiltrados] = useState<number>(0);

  // Estados para la simulación de cuadrilla 17 (Punta Negra → La Punta)
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(100);
  const [simulatedPosition, setSimulatedPosition] = useState({ lat: -12.3655, lng: -76.786828 });
  const [simulationStep, setSimulationStep] = useState(0);
  const [realRoutePoints, setRealRoutePoints] = useState<Array<{lat: number, lng: number}>>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Estados para la simulación de cuadrilla 31 (Miraflores → Los Olivos)
  const [simulation31Active, setSimulation31Active] = useState(false);
  const [simulation31Progress, setSimulation31Progress] = useState(0);
  const [current31Step, setCurrent31Step] = useState(0);
  const [total31Steps, setTotal31Steps] = useState(100);
  const [simulated31Position, setSimulated31Position] = useState({ lat: -12.121011, lng: -77.036997 });
  const [simulation31Step, setSimulation31Step] = useState(0);
  const [real31RoutePoints, setReal31RoutePoints] = useState<Array<{lat: number, lng: number}>>([]);
  const [route31Loading, setRoute31Loading] = useState(false);
  const [route31Error, setRoute31Error] = useState<string | null>(null);
  const [autoRefresh31Interval, setAutoRefresh31Interval] = useState<NodeJS.Timeout | null>(null);
  const [isRefreshing31, setIsRefreshing31] = useState(false);
  const [lastUpdate31Time, setLastUpdate31Time] = useState<Date | null>(null);

  // Función para obtener información filtrada de tickets por site
  const getFilteredTicketInfo = async (siteCode: string) => {
    try {
      let query = supabase
        .from('tickets_v1')
        .select('estado, task_category')
        .eq('site_id', siteCode);
      
      // Aplicar filtro de estado si está seleccionado
      if (selectedEstado) {
        query = query.eq('estado', selectedEstado);
      }
      
      const { data: filteredTickets, error } = await query;
      
      if (error || !filteredTickets) return { count: 0, categorias: [] };
      
      const count = filteredTickets.length;
      const categorias = [...new Set(filteredTickets.map(t => t.task_category).filter(Boolean))];
      
      return { count, categorias };
    } catch (error) {
      console.error('Error obteniendo tickets filtrados:', error);
      return { count: 0, categorias: [] };
    }
  };

  /* ---------- Funciones de carga a demanda ---------- */
  const loadSites = async () => {
    if (sitesLoaded || loadingSites) return;
    
    setLoadingSites(true);
    try {
      const sitesRaw = await fetchAll<SiteDB>(
        'sites_v1',
        'id,codigo,site,region,latitud,longitud'
      );

      const sitesPoints: Punto[] = sitesRaw.map((s) => ({
        id: s.id,
        codigo: s.codigo,
        nombre: s.site,
        region: s.region,
        latitud: s.latitud,
        longitud: s.longitud,
        tipo: 'site',
      }));

      setSites(sitesPoints);
      setSitesLoaded(true);
      updateAllPoints(sitesPoints, cuadrillas, tickets);
    } catch (e) {
      console.error('Error cargando sites:', e);
    } finally {
      setLoadingSites(false);
    }
  };

  const loadCuadrillas = async () => {
    if (cuadrillasLoaded || loadingCuadrillas) return;
    
    setLoadingCuadrillas(true);
    try {
      const cuadsRaw = await fetchAll<CuadrillaDB>(
        'cuadrillas_v1',
        'id,codigo,nombre,supervisor,zona,activo,latitud,longitud,telefono'
      );

      const cuadsPoints: Punto[] = cuadsRaw.map((c) => ({
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        region: c.zona, // zona -> region
        latitud: c.latitud,
        longitud: c.longitud,
        tipo: 'cuadrilla',
      }));

      setCuadrillas(cuadsPoints);
      setCuadrillasLoaded(true);
      updateAllPoints(sites, cuadsPoints, tickets);
    } catch (e) {
      console.error('Error cargando cuadrillas:', e);
    } finally {
      setLoadingCuadrillas(false);
    }
  };

  const loadTickets = async () => {
    if (ticketsLoaded || loadingTickets) return;
    
    setLoadingTickets(true);
    try {
      // Primero necesitamos los sites para las coordenadas
      let sitesRaw: SiteDB[] = [];
      if (!sitesLoaded) {
        sitesRaw = await fetchAll<SiteDB>(
          'sites_v1',
          'id,codigo,site,region,latitud,longitud'
        );
      } else {
        // Usar los sites ya cargados
        sitesRaw = sites.map(s => ({
          id: s.id,
          codigo: s.codigo,
          site: s.nombre,
          region: s.region,
          latitud: s.latitud,
          longitud: s.longitud,
        })) as SiteDB[];
      }

      // No filtrar por región aquí - se hará en visibleTickets
      console.log(`Cargando tickets para ${sitesRaw.length} sites disponibles`);

      const ticketsRaw = await fetchAll<TicketDB>(
        'tickets_v1',
        'id,ticket_source,site_id,site_name,task_category,estado,created_at'
      );

      const ticketsPoints: Punto[] = [];
      const ticketsBySite = new Map<string, TicketDB[]>();
      
      // Agrupar tickets por site_id
      for (const ticket of ticketsRaw) {
        if (ticket.site_id) {
          if (!ticketsBySite.has(ticket.site_id)) {
            ticketsBySite.set(ticket.site_id, []);
          }
          ticketsBySite.get(ticket.site_id)!.push(ticket);
        }
      }
      
      // Crear un punto por cada site que tenga tickets
      for (const [siteId, ticketsForSite] of ticketsBySite.entries()) {
        const siteMatch = sitesRaw.find(site => site.codigo === siteId);
        
        if (siteMatch && siteMatch.latitud && siteMatch.longitud) {
          const ticketCount = ticketsForSite.length;
          const estados = ticketsForSite.map(t => t.estado).filter(Boolean);
          const categorias = [...new Set(ticketsForSite.map(t => t.task_category).filter(Boolean))];
          
          ticketsPoints.push({
            id: `tickets-${siteId}`,
            codigo: siteId,
            nombre: `${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}`,
            region: siteMatch.region,
            latitud: siteMatch.latitud,
            longitud: siteMatch.longitud,
            tipo: 'ticket',
            ticketId: `${ticketCount} tickets`,
            estadoTicket: estados.join(', '),
            categoria: categorias.join(', '),
          });
          
          // Debug: Verificar que los tickets tengan región
          if (ticketCount > 0) {
            console.log(`Ticket creado - Site: ${siteId}, Región: "${siteMatch.region}", Count: ${ticketCount}`);
          }
        }
      }

      setTickets(ticketsPoints);
      setTicketsLoaded(true);
      updateAllPoints(sites, cuadrillas, ticketsPoints);
    } catch (e) {
      console.error('Error cargando tickets:', e);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Función para actualizar allPoints
  const updateAllPoints = (sitesData: Punto[], cuadrillasData: Punto[], ticketsData: Punto[]) => {
    setAllPoints([...sitesData, ...cuadrillasData, ...ticketsData]);
  };

  // Función para cargar el total real de tickets de la base de datos
  const loadTotalTickets = async () => {
    try {
      console.log('🔢 Cargando total de tickets de la base de datos...');
      const { count, error } = await supabase
        .from('tickets_v1')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error obteniendo total de tickets:', error);
        return;
      }

      setTotalTicketsDB(count || 0);
      console.log('✅ Total de tickets en DB:', count);
    } catch (error) {
      console.error('Error cargando total de tickets:', error);
    }
  };

  // Función para contar tickets reales filtrados por estado
  const loadTicketsFiltradosPorEstado = async (estado: string) => {
    try {
      console.log('🔍 Contando tickets con estado:', estado);
      const { count, error } = await supabase
        .from('tickets_v1')
        .select('*', { count: 'exact', head: true })
        .eq('estado', estado);

      if (error) {
        console.error('Error contando tickets por estado:', error);
        return;
      }

      setTotalTicketsFiltrados(count || 0);
      console.log(`✅ Tickets con estado "${estado}":`, count);
    } catch (error) {
      console.error('Error contando tickets por estado:', error);
    }
  };

  // Funciones para manejar cambios de checkbox con carga automática
  const handleSitesChange = (checked: boolean) => {
    setShowSites(checked);
    if (checked && !sitesLoaded) {
      loadSites();
    }
  };

  // Función para obtener ruta real para cuadrilla 17 (Punta Negra → La Punta)
  const calculateRealRoute = async () => {
    const start = { lat: -12.3655, lng: -76.786828 }; // Punta Negra
    const end = { lat: -12.07194, lng: -77.16225 };   // La Punta
    
    setRouteLoading(true);
    setRouteError(null);
    
    try {
      console.log('🔍 Calculando ruta real desde OpenRouteService...');
      
      const apiKey = '5b3ce3597851110001cf6248d6c3df6c6cb541f79ff7c7ff37aca6ee';
      const profile = 'driving-car';
      
      const url = `https://api.openrouteservice.org/v2/directions/${profile}?` +
        `api_key=${apiKey}&` +
        `start=${start.lng},${start.lat}&` +
        `end=${end.lng},${end.lat}&` +
        `format=geojson`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features[0] && data.features[0].geometry) {
        const coordinates = data.features[0].geometry.coordinates;
        
        const routePoints = coordinates.map((coord: number[]) => ({
          lat: coord[1],
          lng: coord[0]
        }));
        
        const step = Math.max(1, Math.floor(routePoints.length / 100));
        const sampledPoints = [];
        
        for (let i = 0; i < routePoints.length; i += step) {
          sampledPoints.push(routePoints[i]);
        }
        
        if (sampledPoints.length > 0) {
          sampledPoints[sampledPoints.length - 1] = { lat: end.lat, lng: end.lng };
        }
        
        while (sampledPoints.length < 100 && routePoints.length > sampledPoints.length) {
          const lastIndex = sampledPoints.length * step;
          if (lastIndex < routePoints.length) {
            sampledPoints.push(routePoints[lastIndex]);
          } else {
            break;
          }
        }
        
        console.log(`🛣️ Ruta real calculada: ${sampledPoints.length} puntos de ${routePoints.length} originales`);
        
        setRealRoutePoints(sampledPoints);
        return sampledPoints;
        
      } else {
        throw new Error('No se encontró una ruta válida en la respuesta');
      }
      
    } catch (error) {
      console.error('❌ Error calculando ruta real:', error);
      setRouteError(`Error: ${error}`);
      
      console.log('🔄 Usando ruta de fallback...');
      const fallbackRoute = generateFallbackRoute();
      setRealRoutePoints(fallbackRoute);
      return fallbackRoute;
      
    } finally {
      setRouteLoading(false);
    }
  };

  // Ruta de fallback si la API falla
  const generateFallbackRoute = () => {
    const start = { lat: -12.3655, lng: -76.786828 };
    const end = { lat: -12.07194, lng: -77.16225 };
    
    const fallbackWaypoints = [
      start,
      { lat: -12.3500, lng: -76.7700 },
      { lat: -12.2800, lng: -76.7300 },
      { lat: -12.2000, lng: -76.6900 },
      { lat: -12.1200, lng: -76.6500 },
      { lat: -12.0900, lng: -76.7000 },
      { lat: -12.0800, lng: -76.8000 },
      { lat: -12.0750, lng: -76.9000 },
      end
    ];
    
    const points = [];
    const pointsPerSegment = Math.floor(100 / (fallbackWaypoints.length - 1));
    
    for (let i = 0; i < fallbackWaypoints.length - 1; i++) {
      const current = fallbackWaypoints[i];
      const next = fallbackWaypoints[i + 1];
      
      for (let j = 0; j < pointsPerSegment; j++) {
        const progress = j / pointsPerSegment;
        points.push({
          lat: current.lat + (next.lat - current.lat) * progress,
          lng: current.lng + (next.lng - current.lng) * progress
        });
      }
    }
    
    while (points.length < 100) {
      points.push(end);
    }
    
    return points.slice(0, 100);
  };

  // Función para obtener ruta real para cuadrilla 31 (Miraflores → Los Olivos)
  const calculateReal31Route = async () => {
    const start = { lat: -12.121011, lng: -77.036997 }; // Miraflores
    const end = { lat: -11.965198, lng: -77.066601 };   // Los Olivos
    
    setRoute31Loading(true);
    setRoute31Error(null);
    
    try {
      console.log('🔍 Calculando ruta real para cuadrilla 31...');
      
      const apiKey = '5b3ce3597851110001cf6248d6c3df6c6cb541f79ff7c7ff37aca6ee';
      const profile = 'driving-car';
      
      const url = `https://api.openrouteservice.org/v2/directions/${profile}?` +
        `api_key=${apiKey}&` +
        `start=${start.lng},${start.lat}&` +
        `end=${end.lng},${end.lat}&` +
        `format=geojson`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features[0] && data.features[0].geometry) {
        const coordinates = data.features[0].geometry.coordinates;
        
        const routePoints31 = coordinates.map((coord: number[]) => ({
          lat: coord[1],
          lng: coord[0]
        }));
        
        const step = Math.max(1, Math.floor(routePoints31.length / 100));
        const sampledPoints = [];
        
        for (let i = 0; i < routePoints31.length; i += step) {
          sampledPoints.push(routePoints31[i]);
        }
        
        if (sampledPoints.length > 0) {
          sampledPoints[sampledPoints.length - 1] = { lat: end.lat, lng: end.lng };
        }
        
        while (sampledPoints.length < 100 && routePoints31.length > sampledPoints.length) {
          const lastIdx = sampledPoints.length * step;
          if (lastIdx < routePoints31.length) {
            sampledPoints.push(routePoints31[lastIdx]);
          } else {
            break;
          }
        }
        
        console.log(`🛣️ Ruta real cuadrilla 31 calculada: ${sampledPoints.length} puntos`);
        
        setReal31RoutePoints(sampledPoints);
        return sampledPoints;
        
      } else {
        throw new Error('No se encontró una ruta válida');
      }
      
    } catch (error) {
      console.error('❌ Error calculando ruta cuadrilla 31:', error);
      setRoute31Error(`Error: ${error}`);
      
      const fallbackRoute = generateFallback31Route();
      setReal31RoutePoints(fallbackRoute);
      return fallbackRoute;
      
    } finally {
      setRoute31Loading(false);
    }
  };

  // Ruta de fallback para cuadrilla 31
  const generateFallback31Route = () => {
    const start = { lat: -12.121011, lng: -77.036997 }; // Miraflores
    const end = { lat: -11.965198, lng: -77.066601 };   // Los Olivos
    
    const fallbackWaypoints = [
      start,
      { lat: -12.1100, lng: -77.0400 },
      { lat: -12.0900, lng: -77.0450 },
      { lat: -12.0700, lng: -77.0500 },
      { lat: -12.0500, lng: -77.0550 },
      { lat: -12.0300, lng: -77.0600 },
      { lat: -12.0100, lng: -77.0650 },
      { lat: -11.9900, lng: -77.0670 },
      end
    ];
    
    const points = [];
    const pointsPerSegment = Math.floor(100 / (fallbackWaypoints.length - 1));
    
    for (let i = 0; i < fallbackWaypoints.length - 1; i++) {
      const current = fallbackWaypoints[i];
      const next = fallbackWaypoints[i + 1];
      
      for (let j = 0; j < pointsPerSegment; j++) {
        const progress = j / pointsPerSegment;
        points.push({
          lat: current.lat + (next.lat - current.lat) * progress,
          lng: current.lng + (next.lng - current.lng) * progress
        });
      }
    }
    
    while (points.length < 100) {
      points.push(end);
    }
    
    return points.slice(0, 100);
  };

  const handleCuadrillasChange = async (checked: boolean) => {
    setShowCuadrillas(checked);
    if (checked && !cuadrillasLoaded) {
      loadCuadrillas();
    }
    
    // Auto-iniciar simulaciones cuando se activa "Cuadrillas"
    if (checked) {
      console.log('🚀 Auto-iniciando simulaciones al activar Cuadrillas...');
      
      // Iniciar simulación cuadrilla 17 automáticamente
      if (!simulationActive) {
        await startSimulation();
      }
      
      // Iniciar simulación cuadrilla 31 automáticamente
      if (!simulation31Active) {
        await start31Simulation();
      }
    } else {
      console.log('⏹️ Auto-deteniendo simulaciones al desactivar Cuadrillas...');
      
      if (simulationActive) {
        await stopSimulation();
      }
      
      if (simulation31Active) {
        await stop31Simulation();
      }
    }
  };

  const handleTicketsChange = (checked: boolean) => {
    setShowTickets(checked);
    if (checked && !ticketsLoaded) {
      loadTickets();
    }
  };

  // Funciones para controlar la simulación de cuadrilla 17
  const startSimulation = async () => {
    try {
      console.log('🚀 Iniciando simulación cuadrilla 17 con ruta real...');
      
      const realPoints = await calculateRealRoute();
      
      if (!realPoints || realPoints.length === 0) {
        console.error('❌ No se pudo calcular la ruta');
        return;
      }
      
      setSimulationActive(true);
      setSimulationStep(0);
      setCurrentStep(0);
      setSimulationProgress(0);
      setSimulatedPosition(realPoints[0]);
      
      const interval = setInterval(() => {
        setSimulationStep(prevStep => {
          const nextStep = prevStep + 1;
          
          if (nextStep >= realPoints.length) {
            setSimulationActive(false);
            setCurrentStep(100);
            setSimulationProgress(100);
            clearInterval(interval);
            setAutoRefreshInterval(null);
            console.log('🏁 Simulación cuadrilla 17 completada');
            return prevStep;
          }
          
          const newPosition = realPoints[nextStep];
          setSimulatedPosition(newPosition);
          setCurrentStep(nextStep + 1);
          setSimulationProgress(Math.round(((nextStep + 1) / realPoints.length) * 100));
          setLastUpdateTime(new Date());
          
          console.log(`📍 Cuadrilla 17 - Paso ${nextStep + 1}/${realPoints.length}`);
          return nextStep;
        });
      }, 5000);
      
      setAutoRefreshInterval(interval);
      
    } catch (error) {
      console.error('Error iniciando simulación cuadrilla 17:', error);
    }
  };

  const stopSimulation = async () => {
    try {
      console.log('⏹️ Deteniendo simulación cuadrilla 17...');
      setSimulationActive(false);
      
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        setAutoRefreshInterval(null);
      }
    } catch (error) {
      console.error('Error deteniendo simulación cuadrilla 17:', error);
    }
  };

  // Funciones para controlar la simulación de cuadrilla 31
  const start31Simulation = async () => {
    try {
      console.log('🚀 Iniciando simulación cuadrilla 31 con ruta real...');
      
      const realPoints = await calculateReal31Route();
      
      if (!realPoints || realPoints.length === 0) {
        console.error('❌ No se pudo calcular la ruta para cuadrilla 31');
        return;
      }
      
      setSimulation31Active(true);
      setSimulation31Step(0);
      setCurrent31Step(0);
      setSimulation31Progress(0);
      setSimulated31Position(realPoints[0]);
      
      const interval = setInterval(() => {
        setSimulation31Step(prevStep => {
          const nextStep = prevStep + 1;
          
          if (nextStep >= realPoints.length) {
            setSimulation31Active(false);
            setCurrent31Step(100);
            setSimulation31Progress(100);
            clearInterval(interval);
            setAutoRefresh31Interval(null);
            console.log('🏁 Simulación cuadrilla 31 completada');
            return prevStep;
          }
          
          const newPosition = realPoints[nextStep];
          setSimulated31Position(newPosition);
          setCurrent31Step(nextStep + 1);
          setSimulation31Progress(Math.round(((nextStep + 1) / realPoints.length) * 100));
          setLastUpdate31Time(new Date());
          
          console.log(`📍 Cuadrilla 31 - Paso ${nextStep + 1}/${realPoints.length}`);
          return nextStep;
        });
      }, 5000);
      
      setAutoRefresh31Interval(interval);
      
    } catch (error) {
      console.error('Error iniciando simulación cuadrilla 31:', error);
    }
  };

  const stop31Simulation = async () => {
    try {
      console.log('⏹️ Deteniendo simulación cuadrilla 31...');
      setSimulation31Active(false);
      
      if (autoRefresh31Interval) {
        clearInterval(autoRefresh31Interval);
        setAutoRefresh31Interval(null);
      }
    } catch (error) {
      console.error('Error deteniendo simulación cuadrilla 31:', error);
    }
  };

  /* ---------- Regiones únicas ---------- */
  const regions = useMemo(() => {
    const setR = new Set(
      allPoints
        .map((p) => (p.region ?? '').trim())
        .filter((r) => r.length > 0)
    );
    return Array.from(setR).sort((a, b) => a.localeCompare(b));
  }, [allPoints]);

  /* ---------- Estados del catálogo ---------- */
  const [estadosCatalogo, setEstadosCatalogo] = useState<any[]>([]);
  
  // Cargar estados desde catalogo_estados
  useEffect(() => {
    const loadEstados = async () => {
      try {
        console.log('🔄 Cargando estados desde catalogo_estados...');
        const { data, error } = await supabase
          .from('catalogo_estados')
          .select('codigo, nombre, descripcion')
          .eq('activo', true)
          .order('codigo');
        
        if (!error && data) {
          setEstadosCatalogo(data);
          console.log('✅ Estados del catálogo cargados:', data.length, 'estados');
          console.log('Estados disponibles:', data.map(e => `${e.codigo}-${e.nombre}`).join(', '));
        } else {
          console.log('⚠️ Error cargando estados del catálogo, usando fallback:', error?.message);
          // Fallback con estados básicos si la tabla no existe
          const fallbackEstados = [
            { codigo: 7, nombre: 'NUEVO', descripcion: 'Ticket recién creado' },
            { codigo: 8, nombre: 'RESUELTO', descripcion: 'Ticket completamente resuelto' }
          ];
          setEstadosCatalogo(fallbackEstados);
          console.log('📝 Usando estados fallback:', fallbackEstados.map(e => e.nombre).join(', '));
        }
      } catch (err) {
        console.error('❌ Error cargando estados:', err);
        const fallbackEstados = [
          { codigo: 7, nombre: 'NUEVO', descripcion: 'Ticket recién creado' },
          { codigo: 8, nombre: 'RESUELTO', descripcion: 'Ticket completamente resuelto' }
        ];
        setEstadosCatalogo(fallbackEstados);
      }
    };
    
    loadEstados();
    loadTotalTickets();
  }, []);

  // Cargar total de tickets filtrados cuando cambia el estado seleccionado
  useEffect(() => {
    if (selectedEstado) {
      loadTicketsFiltradosPorEstado(selectedEstado);
    } else {
      // Si no hay estado seleccionado, usar el total general
      setTotalTicketsFiltrados(totalTicketsDB);
    }
  }, [selectedEstado, totalTicketsDB]);

  // Estados únicos para el selector (mantenemos compatibilidad)
  const estados = useMemo(() => {
    return estadosCatalogo.map(e => e.nombre).sort((a, b) => a.localeCompare(b));
  }, [estadosCatalogo]);

  // ¿El punto coincide con los filtros seleccionados?
  const matchesFilters = (p: Punto) => {
    // Filtro por región
    if (selectedRegion) {
      const puntoRegion = (p.region ?? '').trim();
      const regionSeleccionada = selectedRegion.trim();
      if (puntoRegion !== regionSeleccionada) {
        return false;
      }
    }
    
    // Filtro por estado (solo aplica a tickets)
    if (selectedEstado && p.tipo === 'ticket') {
      const estadosDelTicket = (p.estadoTicket ?? '').split(',').map(e => e.trim());
      const estadoSeleccionado = selectedEstado.trim();
      if (!estadosDelTicket.includes(estadoSeleccionado)) {
        return false;
      }
    }
    
    return true;
  };

  // Función legacy para mantener compatibilidad
  const matchesRegion = matchesFilters;

  // Debug del filtrado de tickets por región
  useEffect(() => {
    if (ticketsLoaded && tickets.length > 0) {
      console.log('=== DEBUG FILTRADO TICKETS ===');
      console.log('Región seleccionada:', `"${selectedRegion}"`);
      console.log('Total tickets cargados:', tickets.length);
      
      // Calcular directamente los tickets visibles para debug
      const ticketsVisibles = (selectedRegion || selectedEstado) ? tickets.filter(matchesFilters) : tickets;
      console.log('Tickets visibles después del filtro:', ticketsVisibles.length);
      
      // Mostrar todas las regiones únicas en los tickets
      const regionesEnTickets = [...new Set(tickets.map(t => t.region))].sort();
      console.log('Regiones únicas en tickets:', regionesEnTickets);
      
      // Contar tickets por región
      const contadorRegiones: Record<string, number> = {};
      tickets.forEach(t => {
        const region = t.region || 'Sin región';
        contadorRegiones[region] = (contadorRegiones[region] || 0) + 1;
      });
      console.log('Tickets por región:', contadorRegiones);
      
      if (selectedRegion) {
        console.log(`\n--- Filtrado detallado para región "${selectedRegion}" ---`);
        
        tickets.forEach(ticket => {
          const puntoRegion = (ticket.region ?? '').trim();
          const regionSeleccionada = selectedRegion.trim();
          const coincide = puntoRegion === regionSeleccionada;
          
          console.log(`Ticket ${ticket.codigo}: región="${puntoRegion}" vs seleccionada="${regionSeleccionada}" => ${coincide}`);
        });
        
        const ticketsDeRegion = tickets.filter(t => (t.region ?? '').trim() === selectedRegion.trim());
        console.log(`\nRESULTADO: ${ticketsDeRegion.length} tickets coinciden con región "${selectedRegion}"`);
        
        if (ticketsDeRegion.length > 0) {
          console.log('IDs de tickets que coinciden:', ticketsDeRegion.map(t => t.codigo));
        }
      }
    }
  }, [selectedRegion, selectedEstado, tickets]);

  /* ---------- Búsqueda ---------- */
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(() => {
      const filtered = allPoints
        .filter(matchesFilters)
        .filter((p) => {
          const codigo = p.codigo.toLowerCase();
          const nombre = (p.nombre || '').toLowerCase();
          return codigo.includes(q) || nombre.includes(q);
        })
        .filter((p) => typeof p.latitud === 'number' && typeof p.longitud === 'number')
        .slice(0, 12);

      setSearchResults(filtered);
      setShowSearchResults(filtered.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, allPoints, selectedRegion, selectedEstado]);

  const centerMapOnPoint = (p: Punto) => {
    setSelectedPoint(p);
    setSearchQuery(`${p.codigo} - ${p.nombre ?? ''}`);
    setShowSearchResults(false);

    if (map && p.latitud && p.longitud) map.setView([p.latitud, p.longitud], 15);
  };

  // Totales globales (sin filtro)
  const totals = useMemo(
    () => ({
      sites: sites.length,
      cuads: cuadrillas.length,
      tickets: totalTicketsDB, // Total real de la base de datos
      total: sites.length + cuadrillas.length + totalTicketsDB, // Total recalculado
    }),
    [sites, cuadrillas, totalTicketsDB]
  );

  // Colecciones filtradas por región y estado (para mapa y contadores visibles)
  const visibleSites = useMemo(
    () => (selectedRegion ? sites.filter(matchesFilters) : sites),
    [sites, selectedRegion, selectedEstado]
  );
  const visibleCuadrillas = useMemo(
    () => (selectedRegion ? cuadrillas.filter(matchesFilters) : cuadrillas),
    [cuadrillas, selectedRegion, selectedEstado]
  );
  const visibleTickets = useMemo(() => {
    const result = (selectedRegion || selectedEstado) ? tickets.filter(matchesFilters) : tickets;
    console.log(`visibleTickets useMemo: ${result.length} tickets visible (región: "${selectedRegion || 'TODAS'}", estado: "${selectedEstado || 'TODOS'}")`);
    return result;
  }, [tickets, selectedRegion, selectedEstado]);
  const visibleTotal = visibleSites.length + visibleCuadrillas.length + visibleTickets.length;

  return (
    <div style={{ height: 'calc(100vh - 80px)' }}>
      {/* Barra superior */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
        }}
      >
        {/* Fila 1: Buscador y región */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 15,
            marginBottom: 8,
          }}
        >
          {/* Buscador */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 300px',
              minWidth: 260,
              maxWidth: 360,
            }}
          >
            <input
              type="text"
              placeholder="Buscar por nombre o código... (Enter para centrar)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length > 0) {
                  centerMapOnPoint(searchResults[0]);
                } else if (e.key === 'Escape') {
                  setSearchQuery('');
                  setSelectedPoint(null);
                  setShowSearchResults(false);
                }
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: selectedPoint ? '2px solid #007bff' : '1px solid #ccc',
                borderRadius: 6,
                fontSize: 13,
                backgroundColor: selectedPoint ? '#f0f8ff' : 'white',
              }}
            />

            {/* Lista resultados */}
            {showSearchResults && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderTop: 'none',
                  borderRadius: '0 0 6px 6px',
                  maxHeight: 280,
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              >
                {searchResults.map((p, i) => (
                  <div
                    key={`${p.tipo}-${p.codigo}-${i}`}
                    onClick={() => centerMapOnPoint(p)}
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        backgroundColor: p.tipo === 'site' ? '#28a745' : '#6f42c1',
                        color: 'white',
                        borderRadius: '50%',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {p.tipo === 'site' ? 'S' : 'C'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {p.codigo} — {p.nombre ?? '-'}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {p.region ?? '-'} • {p.latitud}, {p.longitud}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selector de Región */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>Región:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              style={{
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: 6,
                fontSize: 13,
                minWidth: 180,
                background: 'white',
              }}
            >
              <option value="">Todas las regiones</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Estado (solo para tickets) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>Estado:</label>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              style={{
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: 6,
                fontSize: 13,
                minWidth: 150,
                background: 'white',
              }}
            >
              <option value="">Todos los estados</option>
              {estadosCatalogo.map((estado) => (
                <option key={estado.codigo} value={estado.nombre}>
                  {estado.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 2: Checkboxes, contadores y estado */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 15,
          }}
        >
          {/* Checkboxes con carga automática */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={showSites}
                onChange={(e) => handleSitesChange(e.target.checked)}
              />
              <span style={{ color: '#28a745', fontWeight: 600, fontSize: 13 }}>
                📡 Sites {loadingSites ? '⏳' : ''}
              </span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={showCuadrillas}
                onChange={(e) => handleCuadrillasChange(e.target.checked)}
              />
              <span style={{ color: '#6f42c1', fontWeight: 600, fontSize: 13 }}>
                👥 Cuadrillas {loadingCuadrillas ? '⏳' : ''}
              </span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={showTickets}
                onChange={(e) => handleTicketsChange(e.target.checked)}
              />
              <span style={{ color: '#dc3545', fontWeight: 600, fontSize: 13 }}>
                🎫 Tickets {loadingTickets ? '⏳' : ''}
              </span>
            </label>
          </div>

          {/* Contador de elementos */}
          <div style={{ flex: '1 1 auto', textAlign: 'center' }}>
            <span style={{ color: '#333', fontWeight: 500, fontSize: 13 }}>
              📡 Sites: {sitesLoaded ? `${visibleSites.length}/${totals.sites}` : loadingSites ? '⏳' : 'No cargado'} | 
              👥 Cuadrillas: {cuadrillasLoaded ? `${visibleCuadrillas.length}/${totals.cuads}` : loadingCuadrillas ? '⏳' : 'No cargado'} | 
              🎫 Tickets: {ticketsLoaded ? `${selectedEstado ? totalTicketsFiltrados : totals.tickets}/${totals.tickets}` : loadingTickets ? '⏳' : 'No cargado'} | 
              🔗 Total: {(selectedEstado ? totalTicketsFiltrados : totals.total)}/{totals.total}
            </span>
          </div>

          {/* Indicador de selección */}
          {selectedPoint ? (
            <div
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                animation: 'pulse 2s infinite',
              }}
            >
              🎯 {selectedPoint.codigo}
            </div>
          ) : (
            <div
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              ❌ NINGÚN SITE SELECCIONADO
            </div>
          )}
        </div>
      </div>

      {/* Mapa */}
      <MapContainer
        center={[-9.19, -75.0152]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        ref={setMap}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Sites */}
        {showSites &&
          visibleSites.map((s) => {
            if (!s.latitud || !s.longitud) return null;
            const isSelected =
              selectedPoint?.codigo === s.codigo && selectedPoint.tipo === 'site';
            return (
              <CircleMarker
                key={`site-${s.codigo}`}
                center={[s.latitud, s.longitud]}
                radius={isSelected ? 10 : 5}
                pathOptions={{
                  color: isSelected ? '#ff0000' : '#28a745',
                  fillColor: isSelected ? '#ffff00' : '#28a745',
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{ click: () => centerMapOnPoint(s) }}
              >
                <Popup>
                  <b>📡 SITE</b>
                  <br />
                  Código: {s.codigo}
                  <br />
                  Nombre: {s.nombre}
                  <br />
                  Región: {s.region}
                  <br />
                  {s.latitud}, {s.longitud}
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Simulación cuadrilla 17 (Punta Negra → La Punta) */}
        {showCuadrillas && (
          <>
            {/* Cuadrilla 17 simulada en movimiento */}
            {simulationActive && (
              <CircleMarker
                center={[simulatedPosition.lat, simulatedPosition.lng]}
                radius={15}
                pathOptions={{
                  color: '#FF1493',
                  fillColor: '#FF69B4',
                  weight: 5,
                  opacity: 1.0,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <b>🚚 CUADRILLA SIMULADA</b>
                  <br />
                  ID: 17 (CQ-LIM-REG-17)
                  <br />
                  <strong style={{ color: '#28a745' }}>
                    🎯 EN MOVIMIENTO POR RUTA REAL
                  </strong>
                  <br />
                  Paso: {currentStep}/{totalSteps}
                  <br />
                  Progreso: {simulationProgress}%
                  <br />
                  Posición: {simulatedPosition.lat.toFixed(6)}, {simulatedPosition.lng.toFixed(6)}
                  <br />
                  🛣️ <em>Siguiendo rutas terrestres Lima-Callao</em>
                  <br />
                  ⏱️ <em>Actualizándose cada 5 segundos</em>
                </Popup>
              </CircleMarker>
            )}
          </>
        )}

        {/* Simulación cuadrilla 31 (Miraflores → Los Olivos) */}
        {showCuadrillas && (
          <>
            {/* Cuadrilla 31 simulada en movimiento */}
            {simulation31Active && (
              <CircleMarker
                center={[simulated31Position.lat, simulated31Position.lng]}
                radius={15}
                pathOptions={{
                  color: '#6f42c1',
                  fillColor: '#9966cc',
                  weight: 5,
                  opacity: 1.0,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <b>🚚 CUADRILLA SIMULADA</b>
                  <br />
                  ID: 31 (CQ-LIM-REG-31)
                  <br />
                  <strong style={{ color: '#6f42c1' }}>
                    🎯 EN MOVIMIENTO POR RUTA REAL
                  </strong>
                  <br />
                  Paso: {current31Step}/{total31Steps}
                  <br />
                  Progreso: {simulation31Progress}%
                  <br />
                  Posición: {simulated31Position.lat.toFixed(6)}, {simulated31Position.lng.toFixed(6)}
                  <br />
                  🛣️ <em>Siguiendo rutas terrestres Miraflores-Los Olivos</em>
                  <br />
                  ⏱️ <em>Actualizándose cada 5 segundos</em>
                </Popup>
              </CircleMarker>
            )}
          </>
        )}

        {/* Cuadrillas */}
        {showCuadrillas &&
          visibleCuadrillas.map((c) => {
            if (!c.latitud || !c.longitud) return null;
            const isSelected =
              selectedPoint?.codigo === c.codigo && selectedPoint.tipo === 'cuadrilla';
            return (
              <CircleMarker
                key={`cuad-${c.codigo}`}
                center={[c.latitud, c.longitud]}
                radius={isSelected ? 10 : 5}
                pathOptions={{
                  color: isSelected ? '#ff0000' : '#6f42c1',
                  fillColor: isSelected ? '#ffff00' : '#6f42c1',
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{ click: () => centerMapOnPoint(c) }}
              >
                <Popup>
                  <b>👥 CUADRILLA</b>
                  <br />
                  Código: {c.codigo}
                  <br />
                  Nombre: {c.nombre}
                  <br />
                  Zona: {c.region}
                  <br />
                  {c.latitud}, {c.longitud}
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Tickets */}
        {showTickets &&
          visibleTickets.map((t) => {
            if (!t.latitud || !t.longitud) return null;
            const isSelected =
              selectedPoint?.id === t.id && selectedPoint.tipo === 'ticket';
            return (
              <CircleMarker
                key={t.id}
                center={[t.latitud, t.longitud]}
                radius={isSelected ? 12 : 6}
                pathOptions={{
                  color: isSelected ? '#ff0000' : '#dc3545',
                  fillColor: isSelected ? '#ffff00' : '#dc3545',
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{ click: () => centerMapOnPoint(t) }}
              >
                <Popup>
                  <DynamicTicketPopup 
                    siteCode={t.codigo}
                    siteName={t.nombre || ''}
                    region={t.region || ''}
                    latitud={t.latitud}
                    longitud={t.longitud}
                    selectedEstado={selectedEstado}
                    selectedRegion={selectedRegion}
                    getFilteredTicketInfo={getFilteredTicketInfo}
                  />
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
