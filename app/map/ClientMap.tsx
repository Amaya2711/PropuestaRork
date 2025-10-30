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
      return { color: '#b8860b', fillColor: '#ffd700' }; // Dorado
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
  
  // Radio configurable para búsqueda de cuadrillas (en kilómetros)
  const [searchRadius, setSearchRadius] = useState<number>(20); // 20km por defecto
  
  // Total real de tickets en la base de datos
  const [totalTicketsDB, setTotalTicketsDB] = useState<number>(0);
  // Total de tickets filtrados por estado
  const [totalTicketsFiltrados, setTotalTicketsFiltrados] = useState<number>(0);

  // Estados para el refresco automático de cuadrillas
  const [cuadrillasRefreshInterval, setCuadrillasRefreshInterval] = useState<NodeJS.Timeout | null>(null);
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

      console.log(`Cargando tickets con estado "${estadoFiltro}" para ${sitesRaw.length} sites disponibles`);

      // Solo cargar tickets con el estado específico
      const { data: ticketsRaw, error } = await supabase
        .from('tickets_v1')
        .select('id,ticket_source,site_id,site_name,task_category,estado,created_at')
        .eq('estado', estadoFiltro);

      if (error) {
        console.error('❌ Error cargando tickets filtrados:', error);
        throw error;
      }

      console.log(`✅ Tickets cargados: ${ticketsRaw?.length || 0} con estado "${estadoFiltro}"`);

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
        
        // Debug: Mostrar skills de las primeras cuadrillas
        if (cuadrillasActualizadas.length > 0) {
          console.log('🔍 Debug Skills - Primeras 3 cuadrillas:');
          cuadrillasActualizadas.slice(0, 3).forEach(c => {
            console.log(`ID ${c.id}: skill_1="${c.skill_1}", skill_2="${c.skill_2}", skill_3="${c.skill_3}"`);
          });
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
      
      // Solo cargar tickets si hay un estado seleccionado
      if (selectedEstado) {
        console.log(`🎫 Cargando tickets con estado seleccionado: ${selectedEstado}`);
        if (!ticketsLoaded) {
          loadTickets(selectedEstado);
        }
      } else {
        console.log('⚠️ No hay estado seleccionado. Selecciona un estado para ver tickets.');
      }
    } else {
      // Limpiar filtro de estado cuando se desactiva tickets
      console.log('🎫 Desactivando filtro de tickets - Limpiando datos');
      setTickets([]);
      setTicketsLoaded(false);
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
      // Recargar tickets si están activos (sin importar si ya estaban cargados)
      if (showTickets) {
        console.log(`🔄 Estado cambiado a "${selectedEstado}" - Recargando tickets...`);
        reloadTicketsByEstado(selectedEstado);
      }
    } else {
      // Si no hay estado seleccionado, usar el total general
      setTotalTicketsFiltrados(totalTicketsDB);
      
      // Si no hay estado pero los tickets están activos, limpiar tickets actuales
      if (showTickets) {
        console.log('🧹 No hay estado seleccionado - Limpiando tickets del mapa');
        setTickets([]);
        setTicketsLoaded(false);
      }
    }
  }, [selectedEstado, totalTicketsDB, showTickets]);

  // Estados únicos para el selector (mantenemos compatibilidad)
  const estados = useMemo(() => {
    return estadosCatalogo.map(e => e.nombre).sort((a, b) => a.localeCompare(b));
  }, [estadosCatalogo]);

  // ¿El punto coincide con los filtros seleccionados?
  const matchesFilters = (p: Punto) => {
    // Filtro por región (solo si no es "TODAS")
    if (selectedRegion && selectedRegion !== 'TODAS') {
      const puntoRegion = (p.region ?? '').trim();
      const regionSeleccionada = selectedRegion.trim();
      if (puntoRegion !== regionSeleccionada) {
        return false;
      }
    }
    
    // Filtro por estado (solo aplica a tickets y si no es "TODOS" o vacío)
    if (selectedEstado && selectedEstado !== '' && selectedEstado !== 'TODOS' && p.tipo === 'ticket') {
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
  const visibleCuadrillas = useMemo(() => {
    // Si hay filtro de tickets activo, SOLO mostrar cuadrillas dentro del radio configurado
    if (selectedEstado && tickets.length > 0) {
      console.log(`🔍 Aplicando filtro EXCLUSIVO de radio de ${searchRadius}km para cuadrillas cerca de tickets con estado: ${selectedEstado}`);
      
      // Obtener tickets visibles (ya filtrados por estado)
      const ticketsVisibles = tickets.filter(matchesFilters);
      console.log(`Tickets visibles con estado "${selectedEstado}": ${ticketsVisibles.length}`);
      
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
    return (selectedRegion && selectedRegion !== 'TODAS') ? cuadrillas.filter(matchesFilters) : cuadrillas;
  }, [cuadrillas, selectedRegion, selectedEstado, tickets, searchRadius]);
  const visibleTickets = useMemo(() => {
    // Debug de valores exactos
    console.log('DEBUG selectedEstado:', JSON.stringify(selectedEstado), 'tipo:', typeof selectedEstado, 'length:', selectedEstado?.length);
    console.log('DEBUG selectedRegion:', JSON.stringify(selectedRegion), 'tipo:', typeof selectedRegion);
    
    // Solo aplicar filtros si hay valores específicos seleccionados (no "TODOS" o vacío)
    const hasRegionFilter = selectedRegion && selectedRegion !== 'TODAS';
    const hasEstadoFilter = selectedEstado && selectedEstado !== '' && selectedEstado !== 'TODOS';
    
    const result = (hasRegionFilter || hasEstadoFilter) ? tickets.filter(matchesFilters) : tickets;
    console.log(`visibleTickets useMemo: ${result.length} tickets visible (región: "${selectedRegion || 'TODAS'}", estado: "${selectedEstado || 'TODOS'}")`);
    console.log('Filtros activos:', { hasRegionFilter, hasEstadoFilter, selectedRegion, selectedEstado });
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
              {selectedEstado && showTickets && (
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
          visibleCuadrillas.map((c) => {
            if (!c.latitud || !c.longitud) return null;
            const isSelected =
              selectedPoint?.codigo === c.codigo && selectedPoint.tipo === 'cuadrilla';
            
            // Resaltar específicamente la cuadrilla ID=20
            const isCuadrilla20 = c.id === 20;
            
            // Si hay filtro de tickets activo, todas las cuadrillas visibles están dentro del radio
            const isWithinRadius = selectedEstado && tickets.length > 0;
            
            // Obtener colores basados en categoría
            const categoriaColors = getCategoriaColors(c.categoriaCuadrilla);
            
            // Debug: verificar categorías
            if (c.id <= 5) { // Solo mostrar para las primeras 5 cuadrillas para no saturar logs
              console.log(`Cuadrilla ${c.codigo} (ID: ${c.id}): categoria=${c.categoriaCuadrilla}, colors=`, categoriaColors);
            }
            
            return (
              <CircleMarker
                key={`cuad-${c.codigo}`}
                center={[c.latitud, c.longitud]}
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
                  <b>� Tipo: {c.tipoCuadrilla || 'No definido'}</b>
                  <br />
                  <b>�🛠️ Skills:</b>
                  <br />
                  • Skill 1: {(c.skill_1 && c.skill_1.trim()) ? c.skill_1.trim() : 'No definido'}
                  <br />
                  • Skill 2: {(c.skill_2 && c.skill_2.trim()) ? c.skill_2.trim() : 'No definido'}
                  <br />
                  • Skill 3: {(c.skill_3 && c.skill_3.trim()) ? c.skill_3.trim() : 'No definido'}
                  <br />
                  <b>🏷️ Categoría: {c.categoriaCuadrilla || 'No definida'}</b>
                  <br />
                  • Skill 3: {(c.skill_3 && c.skill_3.trim()) ? c.skill_3.trim() : 'No definido'}
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
