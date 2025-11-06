'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '@/lib/supabaseClient';
import { useRouteCalculator } from '@/hooks/useRouteCalculator';

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
const ComputedRoute = dynamic(
  async () => (await import('../components/ComputedRoute')).default,
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
  skill_1: string | null;
  skill_2: string | null;
  skill_3: string | null;
  tipo: 'A' | 'B' | 'C' | null;
  categoria: 'A' | 'B' | 'C' | null;
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
  // Campos adicionales para cuadrillas
  supervisor?: string | null;
  telefono?: string | null;
  activo?: boolean | null;
  skill_1?: string | null;
  skill_2?: string | null;
  skill_3?: string | null;
  tipoCuadrilla?: 'A' | 'B' | 'C' | null;
  categoriaCuadrilla?: 'A' | 'B' | 'C' | null;
};

// Tipos específicos para la funcionalidad de selección de tickets
type TicketMapData = {
  id: string | number;
  codigo: string;
  nombre: string;
  latitud: number;
  longitud: number;
  region?: string;
  estado?: string;
  categoria?: string;
  tipo: 'ticket';
};

type CuadrillaMapData = {
  id: number;
  codigo: string;
  nombre: string;
  latitud: number;
  longitud: number;
  categoria: 'A' | 'B' | 'C' | null;
  activo: boolean;
  skill_1?: string | null;
  skill_2?: string | null;
  skill_3?: string | null;
  tipo: 'cuadrilla';
  region?: string;
};

/* ===================== Función de Cálculo de Distancia ===================== */
// Función haversine para calcular la distancia entre dos puntos geográficos en kilómetros
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

/* ===================== Función de Colores por Categoría ===================== */
// Función para obtener colores basados en la categoría de cuadrilla
function getCategoriaColors(categoria: 'A' | 'B' | 'C' | null | undefined): { color: string; fillColor: string } {
  switch (categoria) {
    case 'A':
      return { color: '#004085', fillColor: '#007bff' }; // Azul
    case 'B':
      return { color: '#155724', fillColor: '#28a745' }; // Verde
    case 'C':
      return { color: '#cc7000', fillColor: '#ff8c00' }; // Naranja para mejor visibilidad
    default:
      return { color: '#6c757d', fillColor: '#6c757d' }; // Gris por defecto
  }
}

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

