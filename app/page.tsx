﻿'use client';

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
  const [filtroEstado, setFiltroEstado] = useState<string>('');

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

  useEffect(() => {
    cargarOpciones();
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

  // Tipamos como `any` para no pelear con tipos internos de la lib
  function aplicarFiltros(query: any) {
    if (fechaDesde || fechaHasta) {
      // Si hay filtros de fecha, excluir registros sin fecha
      query = query.not('fault_occur_time', 'is', null);
      
      if (fechaDesde) {
        query = query.gte('fault_occur_time', fechaDesde);
      }
      if (fechaHasta) {
        query = query.lte('fault_occur_time', `${fechaHasta} 23:59:59`);
      }
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
    if (filtroEstado) {
      query = query.eq('estado', filtroEstado);
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

      // Consulta para tickets filtrados (para gráfico temporal y conteo)
      let queryFiltrada: any = supabase
        .from('tickets_v1')
        .select('fault_occur_time, fault_level, attention_type, site_id, site_name, estado');

      queryFiltrada = queryFiltrada.order('fault_occur_time', { ascending: true, nullsLast: true }).limit(5000);
      queryFiltrada = aplicarFiltros(queryFiltrada);
      const { data: ticketsData } = await queryFiltrada;

      console.log('Tickets filtrados obtenidos:', ticketsData?.length);
      console.log('Filtros aplicados:', { fechaDesde, fechaHasta, filtroFaultLevel, filtroSite, filtroAttentionType, filtroEstado });

      // Verificar si hay filtros aplicados
      const hayFiltros = fechaDesde || fechaHasta || filtroFaultLevel || filtroSite || filtroAttentionType || filtroEstado;
      
      if (hayFiltros) {
        setTicketsFiltrados(ticketsData?.length ?? 0);
      } else {
        setTicketsFiltrados(0); // Sin filtros = 0 tickets filtrados
      }

      // ----- Consulta para obtener estadísticas reales por estado usando RPC o agregación
      // Primero intentamos obtener todos los estados únicos
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

      const estadisticasReales = await Promise.all(estadisticasPromises);
      if (sinEstadoCount && sinEstadoCount > 0) {
        estadisticasReales.push({ estado: 'Sin estado', cantidad: sinEstadoCount });
      }

      console.log('Estadísticas reales obtenidas:', estadisticasReales);
      console.log('Total general:', totalGeneral);

      if (ticketsData && ticketsData.length > 0) {
        // Agrupar por día
        const datosAgrupados = (ticketsData as any[]).reduce(
          (acc: Record<string, number>, ticket) => {
            let fecha: string;
            if (ticket.fault_occur_time && ticket.fault_occur_time.trim() !== '') {
              fecha = String(ticket.fault_occur_time).split('T')[0];
            } else {
              fecha = 'Sin fecha registrada';
            }
            acc[fecha] = (acc[fecha] ?? 0) + 1;
            return acc;
          },
          {}
        );

        const datosFormateados: DatoTemporal[] = Object.entries(datosAgrupados)
          .map(([fecha, cantidad]) => ({
            fecha,
            cantidad: Number(cantidad),
            fechaFormateada: fecha === 'Sin fecha registrada' ? fecha : new Date(fecha).toLocaleDateString('es-ES'),
          }))
          .sort((a, b) => {
            // Poner "Sin fecha registrada" al final
            if (a.fecha === 'Sin fecha registrada') return 1;
            if (b.fecha === 'Sin fecha registrada') return -1;
            return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
          });

        setDatosTemporales(datosFormateados);

        // Agrupar por mes-año
        const datosMensualesAgrupados = datosFormateados.reduce((acc: Record<string, { cantidad: number; dias: DatoTemporal[] }>, dato) => {
          if (dato.fecha === 'Sin fecha registrada') {
            const mesAno = 'Sin fecha registrada';
            if (!acc[mesAno]) {
              acc[mesAno] = { cantidad: 0, dias: [] };
            }
            acc[mesAno].cantidad += dato.cantidad;
            acc[mesAno].dias.push(dato);
          } else {
            const fechaObj = new Date(dato.fecha);
            const mesAno = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}`;
            
            if (!acc[mesAno]) {
              acc[mesAno] = { cantidad: 0, dias: [] };
            }
            acc[mesAno].cantidad += dato.cantidad;
            acc[mesAno].dias.push(dato);
          }
          return acc;
        }, {});

        const datosMensualesFormateados: DatoMensual[] = Object.entries(datosMensualesAgrupados)
          .map(([mesAno, data]) => ({
            mesAno,
            cantidad: data.cantidad,
            fechaFormateada: mesAno === 'Sin fecha registrada' ? mesAno : 
              new Date(`${mesAno}-01`).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
            dias: data.dias,
          }))
          .sort((a, b) => {
            if (a.mesAno === 'Sin fecha registrada') return 1;
            if (b.mesAno === 'Sin fecha registrada') return -1;
            return a.mesAno.localeCompare(b.mesAno);
          });

        setDatosMensuales(datosMensualesFormateados);
      } else {
        setDatosTemporales([]);
        setDatosMensuales([]);
      }

      // ----- Procesar las estadísticas reales obtenidas
      if (estadisticasReales && estadisticasReales.length > 0) {
        const totalTicketsReales = total || 5000;
        console.log('Total tickets reales para cálculo:', totalTicketsReales);
        
        const estadisticasFormateadas: EstadisticaEstado[] = estadisticasReales
          .map(({ estado, cantidad }) => ({
            estado,
            cantidad: Number(cantidad),
            porcentaje: totalTicketsReales > 0 ? (Number(cantidad) / totalTicketsReales) * 100 : 0,
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
    cargarDatos();
  }, [fechaDesde, fechaHasta, filtroFaultLevel, filtroSite, filtroAttentionType, filtroEstado]);

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setFiltroFaultLevel('');
    setFiltroSite('');
    setFiltroAttentionType('');
    setFiltroEstado('');
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
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
            >
              <option value="">Todos los estados</option>
              {opcionesEstado.map(estado => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
        </div>

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
          Limpiar Filtros
        </button>
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
            {(fechaDesde || fechaHasta || filtroFaultLevel || filtroSite || filtroAttentionType || filtroEstado) ? 'Tickets Filtrados' : 'Sin Filtros'}
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
            {(fechaDesde || fechaHasta || filtroFaultLevel || filtroSite || filtroAttentionType || filtroEstado) ? 'Porcentaje Filtrado' : 'Sin Filtros Aplicados'}
          </div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#16a34a' }}>
            {(fechaDesde || fechaHasta || filtroFaultLevel || filtroSite || filtroAttentionType || filtroEstado) && total > 0 ? ((ticketsFiltrados / total) * 100).toFixed(1) + '%' : '0%'}
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
              <p>No hay datos temporales para mostrar</p>
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
          {filtroEstado && <li>Estado: {filtroEstado}</li>}
          {!fechaDesde && !fechaHasta && !filtroFaultLevel && !filtroSite && !filtroAttentionType && !filtroEstado && (
            <li>Sin filtros - Mostrando todos los tickets</li>
          )}
        </ul>
      </div>
    </div>
  );
}
