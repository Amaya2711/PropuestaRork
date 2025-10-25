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

  // Funciones para manejar cambios de checkbox con carga automática
  const handleSitesChange = (checked: boolean) => {
    setShowSites(checked);
    if (checked && !sitesLoaded) {
      loadSites();
    }
  };

  const handleCuadrillasChange = (checked: boolean) => {
    setShowCuadrillas(checked);
    if (checked && !cuadrillasLoaded) {
      loadCuadrillas();
    }
  };

  const handleTicketsChange = (checked: boolean) => {
    setShowTickets(checked);
    if (checked && !ticketsLoaded) {
      loadTickets();
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

  // ¿El punto pertenece a la región seleccionada?
  const matchesRegion = (p: Punto) => {
    if (!selectedRegion) return true; // Todas las regiones
    const puntoRegion = (p.region ?? '').trim();
    const regionSeleccionada = selectedRegion.trim();
    const matches = puntoRegion === regionSeleccionada;
    
    // Debug específico para tickets
    if (p.tipo === 'ticket') {
      console.log(`matchesRegion TICKET: "${puntoRegion}" === "${regionSeleccionada}" = ${matches} (ID: ${p.id})`);
    }
    
    return matches;
  };

  // Debug del filtrado de tickets por región
  useEffect(() => {
    if (ticketsLoaded && tickets.length > 0) {
      console.log('=== DEBUG FILTRADO TICKETS ===');
      console.log('Región seleccionada:', `"${selectedRegion}"`);
      console.log('Total tickets cargados:', tickets.length);
      
      // Calcular directamente los tickets visibles para debug
      const ticketsVisibles = selectedRegion ? tickets.filter(matchesRegion) : tickets;
      console.log('Tickets visibles después del filtro:', ticketsVisibles.length);
      
      // Mostrar todas las regiones únicas en los tickets
      const regionesEnTickets = [...new Set(tickets.map(t => t.region))].sort();
      console.log('Regiones únicas en tickets:', regionesEnTickets);
      
      // Contar tickets por región
      const contadorRegiones = {};
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
  }, [selectedRegion, tickets]);

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
        .filter(matchesRegion)
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
  }, [searchQuery, allPoints, selectedRegion]);

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
      tickets: tickets.length,
      total: allPoints.length,
    }),
    [sites, cuadrillas, tickets, allPoints]
  );

  // Colecciones filtradas por región (para mapa y contadores visibles)
  const visibleSites = useMemo(
    () => (selectedRegion ? sites.filter(matchesRegion) : sites),
    [sites, selectedRegion]
  );
  const visibleCuadrillas = useMemo(
    () => (selectedRegion ? cuadrillas.filter(matchesRegion) : cuadrillas),
    [cuadrillas, selectedRegion]
  );
  const visibleTickets = useMemo(() => {
    const result = selectedRegion ? tickets.filter(matchesRegion) : tickets;
    console.log(`visibleTickets useMemo: ${result.length} tickets visible (región: "${selectedRegion || 'TODAS'}")`);
    return result;
  }, [tickets, selectedRegion]);
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
              🎫 Tickets: {ticketsLoaded ? `${visibleTickets.length}/${totals.tickets}` : loadingTickets ? '⏳' : 'No cargado'} | 
              🔗 Total: {visibleTotal}/{totals.total}
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
                  <b>🎫 TICKETS</b>
                  <br />
                  Cantidad: {t.ticketId}
                  <br />
                  Site: {t.codigo}
                  <br />
                  Estados: {t.estadoTicket}
                  <br />
                  Categorías: {t.categoria}
                  <br />
                  Región: {t.region}
                  <br />
                  {t.latitud}, {t.longitud}
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
