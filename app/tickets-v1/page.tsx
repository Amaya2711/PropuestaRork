'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

import type { TicketV1 } from '@/lib/tickets/types';

const PAGE_SIZE = 10;

export default function TicketsV1Page() {
  const [rows, setRows] = useState<TicketV1[]>([]);
  const [loading, setLoading] = useState(false);
  const [qText, setQText] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const SELECT = [
    'id',
    'ticket_source',
    'site_id',
    'site_name',
    'fault_level',
    'fault_occur_time',
    'complete_time',
    'task_category',
    'task_subcategory',
    'platform_affected',
    'attention_type',
    'service_affected',
    'estado',
    'created_at',
    'updated_at',
  ].join(',');

  function buildQuery() {
    let q = supabase
      .from('tickets_v1')
      .select(SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const term = qText.trim();
    if (term) {
      q = q.or(
        [
          `ticket_source.ilike.%${term}%`,
          `site_id.ilike.%${term}%`,
          `site_name.ilike.%${term}%`,
          `fault_level.ilike.%${term}%`,
          `task_category.ilike.%${term}%`,
          `task_subcategory.ilike.%${term}%`,
          `platform_affected.ilike.%${term}%`,
          `attention_type.ilike.%${term}%`,
          `service_affected.ilike.%${term}%`,
          `estado.ilike.%${term}%`,
        ].join(',')
      );
    }

    return q;
  }

  async function load() {
    setLoading(true);
    const { data, error, count } = await buildQuery();
    setLoading(false);

    if (error) {
      console.error('Error loading tickets:', error);
      alert(error.message);
      setRows([]);
      setTotal(0);
      return;
    }

    // ✅ Validación segura del tipo antes de asignar
    if (!Array.isArray(data)) {
      console.error("La API devolvió un formato inesperado:", data);
      setRows([]);
      setTotal(0);
      return;
    }

    setRows(data as TicketV1[]);
    setTotal(count ?? 0);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qText, page]);

  const formatDateTime = (value: string | null) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('es-ES');
    } catch {
      return value;
    }
  };

  const getEstadoStyle = (estado: string | null) => {
    if (!estado) {
      return {
        backgroundColor: '#f5f5f5',
        color: '#666',
        borderLeft: '3px solid #ccc',
      };
    }

    const estadoLower = estado.toLowerCase().trim();
    switch (estadoLower) {
      case 'en ejecución':
      case 'en ejecucion':
        return { backgroundColor: '#e8f5e8', color: '#2e7d32', borderLeft: '3px solid #4caf50' };
      case 'asignado':
        return { backgroundColor: '#e3f2fd', color: '#1565c0', borderLeft: '3px solid #2196f3' };
      case 'en espera':
        return { backgroundColor: '#fff8e1', color: '#f57c00', borderLeft: '3px solid #ff9800' };
      case 'en ruta':
        return { backgroundColor: '#f3e5f5', color: '#7b1fa2', borderLeft: '3px solid #9c27b0' };
      case 'neutralizado':
        return { backgroundColor: '#e0f2f1', color: '#00695c', borderLeft: '3px solid #26a69a' };
      case 'validado':
        return { backgroundColor: '#e8eaf6', color: '#283593', borderLeft: '3px solid #3f51b5' };
      case 'nuevo':
        return { backgroundColor: '#fff3e0', color: '#e65100', borderLeft: '3px solid #ff6f00' };
      case 'completado':
      case 'resuelto':
      case 'finalizado':
        return { backgroundColor: '#e8f5e8', color: '#2e7d32', borderLeft: '3px solid #4caf50' };
      case 'cancelado':
      case 'anulado':
        return { backgroundColor: '#f3f4f6', color: '#374151', borderLeft: '3px solid #6b7280' };
      case 'pendiente':
        return { backgroundColor: '#fef7cd', color: '#a16207', borderLeft: '3px solid #eab308' };
      case 'urgente':
      case 'crítico':
        return { backgroundColor: '#ffebee', color: '#c62828', borderLeft: '3px solid #f44336' };
      case 'revisión':
      case 'revision':
        return { backgroundColor: '#f0f4f8', color: '#475569', borderLeft: '3px solid #64748b' };
      case 'bloqueado':
        return { backgroundColor: '#fef2f2', color: '#dc2626', borderLeft: '3px solid #ef4444' };
      case 'en progreso':
      case 'progreso':
        return { backgroundColor: '#dbeafe', color: '#1d4ed8', borderLeft: '3px solid #3b82f6' };
      default:
        return { backgroundColor: '#f0f9ff', color: '#0369a1', borderLeft: '3px solid #0ea5e9' };
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        <h2 style={{ margin: 0, color: '#007bff' }}>Tickets 📋</h2>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link
            href="/tickets-v1/new"
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
            }}
          >
            + Nuevo Ticket V1
          </Link>

          <div style={{
            padding: '8px 12px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '14px',
          }}>
            Total: {total} tickets
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por ticket, site, nivel, categoría, plataforma, estado…"
          value={qText}
          onChange={(e) => {
            setPage(1);
            setQText(e.target.value);
          }}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #dee2e6',
            borderRadius: '6px',
            fontSize: '16px',
          }}
        />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#007bff', fontSize: '18px' }}>
          🔄 Cargando tickets...
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d',
        }}>
          <h3>No se encontraron tickets</h3>
          <p>Intenta cambiar los criterios de búsqueda o crea un nuevo ticket.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Ticket</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Site</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Nivel</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Categoría</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Subcategoría</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Estado</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Creado</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontWeight: 'bold', color: '#007bff' }}>
                        {t.ticket_source || '(sin código)'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{t.site_id ?? '-'}</strong>
                        <span style={{ color: '#666', fontSize: 12 }}>{t.site_name ?? ''}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>{t.fault_level ?? '-'}</td>
                    <td style={{ padding: '12px' }}>{t.task_category ?? '-'}</td>
                    <td style={{ padding: '12px' }}>{t.task_subcategory ?? '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'inline-block',
                        minWidth: '80px',
                        textAlign: 'center',
                        ...getEstadoStyle(t.estado),
                      }}>
                        {t.estado ?? 'Sin estado'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>{formatDateTime(t.created_at)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <Link
                        href={`/tickets-v1/${t.id}/edit`}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
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

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
          }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '8px 16px',
                backgroundColor: page > 1 ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: page > 1 ? 'pointer' : 'not-allowed',
              }}
            >
              ← Anterior
            </button>

            <span style={{ fontWeight: 'bold' }}>
              Página {page} de {Math.max(1, Math.ceil(total / PAGE_SIZE))} ({total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} de {total})
            </span>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / PAGE_SIZE)}
              style={{
                padding: '8px 16px',
                backgroundColor: page < Math.ceil(total / PAGE_SIZE) ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: page < Math.ceil(total / PAGE_SIZE) ? 'pointer' : 'not-allowed',
              }}
            >
              Siguiente →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
