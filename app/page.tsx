'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ==== Tipos auxiliares de datos que vienen de Supabase ====
type FaultLevelRow = { fault_level: string | null };
type AttentionTypeRow = { attention_type: string | null };
type SiteRow = { site_id: string | number | null; site_name: string | null };

// ==== Tipos para estado/UI ====
type OpcionSite = { id: string; nombre: string };
type DatoTemporal = { fecha: string; cantidad: number; fechaFormateada: string };

export default function HomePage() {
  const [total, setTotal] = useState<number>(0);
  const [cargando, setCargando] = useState<boolean>(false);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [filtroFaultLevel, setFiltroFaultLevel] = useState<string>('');
  const [filtroSite, setFiltroSite] = useState<string>('');
  const [filtroAttentionType, setFiltroAttentionType] = useState<string>('');

  // 👇 Tipamos todos los arrays
  const [opcionesFaultLevel, setOpcionesFaultLevel] = useState<string[]>([]);
  const [opcionesSites, setOpcionesSites] = useState<OpcionSite[]>([]);
  const [opcionesAttentionType, setOpcionesAttentionType] = useState<string[]>([]);
  const [ticketsFiltrados, setTicketsFiltrados] = useState<number>(0);
  const [datosTemporales, setDatosTemporales] = useState<DatoTemporal[]>([]);

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

      console.log('Opciones cargadas');
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Tipamos como `any` para no pelear con tipos internos de la lib
  function aplicarFiltros(query: any) {
    if (fechaDesde) {
      query = query.gte('fault_occur_time', fechaDesde);
    }
    if (fechaHasta) {
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

      let queryFiltrada: any = supabase
        .from('tickets_v1')
        .select('fault_occur_time, fault_level, attention_type, site_id, site_name')
        .not('fault_occur_time', 'is', null)
        .order('fault_occur_time', { ascending: true })
        .limit(5000);

      queryFiltrada = aplicarFiltros(queryFiltrada);
      const { data: ticketsData } = await queryFiltrada;

      setTicketsFiltrados(ticketsData?.length ?? 0);

      if (ticketsData && ticketsData.length > 0) {
        const datosAgrupados = (ticketsData as any[]).reduce(
          (acc: Record<string, number>, ticket) => {
            const fecha: string = String(ticket.fault_occur_time ?? '').split('T')[0] || 'Sin fecha';
            acc[fecha] = (acc[fecha] ?? 0) + 1;
            return acc;
          },
          {}
        );

        const datosFormateados: DatoTemporal[] = Object.entries(datosAgrupados)
          .map(([fecha, cantidad]) => ({
            fecha,
            cantidad: Number(cantidad),
            fechaFormateada: new Date(fecha).toLocaleDateString('es-ES'),
          }))
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        setDatosTemporales(datosFormateados);
      } else {
        setDatosTemporales([]);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, [fechaDesde, fechaHasta, filtroFaultLevel, filtroSite, filtroAttentionType]);

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setFiltroFaultLevel('');
    setFiltroSite('');
    setFiltroAttentionType('');
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      <h1>Dashboard Tickets V1 - Analisis Temporal</h1>

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
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Tickets Filtrados</div>
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
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Porcentaje</div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#16a34a' }}>
            {total > 0 ? ((ticketsFiltrados / total) * 100).toFixed(1) : '0'}%
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

      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 20,
          backgroundColor: 'white',
          marginBottom: 24,
        }}
      >
        <h3>Tickets por Fecha (Eje X: Fecha, Eje Y: Cantidad)</h3>
        <div style={{ height: 400, overflow: 'auto' }}>
          {datosTemporales.length > 0 ? (
            <div>
              <p>Mostrando {datosTemporales.length} fechas con tickets</p>
              {datosTemporales.slice(0, 30).map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span>{item.fechaFormateada}</span>
                  <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{item.cantidad} tickets</span>
                </div>
              ))}
              {datosTemporales.length > 30 && (
                <p style={{ textAlign: 'center', color: '#64748b', marginTop: 16 }}>
                  ... y {datosTemporales.length - 30} fechas mas
                </p>
              )}
            </div>
          ) : (
            <p>No hay datos temporales para mostrar</p>
          )}
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
          {!fechaDesde && !fechaHasta && !filtroFaultLevel && !filtroSite && !filtroAttentionType && (
            <li>Sin filtros - Mostrando todos los tickets</li>
          )}
        </ul>
      </div>
    </div>
  );
}
