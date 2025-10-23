'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabaseClient';

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

type Punto = {
  id: number | string;
  codigo: string;
  nombre: string | null;
  region: string | null;
  latitud: number | null;
  longitud: number | null;
  tipo: 'site' | 'cuadrilla';
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
export default function MapPage() {
  const [map, setMap] = useState<any>(null);
  const [sites, setSites] = useState<Punto[]>([]);
  const [cuadrillas, setCuadrillas] = useState<Punto[]>([]);
  const [allPoints, setAllPoints] = useState<Punto[]>([]);

  const [loading, setLoading] = useState(false);
  const [showSites, setShowSites] = useState(true);
  const [showCuadrillas, setShowCuadrillas] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Punto[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<Punto | null>(null);

  /* ---------- Carga de datos ---------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
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

        const cuadsRaw = await fetchAll<CuadrillaDB>(
          'cuadrillas_v1',
          'id,codigo,nombre,supervisor,zona,activo,latitud,longitud,telefono'
        );

        const cuadsPoints: Punto[] = cuadsRaw.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          region: c.zona,
          latitud: c.latitud,
          longitud: c.longitud,
          tipo: 'cuadrilla',
        }));

        setSites(sitesPoints);
        setCuadrillas(cuadsPoints);
        setAllPoints([...sitesPoints, ...cuadsPoints]);
      } catch (e) {
        console.error('Error cargando datos del mapa:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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
  }, [searchQuery, allPoints]);

  const centerMapOnPoint = (p: Punto) => {
    setSelectedPoint(p);
    setSearchQuery(`${p.codigo} - ${p.nombre ?? ''}`);
    setShowSearchResults(false);

    if (map && p.latitud && p.longitud) map.setView([p.latitud, p.longitud], 15);
  };

  const counters = useMemo(() => {
    return {
      sites: sites.length,
      cuads: cuadrillas.length,
      total: allPoints.length,
    };
  }, [sites, cuadrillas, allPoints]);

  return (
    <div style={{ height: 'calc(100vh - 80px)' }}>
      {/* Barra superior */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
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
                    <div style={{ fontWeight: 600 }}>{p.codigo} — {p.nombre ?? '-'}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {p.region ?? '-'} • {p.latitud}, {p.longitud}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estado y toggles */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            flex: '1 1 auto',
          }}
        >
          <span style={{ color: loading ? '#007bff' : '#333', fontWeight: 500 }}>
            {loading
              ? '⏳ Cargando...'
              : `📡 Sites: ${counters.sites} | 👥 Cuadrillas: ${counters.cuads} | 🔗 Total: ${counters.total}`}
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={showSites}
              onChange={(e) => setShowSites(e.target.checked)}
            />
            <span style={{ color: '#28a745', fontWeight: 600 }}>📡 Sites V1</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={showCuadrillas}
              onChange={(e) => setShowCuadrillas(e.target.checked)}
            />
            <span style={{ color: '#6f42c1', fontWeight: 600 }}>👥 Cuadrillas</span>
          </label>
        </div>

        {/* Indicador */}
        {selectedPoint ? (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              borderRadius: 6,
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              animation: 'pulse 2s infinite',
            }}
          >
            🎯 {selectedPoint.codigo}
          </div>
        ) : (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: 6,
              fontWeight: 700,
            }}
          >
            ❌ NINGÚN SITE SELECCIONADO
          </div>
        )}
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
          sites.map((s) => {
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
          cuadrillas.map((c) => {
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
      </MapContainer>
    </div>
  );
}
