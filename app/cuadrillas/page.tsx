'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = {
  id: number;
  nombre: string | null;
  supervisor: string | null;
  telefono: string | null;
  zona: string | null;        // (tu “región”/zona)
  activo: boolean | null;
  latitud: number | string | null;
  longitud: number | string | null; // 👈 usar longitud (no altitud)
};

export default function CuadrillasPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 👇 Traemos longitud en vez de altitud
  const selectCols =
    'id,nombre,supervisor,telefono,zona,activo,latitud,longitud';

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      let query = supabase
        .from('cuadrillas_v1')
        .select(selectCols)
        .order('nombre', { ascending: true });

      const term = q.trim();
      if (term) {
        query = supabase
          .from('cuadrillas_v1')
          .select(selectCols)
          .or(
            [
              `nombre.ilike.%${term}%`,
              `supervisor.ilike.%${term}%`,
              `zona.ilike.%${term}%`,
            ].join(',')
          )
          .order('nombre', { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      console.error('Error loading cuadrillas:', e?.message || e);
      setErr(e?.message || 'Error cargando cuadrillas');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 350);
    return () => clearTimeout(id);
  }, [q]);

  const hasData = useMemo(() => rows.length > 0, [rows]);

  return (
    <div style={{ padding: '20px', maxWidth: 1400, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 30,
          flexWrap: 'wrap',
          gap: 15,
        }}
      >
        <h2 style={{ margin: 0, color: '#6f42c1', fontSize: 28 }}>👥 Cuadrillas</h2>

        <a
          href="/cuadrillas/new"
          style={{
            padding: '12px 24px',
            backgroundColor: '#6f42c1',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          ➕ Nueva Cuadrilla
        </a>
      </div>

      <div style={{ marginBottom: 25 }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, supervisor, zona o región..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 460,
            padding: '12px 15px',
            border: '2px solid #dee2e6',
            borderRadius: 8,
            fontSize: 14,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          }}
        />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <h3>🔄 Cargando cuadrillas...</h3>
        </div>
      )}

      {!loading && err && (
        <div
          style={{
            padding: 16,
            border: '1px solid #f5c2c7',
            background: '#f8d7da',
            color: '#842029',
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          ⚠️ {err}
        </div>
      )}

      {!loading && !err && !hasData && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <h3>📭 No se encontraron cuadrillas</h3>
          {q && <p>Prueba con otros términos de búsqueda</p>}
        </div>
      )}

      {!loading && !err && hasData && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#6f42c1', color: 'white' }}>
                <th style={th}>Nombre</th>
                <th style={th}>Supervisor</th>
                <th style={th}>Teléfono</th>
                <th style={th}>Región</th>
                <th style={th}>Zona</th>
                <th style={{ ...th, textAlign: 'center' }}>📍 Latitud</th>
                <th style={{ ...th, textAlign: 'center' }}>🧭 Longitud</th>
                <th style={{ ...th, textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, idx) => {
                const lat =
                  c.latitud === null || c.latitud === '' ? null : Number(c.latitud);
                const lng =
                  c.longitud === null || c.longitud === '' ? null : Number(c.longitud);

                return (
                  <tr
                    key={c.id}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white',
                      borderBottom: '1px solid #dee2e6',
                    }}
                  >
                    <td style={tdStrong}>{c.nombre ?? '-'}</td>
                    <td style={td}>{c.supervisor ?? '-'}</td>
                    <td style={td}>{c.telefono ?? '-'}</td>
                    <td style={td}>{c.zona ?? '-'}</td>
                    <td style={{ ...td, textAlign: 'center' }}></td>

                    <td style={tdMonoCenter}>
                      {lat !== null ? (
                        <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                          {lat.toFixed(4)}°
                        </span>
                      ) : (
                        <span style={{ color: '#6c757d' }}>No definida</span>
                      )}
                    </td>

                    <td style={tdMonoCenter}>
                      {lng !== null ? (
                        <span style={{ color: '#17a2b8', fontWeight: 'bold' }}>
                          {lng.toFixed(4)}°
                        </span>
                      ) : (
                        <span style={{ color: '#6c757d' }}>No definida</span>
                      )}
                    </td>

                    <td style={{ ...td, textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 'bold',
                          backgroundColor: c.activo ? '#28a745' : '#dc3545',
                          color: 'white',
                        }}
                      >
                        {c.activo ? '✅ Activo' : '❌ Inactivo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          marginTop: 40,
          padding: 20,
          backgroundColor: '#f3e5f5',
          borderRadius: 8,
          border: '1px solid #6f42c1',
        }}
      >
        <h4 style={{ margin: '0 0 10px 0', color: '#6f42c1' }}>
          ℹ️ Información de Cuadrillas
        </h4>
        <p style={{ margin: 0, fontSize: 14, color: '#4a148c' }}>
          Gestión de cuadrillas con <strong>ubicación geográfica</strong>. Las columnas de
          <strong> Latitud </strong> y <strong> Longitud</strong> muestran la posición
          exacta de cada cuadrilla para mejor coordinación y asignación de trabajos.
        </p>
      </div>
    </div>
  );
}

/* ---------- estilos ---------- */
const th: React.CSSProperties = {
  padding: '15px 12px',
  textAlign: 'left',
  fontWeight: 'bold',
  fontSize: 14,
};
const td: React.CSSProperties = {
  padding: 12,
  fontSize: 14,
};
const tdStrong: React.CSSProperties = {
  ...td,
  fontWeight: 500,
};
const tdMonoCenter: React.CSSProperties = {
  ...td,
  textAlign: 'center',
  fontSize: 13,
  fontFamily: 'monospace',
};