async function fetchAll<T>(table: string, select: string, whereClause?: { column: string, value: string }) {
  console.log(`📊 Consultando tabla: ${table} con campos: ${select}${whereClause ? ` WHERE ${whereClause.column} = ${whereClause.value}` : ''}`);
  let all: T[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);
    
    // Aplicar filtro WHERE si se proporciona
    if (whereClause) {
      query = query.eq(whereClause.column, whereClause.value);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`❌ Error en consulta a ${table}:`, error);
      throw error;
    }
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
  
  // Estados para filtrado manual
  const [filtrosActivos, setFiltrosActivos] = useState<{
    region: string;
    estado: string;
  }>({
    region: '',
    estado: ''
  });
  
  // Radio configurable para búsqueda de cuadrillas (en kilómetros)
  const [searchRadius, setSearchRadius] = useState<number>(20); // 20km por defecto
  
  // Total real de tickets en la base de datos
  const [totalTicketsDB, setTotalTicketsDB] = useState<number>(0);
  // Total de tickets filtrados por estado
  const [totalTicketsFiltrados, setTotalTicketsFiltrados] = useState<number>(0);
  
  // Estado para ticket seleccionado
  const [selectedTicket, setSelectedTicket] = useState<TicketMapData | null>(null);
  
  // Estado para cuadrillas encontradas para el ticket seleccionado
  const [cuadrillasParaTicket, setCuadrillasParaTicket] = useState<CuadrillaMapData[]>([]);



  // Estados para el refresco automático de cuadrillas
  const [cuadrillasRefreshInterval, setCuadrillasRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Hook para calcular rutas con tráfico
  const { 
    calculando: calculandoRutas, 
    resultados: rutasCalculadas, 
    cuadrillaMasRapida,
    rutasPorCategoria,
    error: errorRutas,
    calcularMejorRuta, 
    calcularRutasPorCategoria,
    limpiarRutas 
  } = useRouteCalculator();
  const [isRefreshingCuadrillas, setIsRefreshingCuadrillas] = useState(false);
  const [lastCuadrillasUpdateTime, setLastCuadrillasUpdateTime] = useState<Date | null>(null);
  const [cuadrillasAutoRefreshActive, setCuadrillasAutoRefreshActive] = useState(false);

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
    
    console.log('🔄 Iniciando carga de cuadrillas...');
    setLoadingCuadrillas(true);
    try {
      const cuadsRaw = await fetchAll<CuadrillaDB>(
        'cuadrillas_v1',
        'id,codigo,nombre,supervisor,zona,activo,latitud,longitud,telefono,skill_1,skill_2,skill_3,tipo,categoria'
      );
      console.log('✅ Cuadrillas cargadas:', cuadsRaw.length);

      const cuadsPoints: Punto[] = cuadsRaw.map((c) => ({
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        region: c.zona, // zona -> region
        latitud: c.latitud,
        longitud: c.longitud,
        tipo: 'cuadrilla',
        supervisor: c.supervisor,
        telefono: c.telefono,
        activo: c.activo,
        skill_1: c.skill_1,
        skill_2: c.skill_2,
        skill_3: c.skill_3,
        tipoCuadrilla: c.tipo,
        categoriaCuadrilla: c.categoria,
      }));

      setCuadrillas(cuadsPoints);
      setCuadrillasLoaded(true);
      updateAllPoints(sites, cuadsPoints, tickets);
    } catch (e) {
      console.error('❌ Error cargando cuadrillas:', e);
      alert('Error cargando cuadrillas: ' + e);
    } finally {
      setLoadingCuadrillas(false);
    }
  };

  const loadTickets = async (estadoFiltro: string = 'NUEVO', forceReload: boolean = false) => {
    if (!forceReload && (ticketsLoaded || loadingTickets)) return;
    
    console.log(`🔄 Iniciando carga de tickets con estado: ${estadoFiltro}${forceReload ? ' (recarga forzada)' : ''}...`);
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

      console.log(`🔍 Cargando tickets filtrados por estado: "${estadoFiltro}" desde base de datos`);

      // Filtrar tickets por estado directamente en la base de datos
      let query = supabase
        .from('tickets_v1')
        .select('id,ticket_source,site_id,site_name,task_category,estado,created_at');
        
      // Solo aplicar filtro si hay un estado específico (no vacío)
      if (estadoFiltro && estadoFiltro !== '' && estadoFiltro !== 'TODOS') {
        query = query.eq('estado', estadoFiltro);
        console.log(`📊 Aplicando filtro de estado en DB: estado = "${estadoFiltro}"`);
      }
      
      const { data: ticketsRaw, error } = await query;

      if (error) {
        console.error('❌ Error cargando tickets filtrados:', error);
        throw error;
      }

      console.log(`✅ Tickets cargados: ${ticketsRaw?.length || 0} tickets con estado "${estadoFiltro}"`);

      const ticketsPoints: Punto[] = [];
      const ticketsBySite = new Map<string, TicketDB[]>();
      
      // Agrupar tickets por site_id
      for (const ticket of (ticketsRaw || [])) {
        if (ticket.site_id) {
          if (!ticketsBySite.has(ticket.site_id)) {
            ticketsBySite.set(ticket.site_id, []);
          }
          ticketsBySite.get(ticket.site_id)!.push(ticket);
        }
      }
      
      console.log(`📊 Sites con tickets: ${ticketsBySite.size}`);
      
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
      console.error('❌ Error cargando tickets:', e);
      alert('Error cargando tickets: ' + e);
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

  // Función de prueba para verificar conexión a Supabase
  const testSupabaseConnection = async () => {
    console.log('🧪 Probando conexión a Supabase...');
    try {
      const { data, error } = await supabase
        .from('cuadrillas_v1')
        .select('id, codigo')
        .limit(1);
      
      if (error) {
        console.error('❌ Error de conexión:', error);
        alert('Error de conexión a Supabase: ' + error.message);
      } else {
        console.log('✅ Conexión exitosa, datos de prueba:', data);
        alert('Conexión exitosa a Supabase! Registros encontrados: ' + (data?.length || 0));
      }
    } catch (err) {
      console.error('❌ Error general:', err);
      alert('Error general: ' + err);
    }
  };

  // Función para aplicar filtros manualmente
  const aplicarFiltros = async () => {
    console.log('🔍 [APLICAR FILTROS] Iniciando con:', { 
      selectedRegion, 
      selectedEstado,
      showTickets 
    });
    
    setFiltrosActivos({
      region: selectedRegion,
      estado: selectedEstado
    });
    
    // Si hay filtro de estado y los tickets están activos, recargar tickets
    if (selectedEstado && selectedEstado !== '' && showTickets) {
      console.log(`🔄 [APLICAR FILTROS] Recargando tickets con estado: "${selectedEstado}"`);
      await reloadTicketsByEstado(selectedEstado);
    }
    
    console.log('✅ [APLICAR FILTROS] Filtros aplicados:', { 
      region: selectedRegion, 
      estado: selectedEstado 
    });
  };

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setSelectedRegion('');
    setSelectedEstado('');
    setFiltrosActivos({
      region: '',
      estado: ''
    });
  };

  // Funciones para manejar cambios de checkbox con carga automática
  const handleSitesChange = (checked: boolean) => {
    setShowSites(checked);
    if (checked && !sitesLoaded) {
      loadSites();
    }
  };



  const handleCuadrillasChange = async (checked: boolean) => {
    setShowCuadrillas(checked);
    if (checked && !cuadrillasLoaded) {
      loadCuadrillas();
    }
    
    // Auto-iniciar refresco de datos reales cuando se activa "Cuadrillas"
    if (checked) {
      console.log('� Iniciando refresco automático de cuadrillas cada 3 segundos...');
      setCuadrillasAutoRefreshActive(true);
      
      // Iniciar refresco inmediato
      await refreshCuadrillasData();
      
      // Programar refresco cada 3 segundos
      const interval = setInterval(async () => {
        await refreshCuadrillasData();
      }, 3000);
      
      setCuadrillasRefreshInterval(interval);
    } else {
      console.log('⏹️ Deteniendo refresco automático de cuadrillas...');
      setCuadrillasAutoRefreshActive(false);
      
      if (cuadrillasRefreshInterval) {
        clearInterval(cuadrillasRefreshInterval);
        setCuadrillasRefreshInterval(null);
      }
    }
  };

  // Función para refrescar datos reales de cuadrillas
  const refreshCuadrillasData = async () => {
    if (isRefreshingCuadrillas) return; // Evitar llamadas simultáneas
    
    try {
      setIsRefreshingCuadrillas(true);
      console.log('🔄 Refrescando datos de cuadrillas...');
      
      const { data, error } = await supabase
        .from('cuadrillas_v1')
        .select('id,codigo,nombre,supervisor,zona,activo,latitud,longitud,telefono,skill_1,skill_2,skill_3,tipo,categoria')
        .order('id');
      
      if (error) {
        console.error('❌ Error refrescando cuadrillas:', error);
        return;
      }
      
      if (data) {
        const cuadrillasActualizadas: Punto[] = data
          .filter((c: CuadrillaDB) => c.latitud && c.longitud)
          .map((c: CuadrillaDB) => {

            
            return {
              id: c.id,
              codigo: c.codigo,
              nombre: c.nombre || '',
              latitud: c.latitud!,
              longitud: c.longitud!,
              tipo: 'cuadrilla' as const,
              region: c.zona || 'Sin zona',
              supervisor: c.supervisor,
              telefono: c.telefono,
              activo: c.activo,
              skill_1: c.skill_1,
              skill_2: c.skill_2,
              skill_3: c.skill_3,
              tipoCuadrilla: c.tipo,
              categoriaCuadrilla: c.categoria
            };
          });
        
        setCuadrillas(cuadrillasActualizadas);
        setLastCuadrillasUpdateTime(new Date());
        
        console.log(`✅ Cuadrillas actualizadas: ${cuadrillasActualizadas.length} registros`);
        
        // Debug: Mostrar skills y categorías de las primeras cuadrillas
        if (cuadrillasActualizadas.length > 0) {
          console.log('🔍 Debug Skills - Primeras 3 cuadrillas:');
          cuadrillasActualizadas.slice(0, 3).forEach(c => {
            console.log(`ID ${c.id}: skill_1="${c.skill_1}", skill_2="${c.skill_2}", skill_3="${c.skill_3}", categoria="${c.categoriaCuadrilla}"`);
          });
          
          // Debug: Contar cuadrillas por categoría
          const categoriaCount = cuadrillasActualizadas.reduce((acc, c) => {
            const cat = c.categoriaCuadrilla || 'Sin categoria';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log('📊 Cuadrillas por categoría:', categoriaCount);
        }
        
        // Filtrar cuadrilla 17 para logging especial (sin simulación)
        const cuadrilla17 = cuadrillasActualizadas.find(c => c.id === 17);
        if (cuadrilla17) {
          console.log(`📍 Cuadrilla ID=17 posición real: ${cuadrilla17.latitud}, ${cuadrilla17.longitud}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error general refrescando cuadrillas:', error);
    } finally {
      setIsRefreshingCuadrillas(false);
    }
  };

  // Función para recargar tickets cuando cambia el estado
  const reloadTicketsByEstado = async (estado: string) => {
    if (!showTickets) return; // Solo recargar si los tickets están activos
    
    console.log(`🔄 Recargando tickets con estado: ${estado}...`);
    setTicketsLoaded(false); // Marcar como no cargados antes de recargar
    
    try {
      await loadTickets(estado, true); // Forzar recarga
    } catch (error) {
      console.error('❌ Error recargando tickets:', error);
    }
  };

  const handleTicketsChange = (checked: boolean) => {
    setShowTickets(checked);
    
    if (checked) {
      console.log('🎫 Activando filtro de tickets');
      
      // Activar cuadrillas automáticamente y cargarlas si no están cargadas
      if (!showCuadrillas) {
        console.log(`👥 Activando cuadrillas automáticamente para mostrar radio de ${searchRadius}km...`);
        setShowCuadrillas(true);
      }
      
      if (!cuadrillasLoaded) {
        console.log(`👥 Cargando cuadrillas para calcular radio de ${searchRadius}km...`);
        loadCuadrillas();
      }
      
      // Si no hay estado seleccionado, seleccionar "NUEVO" por defecto
      let estadoAUsar = selectedEstado;
      if (!selectedEstado || selectedEstado === '') {
        console.log('🎫 No hay estado seleccionado. Seleccionando "NUEVO" por defecto.');
        setSelectedEstado('NUEVO');
        estadoAUsar = 'NUEVO';
      }
      
      // Cargar tickets con el estado (existente o recién seleccionado)
      console.log(`🎫 Cargando tickets con estado: ${estadoAUsar}`);
      if (!ticketsLoaded) {
        loadTickets(estadoAUsar);
      }
    } else {
      // Limpiar filtro de estado cuando se desactiva tickets
      console.log('🎫 Desactivando filtro de tickets - Limpiando datos');
      setTickets([]);
      setTicketsLoaded(false);
      // Opcional: Restablecer estado a vacío cuando se desactivan tickets
      setSelectedEstado('');
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
        console.log('🔄 Cargando TODOS los estados desde catalogo_estados...');
        const { data, error } = await supabase
          .from('catalogo_estados')
          .select('codigo, nombre, descripcion')
          .order('codigo');
        
        if (!error && data) {
          setEstadosCatalogo(data);
          console.log('✅ TODOS los estados del catálogo cargados:', data.length, 'estados');
          console.log('Estados disponibles (incluye activos e inactivos):', data.map(e => `${e.codigo}-${e.nombre}`).join(', '));
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

  // Solo contar tickets filtrados cuando cambia el estado seleccionado (NO recargar hasta BUSCAR)
  useEffect(() => {
    if (selectedEstado) {
      loadTicketsFiltradosPorEstado(selectedEstado);
      console.log(`� Estado seleccionado: "${selectedEstado}" - Contando tickets (no recargando hasta BUSCAR)`);
    } else {
      // Si no hay estado seleccionado, usar el total general
      setTotalTicketsFiltrados(totalTicketsDB);
      console.log(`📊 Sin estado seleccionado - Usando total general: ${totalTicketsDB}`);
    }
  }, [selectedEstado, totalTicketsDB]);

  // Limpiar tickets obsoletos cuando cambian los filtros activos (hasta que se recarguen)
  useEffect(() => {
    console.log(`🔄 [FILTROS ACTIVOS] Cambio detectado:`, {
      region: filtrosActivos.region,
      estado: filtrosActivos.estado
    });
    
    // No limpiar automáticamente, solo log para debug
    // Los tickets se recargarán cuando sea necesario por aplicarFiltros()
  }, [filtrosActivos.region, filtrosActivos.estado]);

  // Estados únicos para el selector (mantenemos compatibilidad)
  const estados = useMemo(() => {
    return estadosCatalogo.map(e => e.nombre).sort((a, b) => a.localeCompare(b));
  }, [estadosCatalogo]);

  // ¿El punto coincide con los filtros seleccionados?
  const matchesFilters = (p: Punto) => {
    // Debug para el punto específico
    const isTicket = p.tipo === 'ticket';
    
    // Filtro por región (solo si no es "TODAS")
    if (filtrosActivos.region && filtrosActivos.region !== 'TODAS') {
      const puntoRegion = (p.region ?? '').trim();
      const regionSeleccionada = filtrosActivos.region.trim();
      if (puntoRegion !== regionSeleccionada) {
        if (isTicket) console.log(`🔍 Ticket ${p.id} rechazado por región: "${puntoRegion}" !== "${regionSeleccionada}"`);
        return false;
      }
    }
    
    // Filtro por estado: NOTA - Los tickets ya están filtrados en la base de datos por estado
    // Solo aplicamos filtro adicional aquí si fuera necesario para casos especiales
    // Como ahora cargamos solo tickets del estado seleccionado, este filtro es redundante
    if (filtrosActivos.estado && filtrosActivos.estado !== '' && filtrosActivos.estado !== 'TODOS' && p.tipo === 'ticket') {
      console.log(`🔍 [FILTRO ESTADO] Ticket ${p.codigo} - Ya filtrado en DB por estado "${filtrosActivos.estado}"`);
      // Los tickets ya están filtrados por estado en la DB, así que todos deberían pasar
      // Pero mantenemos la verificación por seguridad
      const estadosDelTicket = (p.estadoTicket ?? '').split(',').map(e => e.trim());
      const estadoSeleccionado = filtrosActivos.estado.trim();
      
      const tieneEstadoSeleccionado = estadosDelTicket.includes(estadoSeleccionado);
      
      if (!tieneEstadoSeleccionado) {
        console.warn(`⚠️ [FILTRO ESTADO] Inconsistencia: Ticket ${p.codigo} no debería estar aquí:`, {
          estadosBrutos: p.estadoTicket,
          estadosProcesados: estadosDelTicket,
          estadoBuscado: estadoSeleccionado
        });
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
      const ticketsVisibles = (filtrosActivos.region || filtrosActivos.estado) ? tickets.filter(matchesFilters) : tickets;
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
  }, [filtrosActivos.region, filtrosActivos.estado, tickets]);

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
  }, [searchQuery, allPoints, filtrosActivos.region, filtrosActivos.estado]);

  const centerMapOnPoint = (p: Punto) => {
    setSelectedPoint(p);
    setSearchQuery(`${p.codigo} - ${p.nombre ?? ''}`);
    setShowSearchResults(false);

    if (map && p.latitud && p.longitud) map.setView([p.latitud, p.longitud], 15);
  };

  /* ---------- Funciones para selección de tickets y búsqueda de cuadrillas ---------- */
  
  // Función para seleccionar un ticket y buscar cuadrillas disponibles
  const handleTicketSelection = async (ticket: TicketMapData) => {
    setSelectedTicket(ticket);
    limpiarRutas(); // Limpiar rutas anteriores
    
    console.log('🎯 Ticket seleccionado:', ticket.codigo, 'en posición:', ticket.latitud, ticket.longitud);
    
    if (!ticket.latitud || !ticket.longitud) {
      console.error('❌ El ticket seleccionado no tiene coordenadas válidas');
      setCuadrillasParaTicket([]);
      return;
    }
    
    // Buscar cuadrillas disponibles para este ticket
    await buscarCuadrillasParaTicket(ticket);
  };
  
  // Función para buscar cuadrillas disponibles para un ticket específico
  const buscarCuadrillasParaTicket = async (ticket: TicketMapData) => {
    console.log(`🔍 Buscando cuadrillas para ticket ${ticket.codigo}...`);
    
    try {
      // Obtener todas las cuadrillas activas con sus categorías
      const { data: cuadrillasDB, error } = await supabase
        .from('cuadrillas_v1')
        .select('id,codigo,nombre,latitud,longitud,activo,categoria,skill_1,skill_2,skill_3')
        .eq('activo', true)
        .not('latitud', 'is', null)
        .not('longitud', 'is', null);
      
      if (error) {
        console.error('❌ Error cargando cuadrillas:', error);
        return;
      }
      
      if (!cuadrillasDB || cuadrillasDB.length === 0) {
        console.log('⚠️ No se encontraron cuadrillas activas');
        setCuadrillasParaTicket([]);
        return;
      }
      
      // Convertir a formato de mapa
      const cuadrillasDisponibles: CuadrillaMapData[] = cuadrillasDB.map(c => ({
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre || '',
        latitud: c.latitud!,
        longitud: c.longitud!,
        categoria: c.categoria as 'A' | 'B' | 'C',
        activo: c.activo,
        skill_1: c.skill_1,
        skill_2: c.skill_2,
        skill_3: c.skill_3,
        tipo: 'cuadrilla' as const,
        region: '' // Se puede agregar si es necesario
      }));
      
      console.log(`✅ Cuadrillas encontradas: ${cuadrillasDisponibles.length}`);
      
      // Filtrar por skills si es necesario (basado en la categoría del ticket)
      const cuadrillasFiltradas = filtrarCuadrillasPorCapacidad(cuadrillasDisponibles, ticket);
      
      setCuadrillasParaTicket(cuadrillasFiltradas);
      
      // Calcular rutas por categoría
      await calcularRutasPorCategoria(
        ticket.latitud,
        ticket.longitud,
        cuadrillasFiltradas.map(c => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          latitud: c.latitud,
          longitud: c.longitud,
          categoria: c.categoria || undefined
        }))
      );
      
    } catch (error) {
      console.error('❌ Error buscando cuadrillas:', error);
      setCuadrillasParaTicket([]);
    }
  };
  
  // Función para filtrar cuadrillas según sus capacidades/skills
  const filtrarCuadrillasPorCapacidad = (cuadrillas: CuadrillaMapData[], ticket: TicketMapData): CuadrillaMapData[] => {
    // Por ahora retornamos todas, pero aquí se puede implementar lógica de filtrado
    // basada en los skills de las cuadrillas y los requerimientos del ticket
    
    console.log(`🔧 Evaluando ${cuadrillas.length} cuadrillas para ticket ${ticket.codigo}`);
    
    // Agrupar por categoría para mostrar estadísticas
    const porCategoria = cuadrillas.reduce((acc, c) => {
      const cat = c.categoria || 'Sin categoría';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Cuadrillas por categoría:', porCategoria);
    
    return cuadrillas; // Por ahora retornamos todas
  };
  
  // Función para limpiar selección de ticket
  const limpiarSeleccionTicket = () => {
    setSelectedTicket(null);
    setCuadrillasParaTicket([]);
    limpiarRutas();
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
    () => (filtrosActivos.region ? sites.filter(matchesFilters) : sites),
    [sites, filtrosActivos.region, filtrosActivos.estado]
  );
  const visibleCuadrillas = useMemo(() => {
    // Si hay filtro de tickets activo, SOLO mostrar cuadrillas dentro del radio configurado
    if (filtrosActivos.estado && tickets.length > 0) {
      console.log(`🔍 Aplicando filtro EXCLUSIVO de radio de ${searchRadius}km para cuadrillas cerca de tickets con estado: ${filtrosActivos.estado}`);
      
      // Obtener tickets visibles (ya filtrados por estado)
      const ticketsVisibles = tickets.filter(matchesFilters);
      console.log(`Tickets visibles con estado "${filtrosActivos.estado}": ${ticketsVisibles.length}`);
      
      // SOLO mostrar cuadrillas dentro del radio configurado de cualquier ticket visible
      const cuadrillasEnRadio = cuadrillas.filter(cuadrilla => {
        // Verificar si la cuadrilla tiene coordenadas válidas
        if (!cuadrilla.latitud || !cuadrilla.longitud) {
          return false;
        }
        
        // Verificar si está dentro del radio configurado de algún ticket visible
        return ticketsVisibles.some(ticket => {
          if (!ticket.latitud || !ticket.longitud) {
            return false;
          }
          
          const distancia = calculateDistance(
            cuadrilla.latitud!,
            cuadrilla.longitud!,
            ticket.latitud,
            ticket.longitud
          );
          
          return distancia <= searchRadius; // Radio configurable
        });
      });
      
      console.log(`Cuadrillas encontradas dentro de ${searchRadius}km: ${cuadrillasEnRadio.length}`);
      return cuadrillasEnRadio;
    }
    
    // Si NO hay filtro de tickets, aplicar filtro por región (lógica original)
    return (filtrosActivos.region && filtrosActivos.region !== 'TODAS') ? cuadrillas.filter(matchesFilters) : cuadrillas;
  }, [cuadrillas, filtrosActivos.region, filtrosActivos.estado, tickets, searchRadius]);
  const visibleTickets = useMemo(() => {
    console.log('🎫 [FILTRADO TICKETS] ===== INICIANDO FILTRADO =====');
    console.log('🎫 filtrosActivos.estado:', JSON.stringify(filtrosActivos.estado));
    console.log('🎫 tickets totales cargados:', tickets.length);
    
    // Mostrar algunos ejemplos de tickets cargados
    if (tickets.length > 0) {
      console.log('🎫 Ejemplo tickets cargados:', tickets.slice(0, 3).map(t => ({
        id: t.id,
        codigo: t.codigo,
        estadoTicket: t.estadoTicket
      })));
    }
    
    // Solo aplicar filtros si hay valores específicos seleccionados
    const hasRegionFilter = filtrosActivos.region && filtrosActivos.region !== 'TODAS';
    const hasEstadoFilter = filtrosActivos.estado && filtrosActivos.estado !== '' && filtrosActivos.estado !== 'TODOS';
    
    console.log('🎫 Filtros activos:', { 
      hasRegionFilter, 
      hasEstadoFilter, 
      regionValue: filtrosActivos.region, 
      estadoValue: filtrosActivos.estado 
    });
    
    let result: Punto[];
    
    if (hasRegionFilter || hasEstadoFilter) {
      console.log('🎫 Aplicando filtros...');
      result = tickets.filter((ticket, index) => {
        const matches = matchesFilters(ticket);
        if (index < 3) { // Solo log de los primeros 3 para no saturar
          console.log(`🎫 Ticket ${ticket.codigo}: matches=${matches}, estado="${ticket.estadoTicket}"`);
        }
        return matches;
      });
    } else {
      console.log('🎫 Sin filtros activos, mostrando todos');
      result = tickets;
    }
    
    console.log(`🎫 [RESULTADO FINAL] ${result.length} tickets visibles de ${tickets.length} totales`);
    
    // Mostrar tickets visibles finales
    if (result.length > 0) {
      console.log('🎫 Tickets visibles:', result.slice(0, 3).map(t => ({
        id: t.id,
        codigo: t.codigo,
        estadoTicket: t.estadoTicket
      })));
    }
    
    return result;
  }, [tickets, filtrosActivos.region, filtrosActivos.estado]);
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

          {/* Botones de Filtrado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={aplicarFiltros}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
              🔍 BUSCAR
            </button>
            <button
              onClick={limpiarFiltros}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
            >
              🗑️ LIMPIAR
            </button>
            {/* Botón de prueba COMPUTE ROUTER */}
            <button
              onClick={async () => {
                console.log('🧪 [COMPUTE ROUTER] Iniciando prueba automática...');
                
                // Asegurar que tickets y cuadrillas estén activos
                if (!showTickets) {
                  console.log('🎫 Activando tickets...');
                  setShowTickets(true);
                }
                if (!showCuadrillas) {
                  console.log('👥 Activando cuadrillas...');
                  setShowCuadrillas(true);
                }
                
                // Cargar datos si es necesario
                if (!ticketsLoaded) {
                  console.log('📊 Cargando tickets...');
                  await loadTickets('NUEVO');
                }
                if (!cuadrillasLoaded) {
                  console.log('📊 Cargando cuadrillas...');
                  await loadCuadrillas();
                }
                
                // Esperar un momento para que se procesen los datos
                setTimeout(() => {
                  const ticketsDisponibles = visibleTickets.filter(t => t.tipo === 'ticket' && t.latitud && t.longitud);
                  
                  if (ticketsDisponibles.length > 0) {
                    const ticketPrueba = ticketsDisponibles[0];
                    console.log('🎯 [COMPUTE ROUTER] Seleccionando ticket para prueba:', ticketPrueba.codigo);
                    
                    handleTicketSelection({
                      id: ticketPrueba.id,
                      codigo: ticketPrueba.codigo,
                      nombre: ticketPrueba.nombre || '',
                      latitud: ticketPrueba.latitud!,
                      longitud: ticketPrueba.longitud!,
                      region: ticketPrueba.region || '',
                      estado: ticketPrueba.estadoTicket || '',
                      categoria: ticketPrueba.categoria || '',
                      tipo: 'ticket'
                    });
                  } else {
                    console.warn('⚠️ No hay tickets visibles para prueba');
                    alert('❌ No hay tickets visibles para probar.\n\n1. Activa checkbox "🎫 Tickets"\n2. Selecciona estado y presiona BUSCAR\n3. Presiona este botón nuevamente');
                  }
                }, 1500); // Dar más tiempo para cargar datos
              }}
              style={{
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0a800'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffc107'}
            >
              🧪 PRUEBA AUTO
            </button>
          </div>

          {/* Control de Radio de Búsqueda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>Radio (km):</label>
            <input
              type="number"
              min="1"
              max="100"
              value={searchRadius}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 1 && value <= 100) {
                  setSearchRadius(value);
                }
              }}
              style={{
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: 6,
                fontSize: 13,
                width: 70,
                background: 'white',
                textAlign: 'center',
              }}
              title="Radio de búsqueda de cuadrillas (1-100 km)"
            />
          </div>

          {/* Leyenda de Categorías de Cuadrillas */}
          {showCuadrillas && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 15,
              padding: '8px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 6,
              border: '1px solid #dee2e6',
              fontSize: 12,
              fontWeight: 600
            }}>
              <span style={{ color: '#333', marginRight: 5 }}>Categorías:</span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 12,
                  height: 12,
                  backgroundColor: '#007bff',
                  border: '1px solid #004085',
                  borderRadius: '50%'
                }}></div>
                <span style={{ color: '#333' }}>A = Azul</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 12,
                  height: 12,
                  backgroundColor: '#28a745',
                  border: '1px solid #155724',
                  borderRadius: '50%'
                }}></div>
                <span style={{ color: '#333' }}>B = Verde</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 12,
                  height: 12,
                  backgroundColor: '#ffffff',
                  border: '2px solid #333333',
                  borderRadius: '50%'
                }}></div>
                <span style={{ color: '#333' }}>C = Blanco</span>
              </div>
            </div>
          )}
          

        </div>

        {/* Indicador de Filtros Activos */}
        {(filtrosActivos.region || filtrosActivos.estado) && (
          <div
            style={{
              backgroundColor: '#e7f3ff',
              border: '1px solid #b3d9ff',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 12,
              color: '#0056b3'
            }}
          >
            <strong>🔍 Filtros Activos: </strong>
            {filtrosActivos.region && <span>Región: {filtrosActivos.region}</span>}
            {filtrosActivos.region && filtrosActivos.estado && <span> | </span>}
            {filtrosActivos.estado && <span>Estado: {filtrosActivos.estado}</span>}
          </div>
        )}

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
              🎫 Tickets: {ticketsLoaded ? `${(filtrosActivos.region || filtrosActivos.estado) ? visibleTickets.length : totals.tickets}/${totals.tickets}` : loadingTickets ? '⏳' : 'No cargado'} | 
              🔗 Total: {((filtrosActivos.region || filtrosActivos.estado) ? (visibleSites.length + visibleCuadrillas.length + visibleTickets.length) : totals.total)}/{totals.total}
              {(filtrosActivos.region || filtrosActivos.estado) && showTickets && (
                <span style={{ color: '#ff9500', fontWeight: 600 }}>
                  {' '} | 📏 Radio: {searchRadius}km
                </span>
              )}
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

      {/* Panel de información de ticket seleccionado y cuadrillas */}
      {selectedTicket && (
        <div style={{
          position: 'absolute',
          top: 120,
          right: 20,
          width: 350,
          maxHeight: '60vh',
          overflowY: 'auto',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid #007bff',
          borderRadius: 8,
          padding: 16,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 1000
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: '1px solid #dee2e6'
          }}>
            <h3 style={{ 
              margin: 0, 
              color: '#007bff', 
              fontSize: 16,
              fontWeight: 600
            }}>
              🎯 Ticket Seleccionado
            </h3>
            <button
              onClick={limpiarSeleccionTicket}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              ✖️ Cerrar
            </button>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
              📍 {selectedTicket.codigo} - {selectedTicket.nombre}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              📌 Región: {selectedTicket.region || 'N/A'}<br/>
              📊 Estado: {selectedTicket.estado || 'N/A'}<br/>
              🏷️ Categoría: {selectedTicket.categoria || 'N/A'}<br/>
              📍 Coordenadas: {selectedTicket.latitud.toFixed(6)}, {selectedTicket.longitud.toFixed(6)}
            </div>
          </div>

          {/* Estado de cálculo de rutas */}
          {calculandoRutas && (
            <div style={{ 
              textAlign: 'center', 
              padding: 12,
              backgroundColor: '#e3f2fd',
              borderRadius: 4,
              marginBottom: 12 
            }}>
              <div style={{ fontSize: 14, color: '#1976d2' }}>
                🔄 Calculando rutas...
              </div>
            </div>
          )}

          {/* Error en cálculo de rutas */}
          {errorRutas && (
            <div style={{ 
              padding: 12,
              backgroundColor: '#ffebee',
              borderRadius: 4,
              marginBottom: 12,
              color: '#d32f2f',
              fontSize: 12
            }}>
              ❌ Error: {errorRutas}
            </div>
          )}

          {/* Cuadrillas encontradas */}
          <div>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              color: '#6f42c1', 
              fontSize: 14,
              fontWeight: 600
            }}>
              👥 Cuadrillas Disponibles ({cuadrillasParaTicket.length})
            </h4>
            
            {cuadrillasParaTicket.length === 0 ? (
              <div style={{ 
                padding: 12, 
                textAlign: 'center', 
                color: '#666',
                backgroundColor: '#f8f9fa',
                borderRadius: 4,
                fontSize: 12
              }}>
                No hay cuadrillas disponibles
              </div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {cuadrillasParaTicket.map(cuadrilla => (
                  <div 
                    key={cuadrilla.id}
                    style={{
                      padding: 8,
                      marginBottom: 6,
                      backgroundColor: '#f8f9fa',
                      borderRadius: 4,
                      borderLeft: `4px solid ${getCategoriaColors(cuadrilla.categoria).fillColor}`,
                      fontSize: 12
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#333' }}>
                      {cuadrilla.codigo} - {cuadrilla.nombre}
                    </div>
                    <div style={{ color: '#666', fontSize: 11 }}>
                      Categoría: {cuadrilla.categoria || 'N/A'} | 
                      Activo: {cuadrilla.activo ? '✅' : '❌'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resultados de rutas por categoría */}
          {rutasPorCategoria && rutasPorCategoria.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ 
                margin: '0 0 8px 0', 
                color: '#28a745', 
                fontSize: 14,
                fontWeight: 600
              }}>
                🛣️ Mejores Rutas por Categoría
              </h4>
              
              {rutasPorCategoria.map((ruta, index) => (
                <div 
                  key={index}
                  style={{
                    padding: 10,
                    marginBottom: 8,
                    backgroundColor: getCategoriaColors(ruta.categoria as 'A' | 'B' | 'C' | null | undefined).fillColor + '15',
                    borderRadius: 4,
                    borderLeft: `4px solid ${getCategoriaColors(ruta.categoria as 'A' | 'B' | 'C' | null | undefined).fillColor}`,
                    fontSize: 12
                  }}
                >
                  <div style={{ 
                    fontWeight: 600, 
                    color: '#333',
                    marginBottom: 4
                  }}>
                    Categoría {ruta.categoria}: {ruta.cuadrillaCodigo}
                  </div>
                  <div style={{ color: '#666', fontSize: 11 }}>
                    ⏱️ Tiempo: {ruta.tiempoConTrafico.toFixed(1)} min<br/>
                    📏 Distancia: {ruta.distanciaKm.toFixed(2)} km
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

        {/* Cuadrillas (datos reales actualizados cada 3 segundos) */}
        {showCuadrillas &&
          visibleCuadrillas
            .filter(c => c.latitud !== null && c.longitud !== null && typeof c.latitud === 'number' && typeof c.longitud === 'number')
            .map((c) => {
              const isSelected =
                selectedPoint?.codigo === c.codigo && selectedPoint.tipo === 'cuadrilla';
              
              // Resaltar específicamente la cuadrilla ID=20
              const isCuadrilla20 = c.id === 20;
              
              // Si hay filtro de tickets activo, todas las cuadrillas visibles están dentro del radio
              const isWithinRadius = selectedEstado && tickets.length > 0;
              
              // Obtener colores basados en categoría
              const categoriaColors = getCategoriaColors(c.categoriaCuadrilla);
              
              // Debug: verificar categorías
              if (Number(c.id) <= 5) { // Solo mostrar para las primeras 5 cuadrillas para no saturar logs
                console.log(`Cuadrilla ${c.codigo} (ID: ${c.id}): categoria=${c.categoriaCuadrilla}, colors=`, categoriaColors);
              }
              
              return (
                <CircleMarker
                  key={`cuad-${c.codigo}`}
                  center={[c.latitud!, c.longitud!]}
                  radius={isCuadrilla20 ? 12 : (isSelected ? 10 : (isWithinRadius ? 8 : 5))}
                  pathOptions={{
                    // SIEMPRE usar colores por categoría, excepto casos especiales
                    color: isCuadrilla20 ? '#ff6b00' : (isSelected ? '#ff0000' : categoriaColors.color),
                    fillColor: isCuadrilla20 ? '#ffa500' : (isSelected ? '#ffff00' : categoriaColors.fillColor),
                    // Borde más grueso cuando está dentro del radio para indicar que está activo
                    weight: isCuadrilla20 ? 4 : (isSelected ? 3 : (isWithinRadius ? 4 : 2)),
                    // Mayor opacidad cuando está dentro del radio
                    fillOpacity: isCuadrilla20 ? 0.9 : (isWithinRadius ? 0.9 : 0.7),
                  }}
                  eventHandlers={{ click: () => centerMapOnPoint(c) }}
                >
                  <Popup>
                    <b>{isCuadrilla20 ? '⭐ CUADRILLA ESPECIAL' : '👥 CUADRILLA'}</b>
                    <br />
                    Código: {c.codigo}
                    <br />
                    ID: {c.id}
                    <br />
                    Nombre: {c.nombre}
                    <br />
                    Zona: {c.region}
                    <br />
                    Supervisor: {c.supervisor || 'No asignado'}
                    <br />
                    Teléfono: {c.telefono || 'No disponible'}
                    <br />
                    Estado: {c.activo ? 'Activo' : 'Inactivo'}
                    <br />
                    <b>🔧 Tipo: {c.tipoCuadrilla || 'No definido'}</b>
                    <br />
                    <b>🛠️ Skills:</b>
                    <br />
                    • Skill 1: {(c.skill_1 && c.skill_1.trim()) ? c.skill_1.trim() : 'No definido'}
                    <br />
                    • Skill 2: {(c.skill_2 && c.skill_2.trim()) ? c.skill_2.trim() : 'No definido'}
                    <br />
                    • Skill 3: {(c.skill_3 && c.skill_3.trim()) ? c.skill_3.trim() : 'No definido'}
                    <br />
                    <b>🏷️ Categoría: {c.categoriaCuadrilla || 'No definida'}</b>
                    <br />
                    📍 Coordenadas: {c.latitud}, {c.longitud}
                    {isCuadrilla20 && (
                      <>
                        <br />
                        <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>
                          🌟 CUADRILLA RESALTADA
                        </span>
                      </>
                    )}
                    {isWithinRadius && (
                      <>
                        <br />
                        <span style={{ color: '#ff9500', fontWeight: 'bold' }}>
                          🎯 DENTRO DE RADIO {searchRadius}KM
                        </span>
                      </>
                    )}
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
                radius={isSelected ? 14 : 8}
                pathOptions={{
                  color: isSelected ? '#ff0000' : '#8b0000',
                  fillColor: isSelected ? '#ffff00' : '#dc3545',
                  weight: isSelected ? 4 : 3,
                  fillOpacity: 0.8,
                  opacity: 1,
                }}
                eventHandlers={{ 
                  click: () => {
                    centerMapOnPoint(t);
                    
                    // Asegurar que cuadrillas estén activas para mostrar las rutas
                    if (!showCuadrillas) {
                      setShowCuadrillas(true);
                      if (!cuadrillasLoaded) {
                        loadCuadrillas();
                      }
                    }
                    
                    // Manejar selección de ticket para búsqueda de cuadrillas
                    handleTicketSelection({
                      id: t.id,
                      codigo: t.codigo,
                      nombre: t.nombre || '',
                      latitud: t.latitud!,
                      longitud: t.longitud!,
                      region: t.region || '',
                      estado: t.estadoTicket || '',
                      categoria: t.categoria || '',
                      tipo: 'ticket'
                    });
                  } 
                }}
              >
                <Popup>
                  <div>
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
                    
                    {/* Botón para calcular mejor ruta */}
                    <div style={{ 
                      marginTop: 10, 
                      paddingTop: 10, 
                      borderTop: '1px solid #eee' 
                    }}>
                      <button
                        onClick={() => {
                          if (t.latitud && t.longitud) {
                            // Filtrar solo cuadrillas dentro del radio actual
                            const cuadrillasEnRango = visibleCuadrillas.filter(c => 
                              c.latitud && c.longitud && c.activo !== false &&
                              c.tipo === 'cuadrilla' &&
                              t.latitud && t.longitud &&
                              calculateDistance(t.latitud, t.longitud, c.latitud, c.longitud) <= searchRadius
                            ).map(c => ({
                              id: c.id as number,
                              codigo: c.codigo,
                              nombre: c.nombre || '',
                              latitud: c.latitud as number,
                              longitud: c.longitud as number
                            }));
                            
                            if (cuadrillasEnRango.length > 0) {
                              // Agregar categoría a las cuadrillas para el nuevo cálculo
                              const cuadrillasConCategoria = cuadrillasEnRango.map((c, index) => {
                                let categoria = (c as any).categoriaCuadrilla;
                                
                                // Si no tiene categoría asignada, distribuir automáticamente para pruebas
                                if (!categoria || categoria === null) {
                                  const categorias = ['A', 'B', 'C'];
                                  categoria = categorias[index % 3]; // Distribución circular A, B, C, A, B, C...
                                }
                                
                                return {
                                  ...c,
                                  categoria
                                };
                              });
                              
                              // Debug: Mostrar categorías de las cuadrillas en rango
                              console.log('🔍 Debug Categorías en rango:', cuadrillasConCategoria.map(c => `${c.codigo}: ${c.categoria}`));
                              
                              calcularRutasPorCategoria(t.latitud, t.longitud, cuadrillasConCategoria);
                            } else {
                              alert('No hay cuadrillas disponibles en el rango actual');
                            }
                          }
                        }}
                        disabled={calculandoRutas}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: calculandoRutas ? '#ccc' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 'bold',
                          cursor: calculandoRutas ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {calculandoRutas ? '🔄 Calculando...' : '🎯 Mejor Ruta por Categoría'}
                      </button>
                      
                      {/* Información de categorías disponibles */}
                      <div style={{ 
                        marginTop: 6, 
                        padding: 4, 
                        backgroundColor: '#e9ecef', 
                        borderRadius: 3,
                        fontSize: 9
                      }}>
                        <strong>Cuadrillas en rango ({visibleCuadrillas.filter(c => 
                          c.tipo === 'cuadrilla' && 
                          t.latitud !== null && t.longitud !== null && c.latitud !== null && c.longitud !== null &&
                          calculateDistance(t.latitud, t.longitud, c.latitud, c.longitud) <= searchRadius
                        ).length}):</strong>
                        <div style={{ marginTop: 2 }}>
                          {(() => {
                            const cuadrillasEnRangoLocal = visibleCuadrillas.filter(c => 
                              c.tipo === 'cuadrilla' && 
                              t.latitud !== null && t.longitud !== null && c.latitud !== null && c.longitud !== null &&
                              calculateDistance(t.latitud, t.longitud, c.latitud, c.longitud) <= searchRadius
                            );
                            const categoriaCount = cuadrillasEnRangoLocal.reduce((acc, c, index) => {
                              let categoria = (c as any).categoriaCuadrilla;
                              if (!categoria) categoria = ['A', 'B', 'C'][index % 3];
                              acc[categoria] = (acc[categoria] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);
                            
                            return Object.entries(categoriaCount).map(([cat, count]) => (
                              <span key={cat} style={{ 
                                marginRight: 8,
                                color: cat === 'A' ? '#007bff' : cat === 'B' ? '#28a745' : '#dc3545'
                              }}>
                                {cat}: {count}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Botón de debug para verificar rutas */}
                      <button
                        onClick={() => {
                          console.log('🔍 Estado actual de rutas por categoría:', rutasPorCategoria);
                          if (rutasPorCategoria && rutasPorCategoria.length > 0) {
                            alert(`Rutas calculadas: ${rutasPorCategoria.length}\n${rutasPorCategoria.map(r => `${r.categoria}: ${r.cuadrillaCodigo} (${r.tiempoConTrafico.toFixed(1)} min)`).join('\n')}`);
                          } else {
                            alert('No hay rutas calculadas. Haz clic en "Mejor Ruta por Categoría" primero.');
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 10,
                          marginTop: 4,
                          cursor: 'pointer'
                        }}
                      >
                        🔍 Debug: Ver Rutas
                      </button>
                      
                      {rutasPorCategoria && rutasPorCategoria.length > 0 && (
                        <div style={{ 
                          marginTop: 8, 
                          padding: 8, 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: 4,
                          fontSize: 11
                        }}>
                          <strong>� Mejores por Categoría:</strong><br/>
                          {rutasPorCategoria.map((ruta, index) => {
                            const bgColor = ruta.categoria === 'A' ? '#e3f2fd' : 
                                           ruta.categoria === 'B' ? '#e8f5e8' : '#f5f5f5';
                            const textColor = ruta.categoria === 'C' ? '#333' : '#000';
                            
                            return (
                              <div key={`cat-${ruta.categoria}`} style={{
                                marginTop: index > 0 ? 6 : 4,
                                padding: 6,
                                backgroundColor: bgColor,
                                borderRadius: 3,
                                border: `2px solid ${ruta.color}`,
                                color: textColor
                              }}>
                                <div style={{ fontWeight: 'bold' }}>
                                  � Categoría {ruta.categoria}: {ruta.cuadrillaCodigo}
                                </div>
                                <div style={{ fontSize: '10px', marginTop: 2 }}>
                                  ⏱️ {ruta.tiempoConTrafico.toFixed(1)} min | 📏 {ruta.distanciaKm.toFixed(2)} km
                                </div>
                              </div>
                            );
                          })}
                          <small style={{ color: '#666', fontSize: '9px', display: 'block', marginTop: 6 }}>
                            * Se muestra la cuadrilla MÁS RÁPIDA de cada categoría disponible
                          </small>
                        </div>
                      )}
                      
                      {errorRutas && (
                        <div style={{ 
                          marginTop: 8, 
                          padding: 8, 
                          backgroundColor: '#f8d7da', 
                          borderRadius: 4,
                          fontSize: 11,
                          color: '#721c24'
                        }}>
                          ⚠️ {errorRutas}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Mostrar líneas directas por categoría */}
        {rutasPorCategoria && rutasPorCategoria.length > 0 && console.log('🗺️ Renderizando líneas directas por categoría:', rutasPorCategoria)}
        {rutasPorCategoria && rutasPorCategoria.map((rutaCategoria, index) => {
          // Encontrar la cuadrilla correspondiente para obtener coordenadas exactas
          const cuadrilla = visibleCuadrillas.find(c => c.id === rutaCategoria.cuadrillaId);
          if (!cuadrilla || !cuadrilla.latitud || !cuadrilla.longitud) return null;

          // Usar el ticket seleccionado o el primer ticket visible
          let ticket = selectedTicket;
          if (!ticket) {
            const ticketsVisibles = visibleTickets.filter(t => t.tipo === 'ticket');
            const puntoTicket = ticketsVisibles[0];
            if (puntoTicket) {
              ticket = {
                id: puntoTicket.id,
                codigo: puntoTicket.codigo,
                nombre: puntoTicket.nombre || '',
                latitud: puntoTicket.latitud!,
                longitud: puntoTicket.longitud!,
                region: puntoTicket.region || undefined,
                estado: puntoTicket.estadoTicket || undefined,
                categoria: puntoTicket.categoria || undefined,
                tipo: 'ticket'
              };
            }
          }
          if (!ticket || !ticket.latitud || !ticket.longitud) return null;

          return (
            <ComputedRoute
              key={`computed-route-${rutaCategoria.categoria}-${index}`}
              routeData={rutaCategoria}
            />
          );
        })}

        {/* Resaltar cuadrillas por categoría */}
        {rutasPorCategoria && rutasPorCategoria.map((rutaCategoria, index) => {
          const cuadrillaResaltada = visibleCuadrillas.find(c => c.id === rutaCategoria.cuadrillaId);
          if (!cuadrillaResaltada) return null;
          
          return (
            <CircleMarker
              key={`fastest-cat-${rutaCategoria.categoria}-${index}`}
              center={[cuadrillaResaltada.latitud!, cuadrillaResaltada.longitud!]}
              radius={18}
              pathOptions={{
                color: rutaCategoria.color,
                fillColor: rutaCategoria.color,
                weight: 4,
                fillOpacity: 0.2,
                opacity: 1,
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
