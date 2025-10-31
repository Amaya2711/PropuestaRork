'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouteCalculator } from '@/hooks/useRouteCalculator';

// Declaración de tipos para Google Maps
declare global {
  interface Window {
    google: typeof google;
    initMapCallback: () => void;
  }
}

/* ===================== Tipos (copiados de ClientMap) ===================== */
type SiteDB = {
  id: number | string;
  codigo: string;
  site: string | null;
  region: string | null;
  latitud: number;
  longitud: number;
};

type CuadrillaDB = {
  id: number | string;
  codigo: string;
  cuadrilla: string | null;
  region: string | null;
  latitud: number;
  longitud: number;
  tipo: string | null;
  categoria: string | null;
};

type TicketDB = {
  id: number | string;
  ticket_source: string;
  site_id: string;
  site_name: string;
  task_category: string;
  estado: string;
  created_at: string;
};

type Punto = {
  id: string;
  codigo: string;
  nombre: string;
  region?: string;
  latitud: number;
  longitud: number;
  tipo: 'site' | 'cuadrilla' | 'ticket';
  ticketId?: string;
  estadoTicket?: string;
  categoria?: string;
};

type EstadoCatalogo = {
  codigo: string;
  nombre: string;
  descripcion: string;
};

const GoogleMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  // Estados copiados de ClientMap
  const [allPoints, setAllPoints] = useState<Punto[]>([]);
  const [sites, setSites] = useState<Punto[]>([]);
  const [cuadrillas, setCuadrillas] = useState<Punto[]>([]);
  const [tickets, setTickets] = useState<Punto[]>([]);

  // Estados de carga
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingCuadrillas, setLoadingCuadrillas] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de visibilidad
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
  const [totalTicketsFiltrados, setTotalTicketsFiltrados] = useState<number>(0);

  // Estados para el catálogo de estados
  const [estadosCatalogo, setEstadosCatalogo] = useState<EstadoCatalogo[]>([]);

  // Estados para cuadrillas cercanas y rutas
  const [showClosestCuadrillas, setShowClosestCuadrillas] = useState(false);
  const [closestCuadrillas, setClosestCuadrillas] = useState<any[]>([]);
  const [calculatingClosest, setCalculatingClosest] = useState(false);
  const [routeLines, setRouteLines] = useState<any[]>([]);

  // Hook para calcular rutas con tráfico
  const { 
    calculando: calculandoRutas, 
    resultados: rutasCalculadas, 
    calcularRutas 
  } = useRouteCalculator();

  // Obtener rutas por categoría del hook
  const rutasPorCategoria = useMemo(() => {
    if (!rutasCalculadas || rutasCalculadas.length === 0) return [];
    
    return rutasCalculadas.map(ruta => ({
      categoria: ruta.categoria,
      cuadrillaId: ruta.cuadrillaId,
      distancia: ruta.distancia,
      tiempo: ruta.tiempo,
      color: ruta.categoria === 'A' ? '#007bff' : 
            ruta.categoria === 'B' ? '#28a745' : '#333333'
    }));
  }, [rutasCalculadas]);

  // Inicializar Google Maps
  useEffect(() => {
    const initMap = async () => {
      // Cargar Google Maps API dinámicamente
      const loadGoogleMaps = () => {
        return new Promise<void>((resolve, reject) => {
          if (window.google && window.google.maps) {
            resolve();
            return;
          }

          // Verificar si ya existe un script de Google Maps
          const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
          if (existingScript) {
            console.log('🔄 Script de Google Maps ya existe, esperando...');
            const checkGoogleMaps = setInterval(() => {
              if (window.google && window.google.maps) {
                clearInterval(checkGoogleMaps);
                resolve();
              }
            }, 100);
            return;
          }

          const API_KEY = 'AIzaSyBmtiE0jWFGUFAZXoBgF3XyXmBmJit6m6U'; // API key fija
          console.log('🗝️ Cargando Google Maps con API key...');
          
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=geometry,places&callback=initMapCallback&v=weekly`;
          script.async = true;
          script.defer = true;

          // Callback global para cuando se carga la API
          (window as any).initMapCallback = () => {
            console.log('✅ Google Maps API callback ejecutado');
            resolve();
          };

          script.onerror = (error) => {
            console.error('❌ Error cargando script de Google Maps:', error);
            console.error('🔑 Verifica que la API key sea válida y que los servicios estén habilitados en Google Cloud Console');
            reject(new Error('Failed to load Google Maps API'));
          };
          
          // Timeout para detectar problemas de carga
          setTimeout(() => {
            if (!window.google || !window.google.maps) {
              console.error('⏰ Timeout cargando Google Maps API - posible problema con la API key');
              reject(new Error('Timeout loading Google Maps API'));
            }
          }, 10000);

          document.head.appendChild(script);
        });
      };

      try {
        await loadGoogleMaps();
        
        if (mapRef.current && window.google && window.google.maps) {
          console.log('🗺️ Inicializando mapa de Google Maps...');
          
          const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: -12.0464, lng: -77.0428 }, // Lima, Perú
            zoom: 11,
            mapTypeId: window.google.maps.MapTypeId.ROADMAP,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl: true,
          });
          
          mapInstance.current = map;
          console.log('✅ Mapa creado exitosamente');
          
          // Escuchar cuando el mapa esté completamente listo
          window.google.maps.event.addListenerOnce(map, 'idle', () => {
            console.log('🎯 Mapa completamente renderizado');
            setTimeout(() => {
              updateMapMarkers();
            }, 500);
          });

          // Escuchar por errores específicos de la API
          window.google.maps.event.addListener(map, 'error', (error: any) => {
            console.error('❌ Error específico de Google Maps:', error);
            if (error.code === 'ApiTargetBlockedMapError') {
              setError(`Error de restricciones de API Key.

Solución requerida:
1. Ve a: https://console.cloud.google.com/apis/credentials
2. Selecciona tu API Key
3. En "Restricciones de aplicación" → "Referrers HTTP"
4. Agrega: localhost:3000/*
5. Agrega: 127.0.0.1:3000/*
6. O temporalmente selecciona "Ninguna" para probar

API Key actual: ${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
            }
          });
          
          console.log('✅ Google Maps inicializado correctamente');
          
          // Cargar datos iniciales
          setTimeout(() => {
            loadSites();
            loadCuadrillas();
            loadTickets();
          }, 1000);
        }
      } catch (err) {
        console.error('❌ Error loading Google Maps:', err);
        setError(`Error cargando Google Maps: ${err instanceof Error ? err.message : 'Error desconocido'}. 

Posibles soluciones:
1. Activar Google Maps JavaScript API en Google Cloud Console
2. Configurar restricciones de HTTP referrers en la API Key:
   - Agregar: localhost:3000/*
   - Agregar: 127.0.0.1:3000/*
   - O quitar todas las restricciones temporalmente
3. Verificar que la API key tenga los permisos correctos
4. Verificar el límite de cuota de la API

URL: https://console.cloud.google.com/apis/credentials`);
      }
    };

    initMap();
  }, []);

  // Funciones de carga de datos (copiadas de ClientMap)
  const loadSites = async () => {
    if (sitesLoaded) return;
    
    setLoadingSites(true);
    try {
      console.log('🏢 Cargando sites...');
      const { data: sitesRaw, error } = await supabase
        .from('sites_v1')
        .select('id,codigo,site,region,latitud,longitud')
        .not('latitud', 'is', null)
        .not('longitud', 'is', null);

      if (error) {
        console.error('❌ Error cargando sites:', error);
        throw error;
      }

      console.log(`✅ Sites cargados: ${sitesRaw?.length || 0}`);

      const sitesPoints: Punto[] = (sitesRaw || []).map(s => ({
        id: `site-${s.id}`,
        codigo: s.codigo,
        nombre: s.site || 'Site sin nombre',
        region: s.region,
        latitud: s.latitud,
        longitud: s.longitud,
        tipo: 'site',
      })) as Punto[];

      setSites(sitesPoints);
      setSitesLoaded(true);
      updateAllPoints(sitesPoints, cuadrillas, tickets);
    } catch (e) {
      console.error('❌ Error cargando sites:', e);
      alert('Error cargando sites: ' + e);
    } finally {
      setLoadingSites(false);
    }
  };

  const loadCuadrillas = async () => {
    if (cuadrillasLoaded) return;
    
    setLoadingCuadrillas(true);
    try {
      console.log('👥 Cargando cuadrillas...');
      // Intentar primero con cuadrillas_v1, luego con cuadrillas si falla
      let cuadrillasRaw, error;
      
      // Estrategia simple: solo seleccionar las columnas básicas que sabemos que existen
      console.log('🔄 Cargando cuadrillas con consulta básica...');
      const result = await supabase
        .from('cuadrillas_v1')
        .select('*')
        .not('latitud', 'is', null)
        .not('longitud', 'is', null);
      
      cuadrillasRaw = result.data;
      error = result.error;
      
      // Log para ver la estructura real
      if (cuadrillasRaw && cuadrillasRaw.length > 0) {
        console.log('� Estructura de cuadrilla encontrada:', Object.keys(cuadrillasRaw[0]));
        console.log('🔍 Primer registro de cuadrilla:', cuadrillasRaw[0]);
      }

      if (error) {
        console.error('❌ Error cargando cuadrillas desde base de datos:', error);
        console.error('❌ Detalles del error:', error.message, error.details, error.code);
        throw error;
      }

      console.log(`✅ Cuadrillas cargadas exitosamente: ${cuadrillasRaw?.length || 0}`, cuadrillasRaw?.slice(0, 3));

      const cuadrillasPoints: Punto[] = (cuadrillasRaw || []).map((c, index) => ({
        id: `cuadrilla-${c.id || index}`,
        codigo: c.codigo || c.code || `CU-${index}`,
        nombre: c.nombre || c.cuadrilla || c.name || c.descripcion || `Cuadrilla ${c.codigo || index}`,
        region: c.region || c.zona || 'Sin región',
        latitud: Number(c.latitud || c.lat || c.latitude),
        longitud: Number(c.longitud || c.lng || c.longitude),
        tipo: 'cuadrilla',
        categoria: c.categoria || c.category || c.tipo || 'Sin categoría',
      })) as Punto[];

      setCuadrillas(cuadrillasPoints);
      setCuadrillasLoaded(true);
      updateAllPoints(sites, cuadrillasPoints, tickets);
    } catch (e: any) {
      console.error('❌ Error cargando cuadrillas:', e);
      console.error('❌ Error completo:', JSON.stringify(e, null, 2));
      
      // No mostrar alert, solo logging para debugging
      if (e?.message) {
        console.error('❌ Mensaje de error específico:', e.message);
      }
      
      // Si es error 400, probablemente la tabla no existe o tiene estructura diferente
      console.log('🔍 Verificando estructura de tablas de cuadrillas disponibles...');
    } finally {
      setLoadingCuadrillas(false);
    }
  };

  const loadTickets = async (estadoFiltro: string = 'NUEVO', forceReload: boolean = false) => {
    if (ticketsLoaded && !forceReload) return;
    
    setLoadingTickets(true);
    try {
      console.log(`🎫 Cargando tickets...`);

      // Cargar sites si no están cargados
      let sitesRaw: SiteDB[] = [];
      if (sites.length === 0) {
        const { data: sitesData, error: sitesError } = await supabase
          .from('sites_v1')
          .select('id,codigo,site,region,latitud,longitud')
          .not('latitud', 'is', null)
          .not('longitud', 'is', null);

        if (sitesError) throw sitesError;
        sitesRaw = (sitesData || []).map(s => ({
          id: s.id,
          codigo: s.codigo,
          site: s.site,
          region: s.region,
          latitud: s.latitud,
          longitud: s.longitud,
        })) as SiteDB[];
      }

      console.log(`Cargando TODOS los tickets para ${sitesRaw.length} sites disponibles (se filtrará por estado "${estadoFiltro}" en frontend)`);

      // Cargar TODOS los tickets (el filtro por estado se aplica en el frontend)
      const { data: ticketsRaw, error } = await supabase
        .from('tickets_v1')
        .select('id,ticket_source,site_id,site_name,task_category,estado,created_at');

      if (error) {
        console.error('❌ Error cargando tickets filtrados:', error);
        throw error;
      }

      console.log(`✅ Tickets cargados: ${ticketsRaw?.length || 0} tickets totales`);

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

  // Función para actualizar todos los puntos
  const updateAllPoints = (sitesData: Punto[], cuadrillasData: Punto[], ticketsData: Punto[]) => {
    const all = [...sitesData, ...cuadrillasData, ...ticketsData];
    setAllPoints(all);
    console.log(`🔄 Puntos actualizados: ${all.length} total (Sites: ${sitesData.length}, Cuadrillas: ${cuadrillasData.length}, Tickets: ${ticketsData.length})`);
  };

  // Funciones de filtros (copiadas de ClientMap)
  const matchesFilters = (p: Punto) => {
    // Debug para el punto específico
    const isTicket = p.tipo === 'ticket';
    
    // Filtro por región (solo si no es "TODAS")
    if (selectedRegion && selectedRegion !== 'TODAS') {
      const puntoRegion = (p.region ?? '').trim();
      const regionSeleccionada = selectedRegion.trim();
      if (puntoRegion !== regionSeleccionada) {
        if (isTicket) console.log(`🔍 Ticket ${p.id} rechazado por región: "${puntoRegion}" !== "${regionSeleccionada}"`);
        return false;
      }
    }
    
    // Filtro por estado (solo aplica a tickets y si no es "TODOS" o vacío)
    if (selectedEstado && selectedEstado !== '' && selectedEstado !== 'TODOS' && p.tipo === 'ticket') {
      const estadosDelTicket = (p.estadoTicket ?? '').split(',').map(e => e.trim());
      const estadoSeleccionado = selectedEstado.trim();
      console.log(`🔍 Evaluando ticket ${p.id}: estados="${p.estadoTicket}" vs seleccionado="${estadoSeleccionado}"`);
      console.log(`🔍 Estados del ticket procesados:`, estadosDelTicket);
      
      // Un site se muestra si tiene AL MENOS UN ticket con el estado seleccionado
      const tieneEstadoSeleccionado = estadosDelTicket.includes(estadoSeleccionado);
      
      if (!tieneEstadoSeleccionado) {
        console.log(`🔍 Ticket ${p.id} rechazado por estado: "${estadoSeleccionado}" no encontrado en [${estadosDelTicket.join(', ')}]`);
        return false;
      } else {
        console.log(`✅ Ticket ${p.id} aceptado por estado: "${estadoSeleccionado}" encontrado en estados del site`);
      }
    }
    
    return true;
  };

  // Función para calcular distancia Haversine
  const calcularDistanciaHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

  // Función para buscar cuadrillas más cercanas por categoría
  const buscarCuadrillasMaxCercanas = async () => {
    if (!visibleTickets || visibleTickets.length === 0) {
      alert('Primero selecciona algunos tickets para buscar cuadrillas cercanas');
      return;
    }

    if (!cuadrillas || cuadrillas.length === 0) {
      alert('No hay cuadrillas disponibles para comparar');
      return;
    }

    setCalculatingClosest(true);
    console.log('🔍 Buscando cuadrillas más cercanas por categoría...');

    try {
      const resultados = [];
      const categorias = ['A', 'B', 'C'];
      
      // Para cada ticket visible
      for (const ticket of visibleTickets) {
        console.log(`📍 Procesando ticket: ${ticket.nombre} (${ticket.latitud}, ${ticket.longitud})`);
        
        const cuadrillasParaTicket = [];
        
        // Para cada categoría
        for (const categoria of categorias) {
          const cuadrillasCategoria = cuadrillas.filter(c => 
            c.categoria === categoria && 
            c.latitud && 
            c.longitud && 
            !isNaN(c.latitud) && 
            !isNaN(c.longitud)
          );
          
          if (cuadrillasCategoria.length === 0) {
            console.log(`⚠️ No hay cuadrillas disponibles para categoría ${categoria}`);
            continue;
          }
          
          // Encontrar la cuadrilla más cercana de esta categoría
          let cuadrillaMasCercana = null;
          let menorDistancia = Infinity;
          
          for (const cuadrilla of cuadrillasCategoria) {
            const distancia = calcularDistanciaHaversine(
              ticket.latitud,
              ticket.longitud,
              cuadrilla.latitud,
              cuadrilla.longitud
            );
            
            if (distancia < menorDistancia) {
              menorDistancia = distancia;
              cuadrillaMasCercana = cuadrilla;
            }
          }
          
          if (cuadrillaMasCercana) {
            cuadrillasParaTicket.push({
              ticket,
              cuadrilla: cuadrillaMasCercana,
              categoria,
              distancia: menorDistancia,
              tiempoEstimado: Math.round(menorDistancia * 3) // Estimación: 3 min por km
            });
            
            console.log(`✅ Categoría ${categoria}: ${cuadrillaMasCercana.nombre} a ${menorDistancia.toFixed(2)}km`);
          }
        }
        
        if (cuadrillasParaTicket.length > 0) {
          resultados.push(...cuadrillasParaTicket);
        }
      }
      
      setClosestCuadrillas(resultados);
      setShowClosestCuadrillas(true);
      
      // Crear rutas usando Compute Routes API
      await crearRutasConComputeRoutes(resultados);
      
      console.log(`🎯 Encontradas ${resultados.length} asignaciones de cuadrillas más cercanas`);
      
    } catch (error) {
      console.error('❌ Error buscando cuadrillas cercanas:', error);
      alert('Error al buscar cuadrillas cercanas: ' + error.message);
    } finally {
      setCalculatingClosest(false);
    }
  };

  // Función para crear rutas usando Google Maps Compute Routes API
  const crearRutasConComputeRoutes = async (asignaciones) => {
    if (!mapInstance.current || !window.google) return;
    
    // Limpiar rutas existentes
    routeLines.forEach(renderer => {
      if (renderer && renderer.setMap) {
        renderer.setMap(null);
      }
    });
    
    const nuevosRenderers = [];
    const coloresPorCategoria = {
      'A': '#ff0000', // Rojo para categoría A
      'B': '#28a745', // Verde para categoría B  
      'C': '#007bff'  // Azul para categoría C
    };
    
        console.log(`🗺️ Calculando ${asignaciones.length} rutas optimizadas...`);
        
        // Función de prueba para verificar Routes API
        const testComputeRoutesAPI = async () => {
          const API_KEY = 'AIzaSyBmtiE0jWFGUFAZXoBgF3XyXmBmJit6m6U';
          const testUrl = `https://routes.googleapis.com/directions/v2:computeRoutes`;
          
          try {
            const testResponse = await fetch(testUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
              },
              body: JSON.stringify({
                origin: { location: { latLng: { latitude: -12.0464, longitude: -77.0428 } } },
                destination: { location: { latLng: { latitude: -12.0464, longitude: -77.0528 } } },
                travelMode: 'DRIVE'
              })
            });
            
            if (testResponse.ok) {
              console.log('🎉 ¡Routes API está HABILITADA y funcionando!');
              return true;
            } else {
              const errorText = await testResponse.text();
              console.error(`❌ Routes API test falló (${testResponse.status}):`, errorText);
              if (testResponse.status === 403) {
                console.error('🚨 ACCIÓN REQUERIDA: Habilita Routes API en https://console.cloud.google.com/apis/library/routes.googleapis.com');
              }
              return false;
            }
          } catch (error) {
            console.error('❌ Error probando Routes API:', error);
            return false;
          }
        };
        
        // Probar la API antes de procesar rutas
        const routesAPIEnabled = await testComputeRoutesAPI();    for (let i = 0; i < asignaciones.length; i++) {
      const asignacion = asignaciones[i];
      const { ticket, cuadrilla, categoria } = asignacion;
      
      try {
        let routeData = null;
        let routeSource = 'straight-line';
        let distanciaKm = '0';
        let tiempoMinutos = '0';
        let rutaPath = [];
        
        console.log(`🔄 Calculando ruta ${categoria}: ${cuadrilla.nombre} → ${ticket.nombre}`);
        console.log(`📍 Coordenadas: Origen(${cuadrilla.latitud}, ${cuadrilla.longitud}) → Destino(${ticket.latitud}, ${ticket.longitud})`);
        
        // Validar coordenadas
        const origenValido = !isNaN(cuadrilla.latitud) && !isNaN(cuadrilla.longitud);
        const destinoValido = !isNaN(ticket.latitud) && !isNaN(ticket.longitud);
        
        if (!origenValido || !destinoValido) {
          console.error(`❌ Coordenadas inválidas para ${categoria}: origen=${origenValido}, destino=${destinoValido}`);
          throw new Error('Coordenadas inválidas');
        }
        
        // 1. PRIMERA OPCIÓN: Compute Routes API v2 (solo si está habilitada)
        if (routesAPIEnabled) {
          try {
            const API_KEY = 'AIzaSyBmtiE0jWFGUFAZXoBgF3XyXmBmJit6m6U';
            const COMPUTE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
            
            console.log(`🤖 Usando Compute Routes API para ${categoria}...`);
          
          const requestBody = {
            origin: {
              location: {
                latLng: {
                  latitude: cuadrilla.latitud,
                  longitude: cuadrilla.longitud
                }
              }
            },
            destination: {
              location: {
                latLng: {
                  latitude: ticket.latitud,
                  longitude: ticket.longitud
                }
              }
            },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
            computeAlternativeRoutes: false,
            routeModifiers: {
              avoidTolls: false,
              avoidHighways: false,
              avoidFerries: false
            },
            languageCode: 'es-PE',
            units: 'METRIC'
          };

          const response = await fetch(COMPUTE_ROUTES_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': API_KEY,
              'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
            },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`📊 Compute Routes respuesta para ${categoria}:`, data);
            
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const encodedPath = route.polyline?.encodedPolyline;
              
              if (encodedPath) {
                // Decodificar la polyline de Compute Routes
                rutaPath = window.google.maps.geometry.encoding.decodePath(encodedPath);
                
                distanciaKm = (route.distanceMeters / 1000).toFixed(2);
                tiempoMinutos = Math.round(parseInt(route.duration.replace('s', '')) / 60).toString();
                routeSource = 'compute-routes';
                
                console.log(`🎉 ¡Compute Routes API EXITOSO para ${categoria}! Ruta detallada: ${distanciaKm}km, ${tiempoMinutos}min, ${rutaPath.length} puntos`);
              } else {
                console.log(`⚠️ Compute Routes respuesta sin polyline para ${categoria}`);
                throw new Error('No polyline in response');
              }
            } else {
              console.log(`⚠️ Compute Routes respuesta sin rutas para ${categoria}`);
              throw new Error('No routes in response');
            }
          } else {
            const errorText = await response.text();
            console.error(`❌ Compute Routes falló (${response.status}) para ${categoria}:`, errorText);
            
            if (response.status === 403) {
              console.error(`🔑 ERROR 403: Routes API no habilitada. Ve a: https://console.cloud.google.com/apis/library/routes.googleapis.com y haz clic en HABILITAR`);
            }
            
            throw new Error(`Compute Routes failed: ${response.status} - ${errorText}`);
          }
          
          } catch (computeError) {
            console.log(`⚠️ Compute Routes falló para ${categoria}:`, computeError.message);
          
          // 2. SEGUNDA OPCIÓN: Directions API JavaScript
          try {
            console.log(`🗺️ Fallback a Directions API para ${categoria}...`);
            
            const directionsService = new window.google.maps.DirectionsService();
            
            const directionsResult = await new Promise((resolve, reject) => {
              directionsService.route({
                origin: { lat: cuadrilla.latitud, lng: cuadrilla.longitud },
                destination: { lat: ticket.latitud, lng: ticket.longitud },
                travelMode: window.google.maps.TravelMode.DRIVING,
                avoidHighways: false,
                avoidTolls: false,
                optimizeWaypoints: false,
                region: 'PE'
              }, (result, status) => {
                if (status === 'OK') {
                  resolve(result);
                } else {
                  reject(new Error(`Directions API failed: ${status}`));
                }
              });
            });
            
            // Si llegamos aquí, Directions API funcionó
            const route = directionsResult.routes[0];
            const leg = route.legs[0];
            
            rutaPath = route.overview_path;
            distanciaKm = (leg.distance.value / 1000).toFixed(2);
            tiempoMinutos = Math.round(leg.duration.value / 60).toString();
            routeSource = 'directions-js';
            
            console.log(`✅ Directions API exitoso para ${categoria}: ${distanciaKm}km, ${tiempoMinutos}min`);
            
          } catch (directionsError) {
            console.log(`⚠️ Directions API falló para ${categoria}:`, directionsError.message);
            
            // 3. TERCERA OPCIÓN: Línea recta (último recurso)
            const origenLatLng = { lat: cuadrilla.latitud, lng: cuadrilla.longitud };
            const destinoLatLng = { lat: ticket.latitud, lng: ticket.longitud };
            
            rutaPath = [origenLatLng, destinoLatLng];
            
            // Calcular distancia Haversine
            const distanciaMetros = calcularDistanciaHaversine(
              cuadrilla.latitud, cuadrilla.longitud,
              ticket.latitud, ticket.longitud
            );
            
            distanciaKm = (distanciaMetros / 1000).toFixed(2);
            tiempoMinutos = Math.round(distanciaMetros / 1000 * 2).toString(); // Estimación: 30 km/h
            routeSource = 'straight-line';
            
            console.log(`📏 Último recurso - línea recta para ${categoria}: ${distanciaKm}km estimado`);
            }
          }
        } else {
          console.log(`⚠️ Saltando Compute Routes para ${categoria} - API no habilitada`);
          
          // Ir directamente a Directions API si Routes API no está disponible
          try {
            console.log(`🗺️ Usando Directions API para ${categoria}...`);
            
            const directionsService = new window.google.maps.DirectionsService();
            
            const directionsResult = await new Promise((resolve, reject) => {
              directionsService.route({
                origin: { lat: cuadrilla.latitud, lng: cuadrilla.longitud },
                destination: { lat: ticket.latitud, lng: ticket.longitud },
                travelMode: window.google.maps.TravelMode.DRIVING,
                avoidHighways: false,
                avoidTolls: false,
                optimizeWaypoints: false,
                region: 'PE'
              }, (result, status) => {
                if (status === 'OK') {
                  resolve(result);
                } else {
                  reject(new Error(`Directions API failed: ${status}`));
                }
              });
            });
            
            const route = directionsResult.routes[0];
            const leg = route.legs[0];
            
            rutaPath = route.overview_path;
            distanciaKm = (leg.distance.value / 1000).toFixed(2);
            tiempoMinutos = Math.round(leg.duration.value / 60).toString();
            routeSource = 'directions-js';
            
            console.log(`✅ Directions API exitoso para ${categoria}: ${distanciaKm}km, ${tiempoMinutos}min`);
            
          } catch (directionsError) {
            console.log(`⚠️ Directions API falló para ${categoria}:`, directionsError.message);
            
            // Último recurso: línea recta
            const origenLatLng = { lat: cuadrilla.latitud, lng: cuadrilla.longitud };
            const destinoLatLng = { lat: ticket.latitud, lng: ticket.longitud };
            
            rutaPath = [origenLatLng, destinoLatLng];
            
            const distanciaMetros = calcularDistanciaHaversine(
              cuadrilla.latitud, cuadrilla.longitud,
              ticket.latitud, ticket.longitud
            );
            
            distanciaKm = (distanciaMetros / 1000).toFixed(2);
            tiempoMinutos = Math.round(distanciaMetros / 1000 * 2).toString();
            routeSource = 'straight-line';
            
            console.log(`📏 Fallback línea recta para ${categoria}: ${distanciaKm}km estimado`);
          }
        }

        // Crear polyline según el tipo de ruta con diferentes estilos
        let polylineConfig = {
          path: rutaPath,
          geodesic: true,
          strokeColor: coloresPorCategoria[categoria],
          zIndex: 100 + i,
          map: mapInstance.current
        };
        
        if (routeSource === 'compute-routes') {
          // Compute Routes API - Línea gruesa y sólida con efecto brillante
          polylineConfig.strokeWeight = 6;
          polylineConfig.strokeOpacity = 0.9;
          // Agregar una línea de fondo más gruesa para efecto de brillo
          const backgroundLine = new window.google.maps.Polyline({
            path: rutaPath,
            geodesic: true,
            strokeColor: '#ffffff',
            strokeWeight: 8,
            strokeOpacity: 0.4,
            zIndex: 99 + i,
            map: mapInstance.current
          });
          nuevosRenderers.push(backgroundLine);
        } else if (routeSource === 'directions-js') {
          // Directions API - Línea normal
          polylineConfig.strokeWeight = 4;
          polylineConfig.strokeOpacity = 0.8;
        } else {
          // Línea recta - Línea punteada y más delgada
          polylineConfig.strokeWeight = 3;
          polylineConfig.strokeOpacity = 0.6;
          polylineConfig.strokeStyle = 'dashed';
        }
        
        const polyline = new window.google.maps.Polyline(polylineConfig);

        // Agregar marcadores personalizados para inicio y fin
        const startMarker = new window.google.maps.Marker({
          position: { lat: cuadrilla.latitud, lng: cuadrilla.longitud },
          map: mapInstance.current,
          title: `Inicio: ${cuadrilla.nombre}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: coloresPorCategoria[categoria],
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            zIndex: 200
          },
          label: {
            text: categoria,
            color: 'white',
            fontWeight: 'bold',
            fontSize: '12px'
          }
        });
        
        const endMarker = new window.google.maps.Marker({
          position: { lat: ticket.latitud, lng: ticket.longitud },
          map: mapInstance.current,
          title: `Destino: ${ticket.nombre}`,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 10,
            fillColor: coloresPorCategoria[categoria],
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            rotation: 0,
            zIndex: 200
          }
        });
        
        // Actualizar los datos de la asignación
        asignacion.distanciaReal = distanciaKm;
        asignacion.tiempoReal = tiempoMinutos;
        asignacion.rutaTexto = `${distanciaKm} km - ${tiempoMinutos} min ${routeSource === 'straight-line' ? '(estimado)' : ''}`;
        asignacion.routeSource = routeSource;

        // Agregar info window al hacer clic en la polyline
        const infoWindow = new window.google.maps.InfoWindow();
        
        polyline.addListener('click', (event) => {
          let apiInfo;
          
          if (routeSource === 'compute-routes') {
            apiInfo = { 
              name: 'Compute Routes API v2', 
              icon: '🤖', 
              desc: 'IA avanzada con análisis de tráfico en tiempo real', 
              estado: 'Óptimo ✨',
              modo: 'Conducción con IA'
            };
          } else if (routeSource === 'directions-js') {
            apiInfo = { 
              name: 'Directions API', 
              icon: '🗺️', 
              desc: 'Ruta estándar optimizada por Google', 
              estado: 'Funcional ✅',
              modo: 'Conducción optimizada'
            };
          } else {
            apiInfo = { 
              name: 'Cálculo Directo', 
              icon: '📏', 
              desc: 'Distancia en línea recta (estimada)', 
              estado: 'Estimado ⚠️',
              modo: 'Línea recta'
            };
          }

          infoWindow.setContent(`
            <div style="padding: 8px; min-width: 280px;">
              <div style="font-weight: bold; color: ${coloresPorCategoria[categoria]}; margin-bottom: 5px;">
                ${apiInfo.icon} Ruta Categoría ${categoria} (${apiInfo.name})
              </div>
              <div style="margin-bottom: 3px;">
                <strong>Cuadrilla:</strong> ${cuadrilla.nombre}
              </div>
              <div style="margin-bottom: 3px;">
                <strong>Ticket:</strong> ${ticket.nombre}
              </div>
              <div style="margin-bottom: 3px;">
                <strong>Distancia:</strong> ${distanciaKm} km ${routeSource === 'straight-line' ? '(estimada)' : ''}
              </div>
              <div style="margin-bottom: 8px;">
                <strong>Tiempo:</strong> ${tiempoMinutos} min ${routeSource === 'straight-line' ? '(estimado)' : ''}
              </div>
              <div style="border-top: 1px solid #eee; padding-top: 5px;">
                <div style="font-size: 11px; color: #666; margin-bottom: 3px;">
                  <strong>📍 Coordenadas:</strong>
                </div>
                <div style="font-size: 10px; font-family: monospace; color: #444; margin-bottom: 2px;">
                  🏢 Origen: ${Number(cuadrilla.latitud).toFixed(6)}°, ${Number(cuadrilla.longitud).toFixed(6)}°
                </div>
                <div style="font-size: 10px; font-family: monospace; color: #444; margin-bottom: 3px;">
                  🎫 Destino: ${Number(ticket.latitud).toFixed(6)}°, ${Number(ticket.longitud).toFixed(6)}°
                </div>
              </div>
              <div style="border-top: 1px solid #eee; padding-top: 5px; margin-top: 5px;">
                <div style="font-size: 10px; color: #666; margin-bottom: 2px;">
                  <strong>📋 Sistema de Rutas:</strong>
                </div>
                <div style="font-size: 10px; color: #444;">
                  • ${apiInfo.name}<br/>
                  • Modo: ${apiInfo.modo}<br/>
                  • Región: Perú<br/>
                  • Estado: ${apiInfo.estado}
                </div>
              </div>
              <div style="font-size: 11px; color: #666; margin-top: 5px; padding: 5px; background: rgba(0,123,255,0.1); border-radius: 3px;">
                💡 ${apiInfo.desc}
              </div>
            </div>
          `);
          infoWindow.setPosition(event.latLng);
          infoWindow.open(mapInstance.current);
        });
        
        nuevosRenderers.push(polyline, startMarker, endMarker);
        
        const routeTypeLabel = 
          routeSource === 'compute-routes' ? '🤖 Compute Routes' :
          routeSource === 'directions-js' ? '🗺️ Directions API' : '📏 Línea Recta';
        
        console.log(`✅ Ruta ${i + 1}/${asignaciones.length} (${routeTypeLabel}): ${categoria} - ${distanciaKm}km - ${tiempoMinutos}min`);
        
        // Pequeña pausa para evitar límites de rate
        if (i < asignaciones.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
      } catch (error) {
        console.error(`❌ ERROR CRÍTICO calculando ruta para categoría ${categoria}:`, error);
        console.error(`🔍 Datos de entrada: Cuadrilla=${cuadrilla.nombre}, Ticket=${ticket.nombre}`);
        console.error(`🔍 Coordenadas: (${cuadrilla.latitud}, ${cuadrilla.longitud}) → (${ticket.latitud}, ${ticket.longitud})`);
        
        // Fallback de emergencia: crear línea recta si falla todo
        console.warn(`⚠️ Creando línea recta de emergencia para categoría ${categoria}`);
        
        try {
          const origenLatLng = { lat: parseFloat(cuadrilla.latitud), lng: parseFloat(cuadrilla.longitud) };
          const destinoLatLng = { lat: parseFloat(ticket.latitud), lng: parseFloat(ticket.longitud) };
          
          rutaPath = [origenLatLng, destinoLatLng];
          
          const distanciaMetros = calcularDistanciaHaversine(
            parseFloat(cuadrilla.latitud), parseFloat(cuadrilla.longitud),
            parseFloat(ticket.latitud), parseFloat(ticket.longitud)
          );
          
          distanciaKm = (distanciaMetros / 1000).toFixed(2);
          tiempoMinutos = Math.round(distanciaMetros / 1000 * 2).toString();
          routeSource = 'straight-line';
          
          console.log(`📏 Línea recta de emergencia creada para ${categoria}: ${distanciaKm}km estimado`);
        } catch (emergencyError) {
          console.error(`💥 ERROR TOTAL para ${categoria}:`, emergencyError);
          // Crear ruta mínima con coordenadas por defecto
          rutaPath = [
            { lat: -12.0464, lng: -77.0428 },
            { lat: -12.0464, lng: -77.0428 }
          ];
          distanciaKm = '0.00';
          tiempoMinutos = '0';
          routeSource = 'error';
        }
        console.log(`🔄 Fallback a Directions API para categoría ${categoria}...`);
        
        try {
          const directionsService = new window.google.maps.DirectionsService();
          const directionsRenderer = new window.google.maps.DirectionsRenderer({
            map: mapInstance.current,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: coloresPorCategoria[categoria],
              strokeWeight: 4,
              strokeOpacity: 0.7,
              strokePattern: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 }, offset: '0', repeat: '8px' }]
            }
          });

          const request = {
            origin: { lat: cuadrilla.latitud, lng: cuadrilla.longitud },
            destination: { lat: ticket.latitud, lng: ticket.longitud },
            travelMode: window.google.maps.TravelMode.DRIVING
          };

          const result = await new Promise((resolve, reject) => {
            directionsService.route(request, (result, status) => {
              if (status === 'OK') resolve(result);
              else reject(new Error(`Directions fallback failed: ${status}`));
            });
          });

          directionsRenderer.setDirections(result);
          nuevosRenderers.push(directionsRenderer);
          
          console.log(`✅ Fallback exitoso para categoría ${categoria}`);
          
        } catch (fallbackError) {
          console.error(`❌ Fallback también falló para categoría ${categoria}:`, fallbackError);
          
          // Último recurso: línea recta
          const lineaRecta = new window.google.maps.Polyline({
            path: [
              { lat: cuadrilla.latitud, lng: cuadrilla.longitud },
              { lat: ticket.latitud, lng: ticket.longitud }
            ],
            geodesic: true,
            strokeColor: coloresPorCategoria[categoria],
            strokeOpacity: 0.5,
            strokeWeight: 2,
            strokePattern: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 }, offset: '0', repeat: '15px' }],
            map: mapInstance.current
          });
          
          nuevosRenderers.push(lineaRecta);
        }
      }
    }
    
    setRouteLines(nuevosRenderers);
    
    // Actualizar la lista de asignaciones con los datos reales
    setClosestCuadrillas([...asignaciones]);
    
    // Ajustar el zoom para mostrar todas las rutas
    if (asignaciones.length > 0 && mapInstance.current) {
      const bounds = new window.google.maps.LatLngBounds();
      
      asignaciones.forEach(asignacion => {
        bounds.extend(new window.google.maps.LatLng(asignacion.cuadrilla.latitud, asignacion.cuadrilla.longitud));
        bounds.extend(new window.google.maps.LatLng(asignacion.ticket.latitud, asignacion.ticket.longitud));
      });
      
      mapInstance.current.fitBounds(bounds);
      
      // Asegurar un nivel mínimo de zoom
      setTimeout(() => {
        const currentZoom = mapInstance.current.getZoom();
        if (currentZoom > 15) {
          mapInstance.current.setZoom(15);
        }
      }, 100);
    }
    
    console.log('🎯 Todas las rutas calculadas y mapa ajustado');
  };

  // Puntos visibles filtrados
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
        
        // Verificar si está dentro del radio de algún ticket visible
        for (const ticket of ticketsVisibles) {
          if (!ticket.latitud || !ticket.longitud) continue;
          
          const distancia = calcularDistanciaHaversine(
            cuadrilla.latitud,
            cuadrilla.longitud,
            ticket.latitud,
            ticket.longitud
          );
          
          if (distancia <= searchRadius) {
            return true; // Está dentro del radio de al menos un ticket
          }
        }
        
        return false; // No está dentro del radio de ningún ticket
      });
      
      console.log(`Cuadrillas dentro de ${searchRadius}km de tickets: ${cuadrillasEnRadio.length}`);
      return cuadrillasEnRadio;
    }
    
    // Si no hay filtro de tickets, mostrar según región
    return (selectedRegion && selectedRegion !== 'TODAS') ? cuadrillas.filter(matchesFilters) : cuadrillas;
  }, [cuadrillas, selectedRegion, selectedEstado, tickets, searchRadius]);

  const visibleTickets = useMemo(() => {
    // Debug de valores exactos
    console.log('🎫 DEBUG visibleTickets - selectedEstado:', JSON.stringify(selectedEstado), 'tipo:', typeof selectedEstado, 'length:', selectedEstado?.length);
    console.log('🎫 DEBUG visibleTickets - selectedRegion:', JSON.stringify(selectedRegion), 'tipo:', typeof selectedRegion);
    console.log('🎫 DEBUG visibleTickets - tickets disponibles:', tickets.length);
    
    // Solo aplicar filtros si hay valores específicos seleccionados (no "TODOS" o vacío)
    const hasRegionFilter = selectedRegion && selectedRegion !== 'TODAS';
    const hasEstadoFilter = selectedEstado && selectedEstado !== '' && selectedEstado !== 'TODOS';
    
    const result = (hasRegionFilter || hasEstadoFilter) ? tickets.filter(matchesFilters) : tickets;
    console.log(`🎫 visibleTickets RESULTADO: ${result.length} tickets visible (región: "${selectedRegion || 'TODAS'}", estado: "${selectedEstado || 'TODOS'}")`);
    console.log('🎫 Filtros activos:', { hasRegionFilter, hasEstadoFilter, selectedRegion, selectedEstado });
    
    // Debug adicional: mostrar algunos tickets de ejemplo
    if (result.length > 0) {
      console.log('🎫 Ejemplo de ticket visible:', result[0]);
    }
    if (tickets.length > 0 && result.length === 0) {
      console.log('🎫 Ejemplo de ticket NO visible:', tickets[0]);
    }
    
    return result;
  }, [tickets, selectedRegion, selectedEstado]);

  // Actualizar marcadores en Google Maps
  const updateMapMarkers = useCallback(() => {
    if (!mapInstance.current || !window.google || !window.google.maps) {
      console.log('🔄 Google Maps no está listo todavía, esperando...');
      return;
    }

    // Verificar que el mapa esté completamente inicializado
    if (!mapInstance.current.getZoom) {
      console.log('🔄 Mapa aún no completamente inicializado...');
      return;
    }

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];

    console.log('📍 Actualizando marcadores en Google Maps...');

    // Agregar marcadores de sites
    if (showSites && visibleSites.length > 0) {
      console.log(`🏢 Agregando ${visibleSites.length} marcadores de sites`);
      visibleSites.forEach((site, index) => {
        try {
          // Validar que las coordenadas sean números válidos
          if (!site.latitud || !site.longitud || isNaN(site.latitud) || isNaN(site.longitud)) {
            console.warn(`❌ Site ${index} tiene coordenadas inválidas:`, site);
            return;
          }

          const marker = new window.google.maps.Marker({
            position: { lat: Number(site.latitud), lng: Number(site.longitud) },
            map: mapInstance.current,
            title: site.nombre || `Site ${index}`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#ff6b6b',
              fillOpacity: 0.8,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="min-width: 200px; padding: 5px;">
                <h3 style="margin: 0 0 8px 0; color: #ff6b6b;">${site.nombre}</h3>
                <p style="margin: 3px 0;"><strong>Código:</strong> ${site.codigo}</p>
                <p style="margin: 3px 0;"><strong>Región:</strong> ${site.region || 'N/A'}</p>
                <p style="margin: 3px 0;"><strong>Tipo:</strong> Site</p>
                <div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #eee;">
                  <p style="margin: 2px 0; font-size: 12px; color: #666;">
                    <strong>📍 Coordenadas:</strong>
                  </p>
                  <p style="margin: 2px 0; font-size: 11px; font-family: monospace; color: #444;">
                    Lat: ${Number(site.latitud).toFixed(6)}°<br/>
                    Lng: ${Number(site.longitud).toFixed(6)}°
                  </p>
                </div>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstance.current, marker);
          });

          markersRef.current.push(marker);
        } catch (error) {
          console.error(`❌ Error creando marcador de site ${index}:`, error);
        }
      });
    }

    // Agregar marcadores de cuadrillas
    if (showCuadrillas && visibleCuadrillas.length > 0) {
      console.log(`👥 Agregando ${visibleCuadrillas.length} marcadores de cuadrillas`);
      visibleCuadrillas.forEach((cuadrilla, index) => {
        try {
          // Validar coordenadas
          if (!cuadrilla.latitud || !cuadrilla.longitud || isNaN(cuadrilla.latitud) || isNaN(cuadrilla.longitud)) {
            console.warn(`❌ Cuadrilla ${index} tiene coordenadas inválidas:`, cuadrilla);
            return;
          }

          const color = cuadrilla.categoria === 'A' ? '#007bff' : 
                       cuadrilla.categoria === 'B' ? '#28a745' : '#ffffff';

          const marker = new window.google.maps.Marker({
            position: { lat: Number(cuadrilla.latitud), lng: Number(cuadrilla.longitud) },
            map: mapInstance.current,
            title: cuadrilla.nombre || `Cuadrilla ${index}`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: color,
              fillOpacity: 0.8,
              strokeColor: '#333',
              strokeWeight: 2,
            },
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="min-width: 200px; padding: 5px;">
                <h3 style="margin: 0 0 8px 0; color: ${color};">${cuadrilla.nombre}</h3>
                <p style="margin: 3px 0;"><strong>Código:</strong> ${cuadrilla.codigo}</p>
                <p style="margin: 3px 0;"><strong>Región:</strong> ${cuadrilla.region || 'N/A'}</p>
                <p style="margin: 3px 0;"><strong>Categoría:</strong> ${cuadrilla.categoria || 'N/A'}</p>
                <p style="margin: 3px 0;"><strong>Tipo:</strong> Cuadrilla</p>
                <div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #eee;">
                  <p style="margin: 2px 0; font-size: 12px; color: #666;">
                    <strong>📍 Coordenadas:</strong>
                  </p>
                  <p style="margin: 2px 0; font-size: 11px; font-family: monospace; color: #444;">
                    Lat: ${Number(cuadrilla.latitud).toFixed(6)}°<br/>
                    Lng: ${Number(cuadrilla.longitud).toFixed(6)}°
                  </p>
                </div>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstance.current, marker);
          });

          markersRef.current.push(marker);
        } catch (error) {
          console.error(`❌ Error creando marcador de cuadrilla ${index}:`, error);
        }
      });
    }

    // Agregar marcadores de tickets
    if (showTickets && visibleTickets.length > 0) {
      console.log(`🎫 Agregando ${visibleTickets.length} marcadores de tickets`);
      visibleTickets.forEach((ticket, index) => {
        try {
          // Validar coordenadas
          if (!ticket.latitud || !ticket.longitud || isNaN(ticket.latitud) || isNaN(ticket.longitud)) {
            console.warn(`❌ Ticket ${index} tiene coordenadas inválidas:`, ticket);
            return;
          }

          const marker = new window.google.maps.Marker({
            position: { lat: Number(ticket.latitud), lng: Number(ticket.longitud) },
            map: mapInstance.current,
            title: ticket.nombre || `Ticket ${index}`,
            icon: {
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 8,
              fillColor: '#ffd700',
              fillOpacity: 0.8,
              strokeColor: '#333',
              strokeWeight: 2,
            },
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="min-width: 200px; padding: 5px;">
                <h3 style="margin: 0 0 8px 0; color: #ffd700;">${ticket.nombre}</h3>
                <p style="margin: 3px 0;"><strong>Site:</strong> ${ticket.codigo}</p>
                <p style="margin: 3px 0;"><strong>Región:</strong> ${ticket.region || 'N/A'}</p>
                <p style="margin: 3px 0;"><strong>Estado:</strong> ${ticket.estadoTicket || 'N/A'}</p>
                <p style="margin: 3px 0;"><strong>Categoría:</strong> ${ticket.categoria || 'N/A'}</p>
                <p style="margin: 3px 0;"><strong>Tipo:</strong> Ticket</p>
                <div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #eee;">
                  <p style="margin: 2px 0; font-size: 12px; color: #666;">
                    <strong>📍 Coordenadas:</strong>
                  </p>
                  <p style="margin: 2px 0; font-size: 11px; font-family: monospace; color: #444;">
                    Lat: ${Number(ticket.latitud).toFixed(6)}°<br/>
                    Lng: ${Number(ticket.longitud).toFixed(6)}°
                  </p>
                </div>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstance.current, marker);
          });

          markersRef.current.push(marker);
        } catch (error) {
          console.error(`❌ Error creando marcador de ticket ${index}:`, error);
        }
      });
    }
  }, [showSites, visibleSites, showCuadrillas, visibleCuadrillas, showTickets, visibleTickets]);

  // Actualizar marcadores cuando cambien los datos visibles
  useEffect(() => {
    // Solo actualizar si Google Maps está listo y completamente inicializado
    if (mapInstance.current && window.google && window.google.maps && mapInstance.current.getZoom) {
      console.log('🔄 Actualizando marcadores por cambio en datos visibles...');
      // Usar setTimeout para evitar problemas de timing
      setTimeout(() => {
        updateMapMarkers();
      }, 100);
    }
  }, [showSites, showCuadrillas, showTickets, visibleSites, visibleCuadrillas, visibleTickets, updateMapMarkers]);

  // Resto de la lógica copiada de ClientMap...
  // (Se agregan los handlers, useEffects, etc.)

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Panel de controles (copiado de ClientMap) */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        border: '1px solid #ddd',
        minWidth: '300px',
        maxWidth: '90vw',
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '16px' }}>
          🗺️ Mapa Google Maps - Control
        </h4>
        
        {/* Checkboxes con carga automática */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap', marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={showSites}
              onChange={(e) => {
                setShowSites(e.target.checked);
                if (e.target.checked && !sitesLoaded) {
                  loadSites();
                }
              }}
            />
            🏢 Sites
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={showCuadrillas}
              onChange={(e) => {
                setShowCuadrillas(e.target.checked);
                if (e.target.checked && !cuadrillasLoaded) {
                  loadCuadrillas();
                }
              }}
            />
            👥 Cuadrillas
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={showTickets}
              onChange={(e) => {
                setShowTickets(e.target.checked);
                if (e.target.checked && !ticketsLoaded) {
                  loadTickets();
                }
              }}
            />
            🎫 Tickets
          </label>
          
          {/* Botón para buscar cuadrillas más cercanas */}
          {showTickets && (
            <button
              onClick={buscarCuadrillasMaxCercanas}
              disabled={calculatingClosest || !ticketsLoaded || visibleTickets.length === 0}
              style={{
                padding: '6px 12px',
                backgroundColor: calculatingClosest ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 600,
                cursor: calculatingClosest || !ticketsLoaded || visibleTickets.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {calculatingClosest ? '⏳' : '🎯'} 
              {calculatingClosest ? 'Calculando rutas (Compute Routes)...' : 'Cuadrillas + Cercanas (Compute Routes)'}
            </button>
          )}
        </div>

        {/* Resultados de cuadrillas cercanas */}
        {showClosestCuadrillas && closestCuadrillas.length > 0 && (
          <div style={{
            marginTop: 10,
            padding: 8,
            background: '#e8f5e8',
            borderRadius: 6,
            border: '1px solid #28a745'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#28a745', marginBottom: 5 }}>
              🎯 Cuadrillas más cercanas por categoría:
            </div>
            <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
              {closestCuadrillas.map((asignacion, index) => (
                <div key={index} style={{
                  fontSize: 11,
                  padding: '3px 0',
                  borderBottom: index < closestCuadrillas.length - 1 ? '1px solid #c3e6cb' : 'none'
                }}>
                  <div style={{ marginBottom: 2 }}>
                    <strong style={{ color: asignacion.categoria === 'A' ? '#ff0000' : 
                                            asignacion.categoria === 'B' ? '#28a745' : '#007bff' }}>
                      Cat. {asignacion.categoria}:
                    </strong> {asignacion.cuadrilla.nombre} → {asignacion.ticket.nombre} 
                    <span style={{ color: '#666' }}>
                      {asignacion.rutaTexto ? (
                        `(${asignacion.rutaTexto})`
                      ) : (
                        `(${asignacion.distancia.toFixed(1)}km, ~${asignacion.tiempoEstimado}min)`
                      )}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#555', marginLeft: 10, fontFamily: 'monospace' }}>
                    📍 Cuadrilla: {Number(asignacion.cuadrilla.latitud).toFixed(4)}°, {Number(asignacion.cuadrilla.longitud).toFixed(4)}°
                  </div>
                  <div style={{ fontSize: 10, color: '#555', marginLeft: 10, fontFamily: 'monospace' }}>
                    🎫 Ticket: {Number(asignacion.ticket.latitud).toFixed(4)}°, {Number(asignacion.ticket.longitud).toFixed(4)}°
                  </div>
                  {asignacion.distanciaReal && (
                    <div style={{ fontSize: 10, color: '#28a745', marginLeft: 10 }}>
                      🗺️ Ruta real calculada
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
              <button
                onClick={() => {
                  // Recentrar mapa en todas las rutas
                  if (closestCuadrillas.length > 0 && mapInstance.current) {
                    const bounds = new window.google.maps.LatLngBounds();
                    
                    closestCuadrillas.forEach(asignacion => {
                      bounds.extend(new window.google.maps.LatLng(asignacion.cuadrilla.latitud, asignacion.cuadrilla.longitud));
                      bounds.extend(new window.google.maps.LatLng(asignacion.ticket.latitud, asignacion.ticket.longitud));
                    });
                    
                    mapInstance.current.fitBounds(bounds);
                  }
                }}
                style={{
                  padding: '2px 6px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 3,
                  fontSize: 10,
                  cursor: 'pointer'
                }}
              >
                🎯 Centrar rutas
              </button>
              
              <button
                onClick={() => {
                  setShowClosestCuadrillas(false);
                  setClosestCuadrillas([]);
                  // Limpiar rutas del mapa (tanto renderers como polylines)
                  routeLines.forEach(item => {
                    if (item && item.setMap) {
                      item.setMap(null);
                    }
                    if (item && item.setDirections) {
                      item.setDirections({ routes: [] });
                    }
                  });
                  setRouteLines([]);
                }}
                style={{
                  padding: '2px 6px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: 3,
                  fontSize: 10,
                  cursor: 'pointer'
                }}
              >
                ❌ Limpiar rutas
              </button>
            </div>
          </div>
        )}

        {/* Selectores de filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                minWidth: 150,
                background: 'white',
              }}
            >
              <option value="">Todas las regiones</option>
              <option value="LIMA NORTE">LIMA NORTE</option>
              <option value="LIMA SUR">LIMA SUR</option>
              <option value="LIMA ESTE">LIMA ESTE</option>
              <option value="LIMA CENTRO">LIMA CENTRO</option>
            </select>
          </div>

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
              <option value="NUEVO">NUEVO</option>
              <option value="EN_PROCESO">EN_PROCESO</option>
              <option value="COMPLETADO">COMPLETADO</option>
            </select>
          </div>
        </div>

        {/* Control de radio de búsqueda */}
        {showTickets && showCuadrillas && (
          <div style={{ 
            marginTop: 10, 
            padding: 8, 
            background: '#f8f9fa', 
            borderRadius: 6, 
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>
                📍 Radio de búsqueda de cuadrillas:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={searchRadius}
                  onChange={(e) => {
                    const newRadius = Math.max(1, Math.min(50, Number(e.target.value)));
                    setSearchRadius(newRadius);
                  }}
                  style={{
                    width: '80px',
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    fontSize: 13,
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: 13, color: '#666' }}>km</span>
                
                {/* Botones de radio rápido */}
                <div style={{ display: 'flex', gap: 4, marginLeft: 10 }}>
                  {[5, 10, 15, 20].map(radius => (
                    <button
                      key={radius}
                      onClick={() => setSearchRadius(radius)}
                      style={{
                        padding: '2px 6px',
                        fontSize: 11,
                        border: searchRadius === radius ? '2px solid #007bff' : '1px solid #ccc',
                        borderRadius: 3,
                        background: searchRadius === radius ? '#e3f2fd' : 'white',
                        color: searchRadius === radius ? '#007bff' : '#666',
                        cursor: 'pointer',
                        fontWeight: searchRadius === radius ? 600 : 400
                      }}
                    >
                      {radius}km
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                💡 Tip: Solo se mostrarán las cuadrillas que estén dentro de {searchRadius}km de algún ticket visible
              </div>
            </div>
          </div>
        )}

        {/* Contadores */}
        <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
          🏢 Sites: {visibleSites.length} | 
          👥 Cuadrillas: {visibleCuadrillas.length} | 
          🎫 Tickets: {visibleTickets.length}
          {showTickets && showCuadrillas && (
            <span style={{ marginLeft: 10, color: '#007bff' }}>
              | 📏 Radio: {searchRadius}km
            </span>
          )}
          {showClosestCuadrillas && closestCuadrillas.length > 0 && (
            <span style={{ marginLeft: 10, color: '#28a745', fontWeight: 600 }}>
              | 🎯 Rutas: {closestCuadrillas.length}
            </span>
          )}
        </div>
      </div>

      {/* Mapa de Google */}
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '400px',
          backgroundColor: '#f0f0f0' 
        }} 
      />
      
      {/* Estado de carga del mapa */}
      {!mapInstance.current && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          textAlign: 'center',
          zIndex: 2000,
        }}>
          <h3 style={{ color: '#007bff', marginBottom: '10px' }}>🗺️ Cargando Google Maps...</h3>
          <p>Inicializando el mapa interactivo</p>
          <div style={{ 
            marginTop: '15px', 
            fontSize: '12px', 
            color: '#666',
            maxWidth: '300px'
          }}>
            Si el mapa no carga, revisa la consola del navegador para más información sobre la configuración de la API.
          </div>
        </div>
      )}

      {/* Mensajes de error */}
      {false && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          textAlign: 'center',
          zIndex: 2000,
        }}>
          <h3 style={{ color: '#ff6b6b', marginBottom: '10px' }}>⚠️ API Key Requerida</h3>
          <p>Para usar Google Maps, necesitas configurar <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en tu archivo <code>.env.local</code></p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Obtén tu API key desde <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>
          </p>
        </div>
      )}

      {/* Mensaje de error de configuración */}
      {error && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          textAlign: 'left',
          zIndex: 2000,
          maxWidth: '500px',
        }}>
          <h3 style={{ color: '#ff6b6b', marginBottom: '15px' }}>🔧 Configuración de Google Maps Requerida</h3>
          <div style={{ marginBottom: '15px' }}>
            <p style={{ marginBottom: '10px' }}>Para activar Google Maps JavaScript API:</p>
            <ol style={{ paddingLeft: '20px', fontSize: '14px' }}>
              <li>Ve a <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
              <li>Busca "Maps JavaScript API"</li>
              <li>Haz clic en "HABILITAR"</li>
              <li>Opcionalmente, activa "Places API" si planeas usar búsqueda</li>
            </ol>
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <strong>API Key actual:</strong> AIzaSyBmtiE0jWFGUFAZXoBgF3XyXmBmJit6m6U
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Recargar página
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;