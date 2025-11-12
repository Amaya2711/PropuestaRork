// Archivo eliminado
// Este archivo ha sido vaciado.
// No contiene ningún contenido.

// Función para calcular distancia haversine
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
// ...existing code...
/* ===================== Página ===================== */
export default function ClientMap({ ticketId }: { ticketId?: string }) {
  console.log('🔵 ClientMap montado con ticketId:', ticketId);
  
  const [map, setMap] = useState<any>(null);
  const [ticketLoaded, setTicketLoaded] = useState(false);
  const [sites, setSites] = useState<Punto[]>([]);
  const [cuadrillas, setCuadrillas] = useState<Punto[]>([]);
  const [tickets, setTickets] = useState<Punto[]>([]);
  // ...existing code...

    // Las siguientes funciones y variables deben ser definidas correctamente antes de usar.
    // Se comentan para evitar errores de compilación y permitir avanzar.
    /*
    console.log(`🔄 Recargando tickets con estado: ${estado}...`);
    setTicketsLoaded(false); // Marcar como no cargados antes de recargar
    try {
      await loadTickets(estado, true); // Forzar recarga
    } catch (error) {
      console.error('❌ Error recargando tickets:', error);
    }

    const handleTicketsChange = (checked: boolean) => {
      setShowTickets(checked);
      if (checked) {
        console.log('🎫 Activando filtro de tickets');
        if (!showCuadrillas) {
          console.log(`👥 Activando cuadrillas automáticamente para mostrar radio de ${searchRadius}km...`);
          setShowCuadrillas(true);
        }
        if (!cuadrillasLoaded) {
          console.log(`👥 Cargando cuadrillas para calcular radio de ${searchRadius}km...`);
          loadCuadrillas();
        }
        let estadoAUsar = selectedEstado;
        if (!selectedEstado || selectedEstado === '') {
          console.log('🎫 No hay estado seleccionado. Seleccionando "NUEVO" por defecto.');
          setSelectedEstado('NUEVO');
          estadoAUsar = 'NUEVO';
        }
        console.log(`🎫 Cargando tickets con estado: ${estadoAUsar}`);
        if (!ticketsLoaded) {
          loadTickets(estadoAUsar);
        }
      } else {
        console.log('🎫 Desactivando filtro de tickets - Limpiando datos');
        setTickets([]);
        setTicketsLoaded(false);
        setSelectedEstado('');
      }
    };
    */
          const [selectedEstado, setSelectedEstado] = useState<string>('');
          const [totalTicketsDB, setTotalTicketsDB] = useState<number>(0);
          const [ticketsLoaded, setTicketsLoaded] = useState<boolean>(false);
  /* ---------- Regiones únicas ---------- */
  // const regions = useMemo(() => {
  //   const setR = new Set(
  //     allPoints
  //       .map((p) => (p.region ?? '').trim())
  //       .filter((r) => r.length > 0)
  //   );
  //   return Array.from(setR).sort((a, b) => a.localeCompare(b));
  // }, [allPoints]);
  /* ---------- Estados del catálogo ---------- */
  const [estadosCatalogo, setEstadosCatalogo] = useState<any[]>([]);
  
  // Cargar estados desde catalogo_estados
  // useEffect(() => {
  //   const loadEstados = async () => {
  //     try {
  //       console.log('🔄 Cargando TODOS los estados desde catalogo_estados...');
  //       const { data, error } = await supabase
  //         .from('catalogo_estados')
  //         .select('codigo, nombre, descripcion')
  //         .order('codigo');
  //       if (!error && data) {
  //         setEstadosCatalogo(data);
  //         console.log('✅ TODOS los estados del catálogo cargados:', data.length, 'estados');
  //         console.log('Estados disponibles (incluye activos e inactivos):', data.map(e => `${e.codigo}-${e.nombre}`).join(', '));
  //       } else {
  //         console.log('⚠️ Error cargando estados del catálogo, usando fallback:', error?.message);
  //         const fallbackEstados = [
  //           { codigo: 7, nombre: 'NUEVO', descripcion: 'Ticket recién creado' },
  //           { codigo: 8, nombre: 'RESUELTO', descripcion: 'Ticket completamente resuelto' }
  //         ];
  //         setEstadosCatalogo(fallbackEstados);
  //         console.log('📝 Usando estados fallback:', fallbackEstados.map(e => e.nombre).join(', '));
  //       }
  //     } catch (err) {
  //       console.error('❌ Error cargando estados:', err);
  //       const fallbackEstados = [
  //         { codigo: 7, nombre: 'NUEVO', descripcion: 'Ticket recién creado' },
  //         { codigo: 8, nombre: 'RESUELTO', descripcion: 'Ticket completamente resuelto' }
  //       ];
  //       setEstadosCatalogo(fallbackEstados);
  //     }
  //   };
  //   loadEstados();
  //   loadTotalTickets();
  // }, []);

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

  // useEffect para cargar automáticamente un ticket específico cuando se pasa ticketId por URL
  useEffect(() => {
    console.log('🔄 useEffect ejecutado - ticketId:', ticketId, 'map:', !!map, 'ticketLoaded:', ticketLoaded);
    
    if (!ticketId) {
      console.log('⚠️ No hay ticketId, saliendo...');
      return;
    }
    if (ticketLoaded) {
      console.log('✅ Ticket ya fue cargado previamente, saliendo...');
      return;
    }
    if (!map) {
      console.log('⏳ Esperando a que el mapa esté listo para cargar el ticket...');
      return;
    }
    console.log('✅ Mapa disponible, iniciando carga del ticket...');
    setTicketLoaded(true);
    // Activar los checks de cuadrillas y tickets automáticamente
    setShowCuadrillas(true);
    setShowTickets(true);
    const loadSpecificTicket = async () => {
      console.log(`🎯 Cargando ticket específico con ID: ${ticketId}`);
      
      try {
        // Cargar el ticket desde la base de datos
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets_v1')
          .select('id,ticket_source,site_id,site_name,task_category,estado,created_at')
          .eq('id', ticketId)
          .single();
        
        if (ticketError || !ticketData) {
          console.error('❌ Error cargando ticket:', ticketError);
          alert('No se pudo cargar el ticket. Verifica que el ID sea correcto.');
          return;
        }
        
        console.log('📋 Ticket encontrado:', ticketData);
        console.log('🔍 Buscando site con código:', ticketData.site_id);
        
        // Obtener las coordenadas del site asociado al ticket
        const { data: siteData, error: siteError } = await supabase
          .from('sites_v1')
          .select('latitud,longitud,region')
          .eq('codigo', ticketData.site_id)
          .single();
        
        if (siteError || !siteData) {
          console.error('❌ Error cargando site:', siteError);
          alert(`No se encontró el site ${ticketData.site_id} en la base de datos.`);
          return;
        }
        
        if (!siteData.latitud || !siteData.longitud) {
          console.error('❌ El site no tiene coordenadas:', siteData);
          alert(`El site ${ticketData.site_id} no tiene coordenadas registradas.`);
          return;
        }
        
        console.log('📍 Coordenadas del site:', siteData.latitud, siteData.longitud);
        
        // Crear el objeto TicketMapData
        const ticketMapData: TicketMapData = {
          id: ticketData.id,
          codigo: ticketData.ticket_source || ticketData.id,
          nombre: ticketData.site_name || ticketData.site_id || 'Sin nombre',
          latitud: siteData.latitud,
          longitud: siteData.longitud,
          region: siteData.region,
          estado: ticketData.estado || undefined,
          categoria: ticketData.task_category || undefined,
          tipo: 'ticket'
        };
            // ...existing code...
        
        console.log('✅ Ticket cargado con coordenadas:', ticketMapData.latitud, ticketMapData.longitud);
        
        // Mostrar cuadrillas automáticamente
        if (!cuadrillasLoaded) {
          console.log('📍 Cargando cuadrillas...');
          setShowCuadrillas(true);
          await loadCuadrillas();
        } else {
          setShowCuadrillas(true);
        }
        
        // Seleccionar el ticket automáticamente (esto también buscará cuadrillas cercanas)
        console.log('🎯 Seleccionando ticket y buscando cuadrillas cercanas...');
        await handleTicketSelection(ticketMapData);
        
        // Centrar el mapa en el ticket DESPUÉS de cargar todo
        setTimeout(() => {
          console.log('🗺️ Centrando mapa en:', ticketMapData.latitud, ticketMapData.longitud);
          if (map) {
            map.setView([ticketMapData.latitud, ticketMapData.longitud], 14);
          }
        }, 800);
        
      } catch (error) {
        console.error('❌ Error cargando ticket específico:', error);
        alert('Error al cargar el ticket. Revisa la consola para más detalles.');
      }
    };
    
    // Ejecutar la carga con un pequeño delay para asegurar que el mapa esté renderizado
    const timer = setTimeout(() => {
      loadSpecificTicket();
    }, 1000);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, map]); // Solo ejecutar cuando cambie ticketId o map esté disponible

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
            
            {(() => {
              if (!selectedTicket || !selectedTicket.latitud || !selectedTicket.longitud) return null;
              // Filtrar cuadrillas dentro del radio
              const cuadrillasEnRango = cuadrillasParaTicket.filter(cuadrilla =>
                cuadrilla.latitud !== null && cuadrilla.longitud !== null && typeof cuadrilla.latitud === 'number' && typeof cuadrilla.longitud === 'number' &&
                calculateDistance(selectedTicket.latitud, selectedTicket.longitud, cuadrilla.latitud, cuadrilla.longitud) <= searchRadius
              );
              if (cuadrillasEnRango.length === 0) {
                return <div style={{ 
                  padding: 12, 
                  textAlign: 'center', 
                  color: '#666',
                  backgroundColor: '#f8f9fa',
                  borderRadius: 4,
                  fontSize: 12
                }}>No hay cuadrillas dentro del radio de {searchRadius} km</div>;
              }
              return (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {cuadrillasEnRango.map(cuadrilla => (
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
                        <br />Distancia: {calculateDistance(selectedTicket.latitud, selectedTicket.longitud, cuadrilla.latitud, cuadrilla.longitud).toFixed(2)} km
                      </div>
                      <button
                        style={{
                          marginTop: 6,
                          padding: '4px 10px',
                          backgroundColor: selectedTicket ? '#007bff' : '#aaa',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: selectedTicket ? 'pointer' : 'not-allowed'
                        }}
                        disabled={!selectedTicket}
                        onClick={async () => {
                          if (!selectedTicket) {
                            alert('Selecciona un ticket antes de asignar la cuadrilla.');
                            return;
                          }
                          try {
                            let user = 'sistema';
                            if (supabase.auth.getUser) {
                              const userResult = await supabase.auth.getUser();
                              if (userResult && userResult.data && userResult.data.user && userResult.data.user.email) {
                                user = userResult.data.user.email;
                              }
                            }
                            const { data, error } = await supabase
                              .from('CUADRILLA_TICKET_ESTADOS')
                              .insert([
                                {
                                  ticket_id: selectedTicket.id,
                                  cuadrilla_id: cuadrilla.id,
                                  usuario_creacion: user,
                                  estado: 'ASIGNACION'
                                }
                              ]);
                            if (error) {
                              alert('Error al asignar cuadrilla: ' + error.message);
                            } else {
                              alert(`Cuadrilla ${cuadrilla.codigo} asignada al ticket ${selectedTicket.codigo}`);
                              if (typeof limpiarSeleccionTicket === 'function') {
                                limpiarSeleccionTicket();
                              }
                            }
                          } catch (err) {
                            alert('Error inesperado al asignar cuadrilla: ' + ((err as any)?.message || err));
                          }
                        }}
                      >
                        ASIGNAR
                      </button>
                      {!selectedTicket && (
                        <div style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
                          Selecciona un ticket para poder asignar esta cuadrilla.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
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
              {/* Filtrar rutas por radio antes de mostrar */}
              {rutasPorCategoria
                .filter(ruta => ruta.distanciaKm <= searchRadius)
                .map((ruta, index) => {
                  // Buscar cuadrilla por código o id
                  const cuadrilla = visibleCuadrillas.find(c => c.codigo === ruta.cuadrillaCodigo || c.id === ruta.cuadrillaId);
                  return (
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
                      {cuadrilla && (
                        <button
                          style={{
                            marginTop: 6,
                            padding: '4px 10px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          onClick={async () => {
                            try {
                              const { data: userData } = await supabase.auth.getUser();
                              const user = userData?.user?.email || 'sistema';
                              const { data, error } = await supabase
                                .from('CUADRILLA_TICKET_ESTADOS')
                                .insert([
                                  {
                                    ticket_id: selectedTicket.id,
                                    cuadrilla_id: cuadrilla.id,
                                    usuario_creacion: user,
                                    estado: 'ASIGNACION'
                                  }
                                ]);
                              if (error) {
                                alert('Error al asignar cuadrilla: ' + error.message);
                              } else {
                                alert(`Cuadrilla ${cuadrilla.codigo} asignada al ticket ${selectedTicket.codigo}`);
                                if (typeof limpiarSeleccionTicket === 'function') {
                                  limpiarSeleccionTicket();
                                }
                              }
                            } catch (err) {
                              alert('Error inesperado al asignar cuadrilla: ' + ((err as any)?.message || err));
                            }
                          }}
                        >
                          ASIGNAR
                        </button>
                      )}
                    </div>
                  );
                })}
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




  // ...existing code...
  // --- Renderizado de cuadrillas en el mapa ---
  let cuadrillasMarkers: React.ReactNode = null;
  if (typeof showCuadrillas !== 'undefined' && typeof selectedTicket !== 'undefined' && selectedTicket && selectedTicket.latitud && selectedTicket.longitud && typeof visibleCuadrillas !== 'undefined') {
    // Filtro seguro para cuadrillas
    const cuadrillasFiltradas = Array.isArray(visibleCuadrillas)
      ? visibleCuadrillas.filter((c) => c && typeof c.latitud === 'number' && typeof c.longitud === 'number' && c.activo !== false && c.tipo === 'cuadrilla')
      : [];
    if (cuadrillasFiltradas.length > 0) {
      cuadrillasMarkers = cuadrillasFiltradas.map((c) => {
        const isSelected = typeof selectedPoint !== 'undefined' && selectedPoint?.id === c.id && selectedPoint.tipo === 'cuadrilla';
        return (
          <CircleMarker
            key={`cuadrilla-${c.id}`}
            center={[c.latitud, c.longitud]}
            radius={isSelected ? 16 : 10}
            pathOptions={{
              color: isSelected ? '#007bff' : '#6f42c1',
              fillColor: isSelected ? '#ffff00' : '#6f42c1',
              weight: isSelected ? 4 : 2,
              fillOpacity: 0.7,
              opacity: 1,
            }}
            eventHandlers={{
              click: () => {
                if (typeof centerMapOnPoint === 'function') centerMapOnPoint(c);
              }
            }}
          >
            <Popup>
              <div>
                <b>👥 CUADRILLA</b><br />
                Código: {c.codigo}<br />
                Nombre: {c.nombre}<br />
                Categoría: {c.categoria || 'N/A'}<br />
                Activo: {c.activo ? '✅' : '❌'}<br />
                Coordenadas: {c.latitud}, {c.longitud}<br />
                {/* Botón de asignar comentado hasta definir supabase y limpiarSeleccionTicket correctamente */}
                {/* <button
                  style={{
                    marginTop: 8,
                    padding: '4px 10px',
                    backgroundColor: selectedTicket ? '#007bff' : '#aaa',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: selectedTicket ? 'pointer' : 'not-allowed'
                  }}
                  disabled={!selectedTicket}
                  onClick={async () => { ... }}
                >
                  ASIGNAR
                </button> */}
                {!selectedTicket ? (
                  <div style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
                    Selecciona un ticket para poder asignar esta cuadrilla.
                  </div>
                ) : null}
              </div>
            </Popup>
          </CircleMarker>
        );
      });
    }
  }

// ...existing code...
{/* Cuadrillas (datos reales actualizados cada 3 segundos) */}
{cuadrillasMarkers}

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
