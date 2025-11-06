'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './context/AuthContext';
import { USUARIO_ACTUAL } from '@/lib/auth';

// ==== Tipos auxiliares de datos que vienen de Supabase ====
type FaultLevelRow = { fault_level: string | null };
type AttentionTypeRow = { attention_type: string | null };
type SiteRow = { site_id: string | number | null; site_name: string | null };
type EstadoRow = { estado: string | null };

// ==== Tipos para estado/UI ====
type OpcionSite = { id: string; nombre: string };
type DatoTemporal = { fecha: string; cantidad: number; fechaFormateada: string };
type DatoMensual = { 
  mesAno: string; 
  cantidad: number; 
  fechaFormateada: string; 
  dias: DatoTemporal[];
  expandido?: boolean;
};
type EstadisticaEstado = { estado: string; cantidad: number; porcentaje: number };

export default function HomePage() {
  const { USUARIO_ACTUAL, userData } = useAuth();
  const [total, setTotal] = useState<number>(0);
  const [cargando, setCargando] = useState<boolean>(false);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [filtroFaultLevel, setFiltroFaultLevel] = useState<string>('');
  const [filtroSite, setFiltroSite] = useState<string>('');
  const [filtroAttentionType, setFiltroAttentionType] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string[]>([]);

  // 👇 Tipamos todos los arrays
  const [opcionesFaultLevel, setOpcionesFaultLevel] = useState<string[]>([]);
  const [opcionesSites, setOpcionesSites] = useState<OpcionSite[]>([]);
  const [opcionesAttentionType, setOpcionesAttentionType] = useState<string[]>([]);
  const [opcionesEstado, setOpcionesEstado] = useState<string[]>([]);
  const [ticketsFiltrados, setTicketsFiltrados] = useState<number>(0);
  const [datosTemporales, setDatosTemporales] = useState<DatoTemporal[]>([]);
  const [datosMensuales, setDatosMensuales] = useState<DatoMensual[]>([]);
  const [estadisticasEstado, setEstadisticasEstado] = useState<EstadisticaEstado[]>([]);
  const [mesesExpandidos, setMesesExpandidos] = useState<Set<string>>(new Set());
  const [ejecutarBusqueda, setEjecutarBusqueda] = useState<boolean>(false);

  useEffect(() => {
    cargarOpciones();
    // Cargar datos iniciales (sin filtros)
    cargarDatos();
  }, []);

  async function cargarOpciones() {
    try {
      console.log('Cargando opciones...');

      // ----- Fault Levels
      const { data: faultLevels } = await supabase
        .from('tickets_v1')
        .select('fault_level')
        .not('fault_level', 'is', null);

      const uniqueFaultLevels: string[] = Array.from(
        new Set(
          (faultLevels as FaultLevelRow[] | null)?.flatMap(r =>
            typeof r.fault_level === 'string' ? [r.fault_level] : []
          ) ?? []
        )
      ).sort();

      setOpcionesFaultLevel(uniqueFaultLevels);

      // ----- Sites
      const { data: sites } = await supabase
        .from('tickets_v1')
        .select('site_id, site_name')
        .not('site_id', 'is', null);

      const uniqueSites: OpcionSite[] = Array.from(
        new Map(
          ((sites as SiteRow[] | null) ?? []).map(item => {
            const id = String(item.site_id); // normalizamos a string para usarlo en <select>
            const nombre = item.site_name ? `${id} - ${item.site_name}` : id;
            return [id, { id, nombre }] as const;
          })
        ).values()
      ).sort((a, b) => a.nombre.localeCompare(b.nombre));

      setOpcionesSites(uniqueSites);

      // ----- Attention Types
      const { data: attentionTypes } = await supabase
        .from('tickets_v1')
        .select('attention_type')
        .not('attention_type', 'is', null);

      const uniqueAttentionTypes: string[] = Array.from(
        new Set(
          (attentionTypes as AttentionTypeRow[] | null)?.flatMap(r =>
            typeof r.attention_type === 'string' ? [r.attention_type] : []
          ) ?? []
        )
      ).sort();

      setOpcionesAttentionType(uniqueAttentionTypes);

      // ----- Estados
      const { data: estados } = await supabase
        .from('tickets_v1')
        .select('estado')
        .not('estado', 'is', null);

      const uniqueEstados: string[] = Array.from(
        new Set(
          (estados as EstadoRow[] | null)?.flatMap(r =>
            typeof r.estado === 'string' ? [r.estado] : []
          ) ?? []
        )
      ).sort();

      setOpcionesEstado(uniqueEstados);

      console.log('Opciones cargadas');
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Función para obtener TODOS los registros usando paginación
  async function obtenerTodosLosRegistrosFiltrados() {
    console.log('🔍 Iniciando obtención de registros filtrados...');
    console.log('📅 Filtros de fecha aplicados:', { fechaDesde, fechaHasta });
    
    const BATCH_SIZE = 1000;
    let allRecords: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('tickets_v1')
        .select('fault_occur_time, fault_level, attention_type, site_id, site_name, estado')
        .range(from, from + BATCH_SIZE - 1)
        .order('fault_occur_time', { ascending: true, nullsFirst: false });
      
      console.log(`📊 Aplicando filtros al lote ${Math.floor(from/BATCH_SIZE) + 1}...`);
      query = aplicarFiltros(query);
      const { data, error } = await query;

      if (error) {
        console.error('Error en paginación:', error);
        break;
      }

      if (data && data.length > 0) {
        // Debug: Mostrar fechas del primer y último registro de este lote
        const primerRegistro = data[0];
        const ultimoRegistro = data[data.length - 1];
        console.log(`📅 Lote ${Math.floor(from/BATCH_SIZE) + 1}: ${data.length} registros`);
        console.log(`   Primer fecha: ${primerRegistro.fault_occur_time}`);
        console.log(`   Última fecha: ${ultimoRegistro.fault_occur_time}`);
        
        allRecords = [...allRecords, ...data];
        from += BATCH_SIZE;
        hasMore = data.length === BATCH_SIZE; // Si devolvió menos del batch size, no hay más
      } else {
        hasMore = false;
      }
    }

    console.log('✅ Total de registros obtenidos con paginación:', allRecords.length);
    
    // Debug: Mostrar rango de fechas obtenidas
    if (allRecords.length > 0) {
      const fechas = allRecords
        .map(r => r.fault_occur_time)
        .filter(f => f && f !== null)
        .sort();
      
      if (fechas.length > 0) {
        console.log(`📊 Rango de fechas obtenidas: ${fechas[0]} hasta ${fechas[fechas.length - 1]}`);
      }
    }
    
    return allRecords;
  }

  // Tipamos como `any` para no pelear con tipos internos de la lib
  function aplicarFiltros(query: any) {
    // Aplicar filtros de fecha (sin incluir registros sin fecha por ahora para simplificar)
    if (fechaDesde) {
      console.log(`🔽 Aplicando filtro: fault_occur_time >= ${fechaDesde}`);
      query = query.gte('fault_occur_time', fechaDesde);
    }
    if (fechaHasta) {
      console.log(`🔼 Aplicando filtro: fault_occur_time <= ${fechaHasta} 23:59:59`);
      query = query.lte('fault_occur_time', `${fechaHasta} 23:59:59`);
    }
    if (filtroFaultLevel) {
      query = query.eq('fault_level', filtroFaultLevel);
    }
    if (filtroSite) {
      query = query.eq('site_id', filtroSite);
    }
    if (filtroAttentionType) {
      query = query.eq('attention_type', filtroAttentionType);
    }
    if (filtroEstado.length > 0) {
      query = query.in('estado', filtroEstado);
    }
    return query;
  }

  async function cargarDatos() {
    setCargando(true);
    try {
      console.log('Cargando datos...');

      const { count: totalGeneral } = await supabase
        .from('tickets_v1')
        .select('*', { count: 'exact', head: true });

      setTotal(totalGeneral ?? 0);

      // Verificar si hay filtros aplicados
      const hayFiltros = fechaDesde || fechaHasta || filtroFaultLevel || filtroSite || filtroAttentionType || filtroEstado.length > 0;

      // Variable para datos del gráfico temporal - usar filtrados si hay filtros, todos si no hay filtros
      let datosParaGraficoTemporal: any[] = [];
      
      if (hayFiltros) {
        // Obtener TODOS los registros filtrados usando paginación
        console.log('Obteniendo todos los registros con filtros usando paginación...');
        const ticketsFiltrados = await obtenerTodosLosRegistrosFiltrados();

        console.log('Tickets filtrados obtenidos:', ticketsFiltrados?.length);
        console.log('Filtros aplicados:', { fechaDesde, fechaHasta, filtroFaultLevel, filtroSite, filtroAttentionType, filtroEstado });
        
        // Si hay filtros de fecha, también obtener tickets sin fecha que cumplan otros filtros
        let ticketsSinFecha: any[] = [];
        if (fechaDesde || fechaHasta) {
          let querySinFecha = supabase
            .from('tickets_v1')
            .select('fault_occur_time, fault_level, attention_type, site_id, site_name, estado')
            .is('fault_occur_time', null)
            .range(0, 100000); // Asegurar que obtenga todos los registros sin fecha
          
          // Aplicar otros filtros (no de fecha) a los tickets sin fecha
          if (filtroFaultLevel) {
            querySinFecha = querySinFecha.eq('fault_level', filtroFaultLevel);
          }
          if (filtroSite) {
            querySinFecha = querySinFecha.eq('site_id', filtroSite);
          }
          if (filtroAttentionType) {
            querySinFecha = querySinFecha.eq('attention_type', filtroAttentionType);
          }
          if (filtroEstado.length > 0) {
            querySinFecha = querySinFecha.in('estado', filtroEstado);
          }
          
          const { data: sinFechaData } = await querySinFecha;
          ticketsSinFecha = sinFechaData || [];
          console.log('Tickets sin fecha que cumplen otros filtros:', ticketsSinFecha.length);
        }
        
        // Combinar tickets con fecha y sin fecha
        datosParaGraficoTemporal = [...ticketsFiltrados, ...ticketsSinFecha];
        console.log('Total de registros que cumplen el filtro:', datosParaGraficoTemporal.length);
        setTicketsFiltrados(datosParaGraficoTemporal.length);
      } else {
        // Si no hay filtros, NO obtener datos para gráfico temporal
        console.log('No hay filtros aplicados - no se cargarán datos para gráfico temporal');
        datosParaGraficoTemporal = [];
        setTicketsFiltrados(0); // Sin filtros = 0 tickets filtrados
      }

      // ----- Consulta para obtener estadísticas por estado (aplicando filtros si existen)
      let estadisticasReales: { estado: string; cantidad: number }[] = [];
      
      if (hayFiltros) {
        // Si hay filtros, calcular estadísticas a partir de los datos filtrados
        console.log('Calculando estadísticas por estado con filtros aplicados...');
        
        // Usar los mismos datos que ya tenemos para las estadísticas por estado
        // (incluye tickets con fecha + tickets sin fecha ya filtrados)
        if (datosParaGraficoTemporal && datosParaGraficoTemporal.length > 0) {
          // Agrupar por estado
          const conteosPorEstado = (datosParaGraficoTemporal as any[]).reduce((acc: Record<string, number>, ticket) => {
            const estado = ticket.estado || 'Sin estado';
            acc[estado] = (acc[estado] || 0) + 1;
            return acc;
          }, {});
          
          estadisticasReales = Object.entries(conteosPorEstado).map(([estado, cantidad]) => ({
            estado,
            cantidad: Number(cantidad)
          }));
        }
      } else {
        // Si no hay filtros, obtener estadísticas de todos los tickets
        console.log('Calculando estadísticas por estado sin filtros (todos los tickets)...');
        
        // Primero obtener todos los estados únicos
        const { data: estadosUnicos } = await supabase
          .from('tickets_v1')
          .select('estado')
          .not('estado', 'is', null)
          .limit(1000);

        // Obtener conteos reales para cada estado usando consultas separadas
        const estadosSet = new Set((estadosUnicos as any[])?.map(item => item.estado) || []);
        const estadosArray = Array.from(estadosSet);
        
        const estadisticasPromises = estadosArray.map(async (estado) => {
          const { count } = await supabase
            .from('tickets_v1')
            .select('*', { count: 'exact', head: true })
            .eq('estado', estado);
          return { estado, cantidad: count || 0 };
        });

        // También obtener registros sin estado
        const { count: sinEstadoCount } = await supabase
          .from('tickets_v1')
          .select('*', { count: 'exact', head: true })
          .is('estado', null);

        estadisticasReales = await Promise.all(estadisticasPromises);
        if (sinEstadoCount && sinEstadoCount > 0) {
          estadisticasReales.push({ estado: 'Sin estado', cantidad: sinEstadoCount });
        }
      }

      console.log('Estadísticas reales obtenidas:', estadisticasReales);
      console.log('Total general:', totalGeneral);

      // Solo procesar datos temporales si hay filtros aplicados
      if (hayFiltros && datosParaGraficoTemporal && datosParaGraficoTemporal.length > 0) {
        console.log('🔍 ANÁLISIS DE DATOS PARA GRÁFICO TEMPORAL:');
        console.log('🎯 Filtros activos:', { fechaDesde, fechaHasta, filtroFaultLevel, filtroSite, filtroAttentionType, filtroEstado });
        console.log('📊 Total de registros para procesar:', datosParaGraficoTemporal.length);
        
        // Análisis de fechas en los datos
        const fechasEncontradas = datosParaGraficoTemporal
          .map(t => t.fault_occur_time)
          .filter(f => f && f.trim() !== '')
          .map(f => f.split('T')[0])
          .sort();
        
        console.log('📅 Primeras 10 fechas:', fechasEncontradas.slice(0, 10));
        console.log('📅 Últimas 10 fechas:', fechasEncontradas.slice(-10));
        console.log('📅 Rango real: desde', fechasEncontradas[0], 'hasta', fechasEncontradas[fechasEncontradas.length - 1]);
        
        // Agrupar por día (usando datos filtrados si hay filtros, todos los tickets si no hay filtros)
        const datosAgrupados = (datosParaGraficoTemporal as any[]).reduce(
          (acc: Record<string, number>, ticket) => {
            let fecha: string;
            if (ticket.fault_occur_time && ticket.fault_occur_time.trim() !== '') {
              fecha = String(ticket.fault_occur_time).split('T')[0];
              // Debug: verificar formato de fecha
              if (!fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.warn('Formato de fecha inesperado:', fecha, 'de ticket:', ticket.fault_occur_time);
              }
            } else {
              fecha = 'SIN FECHA';
            }
            acc[fecha] = (acc[fecha] ?? 0) + 1;
            return acc;
          },
          {}
        );

        console.log('📈 Datos agrupados por día:', Object.keys(datosAgrupados).length, 'días únicos');
        console.log('📈 Muestra de datos agrupados:', Object.entries(datosAgrupados).slice(0, 5));

        const datosFormateados: DatoTemporal[] = Object.entries(datosAgrupados)
          .map(([fecha, cantidad]) => ({
            fecha,
            cantidad: Number(cantidad),
            fechaFormateada: fecha === 'SIN FECHA' ? fecha : new Date(fecha).toLocaleDateString('es-ES'),
          }))
          .sort((a, b) => {
            // Poner "SIN FECHA" al final
            if (a.fecha === 'SIN FECHA') return 1;
            if (b.fecha === 'SIN FECHA') return -1;
            return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
          });

        setDatosTemporales(datosFormateados);

        // Agrupar por mes-año
        console.log('📅 AGRUPANDO POR MES-AÑO...');
        console.log('📊 Datos formateados para agrupar:', datosFormateados.length, 'registros');
        console.log('📋 Primeros 5 datos formateados:', datosFormateados.slice(0, 5));
        
        const datosMensualesAgrupados = datosFormateados.reduce((acc: Record<string, { cantidad: number; dias: DatoTemporal[] }>, dato) => {
          if (dato.fecha === 'SIN FECHA') {
            const mesAno = 'SIN FECHA';
            if (!acc[mesAno]) {
              acc[mesAno] = { cantidad: 0, dias: [] };
            }
            acc[mesAno].cantidad += dato.cantidad;
            acc[mesAno].dias.push(dato);
            console.log(`📅 Agrupado SIN FECHA: ${dato.cantidad} tickets`);
          } else {
            const fechaObj = new Date(dato.fecha);
            // Verificar si la fecha es válida
            if (isNaN(fechaObj.getTime())) {
              console.warn('Fecha inválida encontrada:', dato.fecha);
              const mesAno = 'Fechas inválidas';
              if (!acc[mesAno]) {
                acc[mesAno] = { cantidad: 0, dias: [] };
              }
              acc[mesAno].cantidad += dato.cantidad;
              acc[mesAno].dias.push(dato);
            } else {
              // Usar UTC para evitar problemas de zona horaria
              const fechaUTC = new Date(dato.fecha + 'T12:00:00Z'); // Agregar hora del mediodía UTC
              const año = fechaUTC.getUTCFullYear();
              const mes = fechaUTC.getUTCMonth() + 1;
              const mesAno = `${año}-${String(mes).padStart(2, '0')}`;
              
              if (!acc[mesAno]) {
                acc[mesAno] = { cantidad: 0, dias: [] };
                console.log(`📅 Nuevo mes creado: ${mesAno}`);
              }
              acc[mesAno].cantidad += dato.cantidad;
              acc[mesAno].dias.push(dato);
              console.log(`📅 Fecha ${dato.fecha} → Mes ${mesAno}: +${dato.cantidad} tickets (total: ${acc[mesAno].cantidad})`);
            }
          }
          return acc;
        }, {});
        
        console.log('📈 RESULTADO DE AGRUPACIÓN MENSUAL:');
        console.log('🗓️ Meses encontrados:', Object.keys(datosMensualesAgrupados));
        Object.entries(datosMensualesAgrupados).forEach(([mes, data]) => {
          console.log(`   ${mes}: ${data.cantidad} tickets, ${data.dias.length} días`);
        });

        const datosMensualesFormateados: DatoMensual[] = Object.entries(datosMensualesAgrupados)
          .map(([mesAno, data]) => ({
            mesAno,
            cantidad: data.cantidad,
            fechaFormateada: mesAno === 'SIN FECHA' ? mesAno : (() => {
              const [año, mes] = mesAno.split('-').map(Number);
              // Usar UTC para evitar problemas de zona horaria
              return new Date(Date.UTC(año, mes - 1, 15)).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', timeZone: 'UTC' });
            })(),
            dias: data.dias,
          }))
          .sort((a, b) => {
            if (a.mesAno === 'SIN FECHA') return 1;
            if (b.mesAno === 'SIN FECHA') return -1;
            return a.mesAno.localeCompare(b.mesAno);
          });

        setDatosMensuales(datosMensualesFormateados);
      } else {
        // Limpiar datos temporales cuando no hay filtros o no hay datos
        console.log('Limpiando datos temporales - no hay filtros o no hay datos');
        setDatosTemporales([]);
        setDatosMensuales([]);
      }

      // ----- Procesar las estadísticas reales obtenidas
      if (estadisticasReales && estadisticasReales.length > 0) {
        // Calcular el total correcto según si hay filtros o no
        const totalParaPorcentajes = hayFiltros 
          ? estadisticasReales.reduce((sum, stat) => sum + stat.cantidad, 0) // Suma de tickets filtrados
          : total; // Total general si no hay filtros
        
        console.log('Total para cálculo de porcentajes:', totalParaPorcentajes, '(hay filtros:', hayFiltros, ')');
        
        const estadisticasFormateadas: EstadisticaEstado[] = estadisticasReales
          .map(({ estado, cantidad }) => ({
            estado,
            cantidad: Number(cantidad),
            porcentaje: totalParaPorcentajes > 0 ? (Number(cantidad) / totalParaPorcentajes) * 100 : 0,
          }))
          .sort((a, b) => b.cantidad - a.cantidad); // Ordenar por cantidad descendente

        console.log('Estadísticas formateadas:', estadisticasFormateadas);
        setEstadisticasEstado(estadisticasFormateadas);
      } else {
        setEstadisticasEstado([]);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setCargando(false);
  }

  useEffect(() => {
    if (ejecutarBusqueda) {
      cargarDatos();
      setEjecutarBusqueda(false); // Reset del trigger
    }
  }, [ejecutarBusqueda]);

  const ejecutarBuscar = () => {
    console.log('🚀 Ejecutando búsqueda con filtros:');
    console.log('📅 fechaDesde:', fechaDesde);
    console.log('📅 fechaHasta:', fechaHasta);
    
    // Validar formato de fechas
    if (fechaDesde) {
      const fechaDesdeObj = new Date(fechaDesde);
      console.log('📅 fechaDesde como Date:', fechaDesdeObj);
      console.log('📅 fechaDesde ISO:', fechaDesdeObj.toISOString());
    }
    if (fechaHasta) {
      const fechaHastaObj = new Date(fechaHasta);
      console.log('📅 fechaHasta como Date:', fechaHastaObj);
      console.log('📅 fechaHasta ISO:', fechaHastaObj.toISOString());
    }
    
    console.log('🏷️ filtroEstado:', filtroEstado);
    console.log('🏢 filtroSite:', filtroSite);
    console.log('⚡ filtroFaultLevel:', filtroFaultLevel);
    console.log('🎯 filtroAttentionType:', filtroAttentionType);
    
    setEjecutarBusqueda(true);
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setFiltroFaultLevel('');
    setFiltroSite('');
    setFiltroAttentionType('');
    setFiltroEstado([]);
    // Limpiar también los datos mostrados
    setDatosTemporales([]);
    setDatosMensuales([]);
    setEstadisticasEstado([]);
    setTicketsFiltrados(0);
  };

  const toggleMesExpandido = (mesAno: string) => {
    const nuevoSet = new Set(mesesExpandidos);
    if (nuevoSet.has(mesAno)) {
      nuevoSet.delete(mesAno);
    } else {
      nuevoSet.add(mesAno);
    }
    setMesesExpandidos(nuevoSet);
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 8px 0' }}>Dashboard Tickets</h1>
        <p style={{ 
          margin: 0, 
          color: '#64748b', 
          fontSize: 14,
          backgroundColor: '#f1f5f9',
          padding: '8px 12px',
          borderRadius: 6,
          display: 'inline-block'
        }}>
          📊 Panel de control • Usuario activo: <strong>{USUARIO_ACTUAL}</strong>
        </p>
      </div>

      <div
        style={{
          border: '2px solid #e2e8f0',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          backgroundColor: '#f8fafc',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0' }}>Filtros</h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Nivel de Falla
            </label>
            <select
              value={filtroFaultLevel}
              onChange={e => setFiltroFaultLevel(e.target.value)}
              style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
            >
              <option value="">Todos los niveles</option>
              {opcionesFaultLevel.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Sitio
            </label>
            <select
              value={filtroSite}
              onChange={e => setFiltroSite(e.target.value)}
              style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
            >
              <option value="">Todos los sitios</option>
              {opcionesSites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Tipo de Atencion
            </label>
            <select
              value={filtroAttentionType}
              onChange={e => setFiltroAttentionType(e.target.value)}
              style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
            >
              <option value="">Todos los tipos</option>
              {opcionesAttentionType.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Estado ({filtroEstado.length > 0 ? `${filtroEstado.length} seleccionados` : 'Ninguno seleccionado'})
            </label>
            <div style={{ 
              maxHeight: '120px', 
              overflowY: 'auto', 
              border: '1px solid #d1d5db', 
              borderRadius: 6, 
              padding: 8,
              backgroundColor: '#fff'
            }}>
              {opcionesEstado.map(estado => (
                <div key={estado} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: 4,
                  fontSize: 14
                }}>
                  <input
                    type="checkbox"
                    id={`estado-${estado}`}
                    checked={filtroEstado.includes(estado)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFiltroEstado(prev => [...prev, estado]);
                      } else {
                        setFiltroEstado(prev => prev.filter(item => item !== estado));
                      }
                    }}
                    style={{ marginRight: 8 }}
                  />
                  <label 
                    htmlFor={`estado-${estado}`}
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    {estado}
                  </label>
                </div>
              ))}
              {opcionesEstado.length === 0 && (
                <div style={{ color: '#6b7280', fontSize: 14 }}>
                  No hay estados disponibles
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={ejecutarBuscar}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            🔍 Buscar
          </button>
          
          <button
            onClick={limpiarFiltros}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            🗑️ Limpiar Filtros
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
            backgroundColor: 'white',
          }}
        >
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Total de Tickets</div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#0f172a' }}>
            {total.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
            backgroundColor: 'white',
          }}
        >
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
            {(fechaDesde || fechaHasta || filtroFaultLevel || filtroSite || filtroAttentionType || filtroEstado.length > 0) ? 'Tickets Filtrados' : 'Sin Filtros'}
          </div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2563eb' }}>
            {ticketsFiltrados.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
            backgroundColor: 'white',
          }}
        >
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
            {(fechaDesde || fechaHasta || filtroFaultLevel || filtroSite || filtroAttentionType || filtroEstado.length > 0) ? 'Porcentaje Filtrado' : 'Sin Filtros Aplicados'}
          </div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#16a34a' }}>
            {(fechaDesde || fechaHasta || filtroFaultLevel || filtroSite || filtroAttentionType || filtroEstado.length > 0) && total > 0 ? ((ticketsFiltrados / total) * 100).toFixed(1) + '%' : '0%'}
          </div>
        </div>
      </div>



      {cargando && (
        <div
          style={{
            textAlign: 'center',
            padding: 20,
            backgroundColor: '#fef3c7',
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          <p>Cargando datos...</p>
        </div>
      )}

      {/* Contenedor Grid para cuadros lado a lado */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* Cuadro de Tickets por Fecha */}
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
            backgroundColor: 'white',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0' }}>Tickets por Fecha</h3>
          <div style={{ height: 400, overflow: 'auto' }}>
            {datosMensuales.length > 0 ? (
              <div>
                <p style={{ marginBottom: 16, color: '#64748b', fontSize: 14 }}>
                  Mostrando {datosMensuales.length} meses con tickets (haz clic para ver detalle por días)
                </p>
                {datosMensuales.map((mes, index) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    {/* Fila del mes (clickeable) */}
                    <div
                      onClick={() => toggleMesExpandido(mes.mesAno)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        backgroundColor: mesesExpandidos.has(mes.mesAno) ? '#f0f9ff' : '#f8fafc',
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: mesesExpandidos.has(mes.mesAno) ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!mesesExpandidos.has(mes.mesAno)) {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!mesesExpandidos.has(mes.mesAno)) {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ 
                          marginRight: 8, 
                          fontSize: 16,
                          transform: mesesExpandidos.has(mes.mesAno) ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}>
                          ▶
                        </span>
                        <span style={{ fontWeight: 500 }}>{mes.fechaFormateada}</span>
                      </div>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: '#2563eb',
                        backgroundColor: 'white',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 13
                      }}>
                        {mes.cantidad} tickets
                      </span>
                    </div>

                    {/* Detalle por días (expandible) */}
                    {mesesExpandidos.has(mes.mesAno) && (
                      <div style={{ 
                        marginTop: 8, 
                        marginLeft: 24,
                        padding: '12px 16px',
                        backgroundColor: 'white',
                        borderRadius: 8,
                        border: '1px solid #e0f2fe'
                      }}>
                        {mes.dias.map((dia, diaIndex) => (
                          <div
                            key={diaIndex}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '6px 0',
                              borderBottom: diaIndex < mes.dias.length - 1 ? '1px solid #f0f9ff' : 'none',
                              fontSize: 13
                            }}
                          >
                            <span style={{ color: '#475569' }}>{dia.fechaFormateada}</span>
                            <span style={{ fontWeight: 500, color: '#0369a1' }}>
                              {dia.cantidad} tickets
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: '#64748b',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '2px dashed #cbd5e1'
              }}>
                <p style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>
                  📊 Aplica filtros para ver la distribución temporal
                </p>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Selecciona fechas, estado, sitio u otros criterios para visualizar los datos por fecha.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cuadro de Tickets por Estado */}
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
            backgroundColor: 'white',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0' }}>Tickets por Estado</h3>
          <div style={{ height: 400, overflow: 'auto' }}>
            {estadisticasEstado.length > 0 ? (
              <div>
                {/* Resumen total */}
                <div
                  style={{
                    marginBottom: 20,
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: 8,
                    borderLeft: '4px solid #2563eb',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: 4, fontSize: 14 }}>
                    Estados: {estadisticasEstado.length}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    Total: {total.toLocaleString()}
                  </div>
                </div>

                {/* Gráfico de barras */}
                <div>
                  {estadisticasEstado.map((item, index) => {
                    const maxCantidad = Math.max(...estadisticasEstado.map(e => e.cantidad));
                    const barWidth = (item.cantidad / maxCantidad) * 100;
                    
                    // Colores diferentes para cada barra
                    const colors = [
                      '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
                      '#c2410c', '#0891b2', '#be185d', '#4338ca', '#65a30d'
                    ];
                    const barColor = colors[index % colors.length];
                    
                    return (
                      <div
                        key={index}
                        style={{
                          marginBottom: 12,
                          padding: '8px 0',
                          borderBottom: index < estadisticasEstado.length - 1 ? '1px solid #f1f5f9' : 'none',
                        }}
                      >
                        {/* Etiqueta del estado */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 6,
                          }}
                        >
                          <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: 13 }}>
                            {item.estado}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {item.cantidad.toLocaleString()} ({item.porcentaje.toFixed(1)}%)
                          </div>
                        </div>
                        
                        {/* Barra de progreso */}
                        <div
                          style={{
                            width: '100%',
                            height: 20,
                            backgroundColor: '#f1f5f9',
                            borderRadius: 10,
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              width: `${barWidth}%`,
                              height: '100%',
                              backgroundColor: barColor,
                              borderRadius: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: barWidth > 25 ? 'center' : 'flex-end',
                              color: 'white',
                              fontSize: 10,
                              fontWeight: 'bold',
                              paddingRight: barWidth <= 25 ? 6 : 0,
                              transition: 'width 0.3s ease-in-out',
                            }}
                          >
                            {barWidth > 20 ? item.cantidad.toLocaleString() : ''}
                          </div>
                          {barWidth <= 20 && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 6,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: 10,
                                fontWeight: 'bold',
                                color: '#1e293b',
                              }}
                            >
                              {item.cantidad.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                  No hay datos de estados
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 14,
          color: '#64748b',
          backgroundColor: '#f1f5f9',
          padding: 16,
          borderRadius: 8,
        }}
      >
        <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Filtros Activos:</p>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          {fechaDesde && <li>Desde: {fechaDesde}</li>}
          {fechaHasta && <li>Hasta: {fechaHasta}</li>}
          {filtroFaultLevel && <li>Nivel: {filtroFaultLevel}</li>}
          {filtroSite && <li>Sitio: {opcionesSites.find(s => s.id === filtroSite)?.nombre}</li>}
          {filtroAttentionType && <li>Tipo: {filtroAttentionType}</li>}
          {filtroEstado.length > 0 && <li>Estados: {filtroEstado.join(', ')}</li>}
          {!fechaDesde && !fechaHasta && !filtroFaultLevel && !filtroSite && !filtroAttentionType && filtroEstado.length === 0 && (
            <li>Sin filtros - Mostrando todos los tickets</li>
          )}
        </ul>
      </div>
    </div>
  );
}
