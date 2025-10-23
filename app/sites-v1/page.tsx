'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const PAGE_SIZE = 20;

type SiteV1 = {
  id: number;
  codigo: string;
  site: string | null;
  region: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  tipologia: string | null;
  tecnologias: string | null;
};

export default function SitesV1Page() {
  const [rows, setRows] = useState<SiteV1[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Campos que sí mostramos (de lo que venga con * )
  const pickFields = useMemo(
    () => (r: any): SiteV1 => ({
      id: r.id,
      codigo: r.codigo,
      site: r.site ?? null,
      region: r.region ?? null,
      direccion: r.direccion ?? null,
      latitud: r.latitud ?? null,
      longitud: r.longitud ?? null,
      tipologia: r.tipologia ?? null,
      tecnologias: r.tecnologias ?? null,
    }),
    []
  );

  function buildQuery() {
    let query = supabase
      .from('sites_v1')
      .select('*', { count: 'exact' }) // <- no pedimos columnas por nombre
      .order('codigo', { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const term = q.trim();
    if (term) {
      // Filtra sólo por campos existentes
      query = query.or(
        [
          `codigo.ilike.%${term}%`,
          `site.ilike.%${term}%`,
          `region.ilike.%${term}%`,
          `direccion.ilike.%${term}%`,
        ].join(',')
      );
    }
    return query;
  }

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    const { data, error, count } = await buildQuery();
    setLoading(false);

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      setRows([]);
      setTotal(0);
      return;
    }

    const safe = (data ?? []).map(pickFields);
    setRows(safe);
    setTotal(count || 0);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#28a745' }}>📡 Sites V1 - Nueva Gestión</h2>

        <Link
          href="/sites-v1/new"
          style={{
            padding: '10px 16px',
            backgroundColor: '#28a745',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 6,
            fontWeight: 'bold',
          }}
        >
          + Crear Nuevo Site V1
        </Link>
      </div>

      {/* Buscador + total */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por código, nombre, región o dirección…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          style={{
            width: 320,
            padding: '10px 12px',
            border: '2px solid #dee2e6',
            borderRadius: 6,
            fontSize: 14,
          }}
        />
        <div
          style={{
            padding: '8px 12px',
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          Total: {total} sites{q ? ' (filtrado)' : ''}
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            background: '#f8d7da',
            border: '1px solid #f5c2c7',
            color: '#842029',
            borderRadius: 6,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Tabla */}
      <div style={{ overflowX: 'auto', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead>
            <tr style={{ background: '#28a745', color: '#fff' }}>
              <th style={th}>Código</th>
              <th style={th}>Nombre Site</th>
              <th style={th}>Región</th>
              <th style={th}>Dirección</th>
              <th style={th}>Coordenadas</th>
              <th style={th}>Estado</th> {/* placeholder visual */}
              <th style={th}>Tecnología</th>
              <th style={th}>Tipo</th>
              <th style={{ ...th, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#28a745' }}>
                  Cargando sites…
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#6c757d' }}>
                  No se encontraron resultados
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStrong}>{s.codigo}</td>
                  <td style={td}>{s.site ?? '-'}</td>
                  <td style={td}>{s.region ?? '-'}</td>
                  <td style={td}>{s.direccion ?? '-'}</td>
                  <td style={tdMono}>
                    {typeof s.latitud === 'number' && typeof s.longitud === 'number'
                      ? `${s.latitud.toFixed(6)}, ${s.longitud.toFixed(6)}`
                      : '—'}
                  </td>
                  {/* Estado no existe en BD → mostramos N/A */}
                  <td style={tdCenter}>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: '#e9ecef',
                        color: '#6c757d',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      N/A
                    </span>
                  </td>
                  <td style={td}>{s.tecnologias ?? '-'}</td>
                  <td style={td}>{s.tipologia ?? '-'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <Link
                      href={`/sites-v1/${s.id}/edit`}
                      style={{
                        padding: '6px 12px',
                        background: '#007bff',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          padding: 12,
          background: '#f8f9fa',
          borderRadius: 8,
        }}
      >
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={btn(page > 1)}>
          ← Anterior
        </button>
        <span style={{ fontWeight: 600 }}>
          Página {page} de {Math.max(1, Math.ceil(total / PAGE_SIZE))} ({total} resultados)
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= Math.ceil(total / PAGE_SIZE)}
          style={btn(page < Math.ceil(total / PAGE_SIZE))}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

/* ===== estilos ===== */
const th: React.CSSProperties = { padding: '12px', textAlign: 'left', fontWeight: 700, fontSize: 14 };
const td: React.CSSProperties = { padding: '10px', fontSize: 14, color: '#212529' };
const tdStrong: React.CSSProperties = { ...td, fontWeight: 700, color: '#28a745' };
const tdMono: React.CSSProperties = { ...td, fontFamily: 'monospace' };
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' };
const btn = (enabled: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  background: enabled ? '#007bff' : '#6c757d',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: enabled ? 'pointer' : 'not-allowed',
});
