'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DESCRIPCIONES = [
  'Alarmas en Gestor',
  'Alarmas Externas', 
  'Caida',
  'Caida de clientes',
  'Corte_Energia',
  'Energia',
  'MBTS',
  'Solicitud cliente',
  'TX'
];

const TIPOS = [
  'CORTE ENERGIA',
  'ENERGIA',
  'MBTS',
  'PEXT - Atenuacion de FO',
  'PEXT - Corte de FO',
  'PEXT - Falsa Averia',
  'RADIO',
  'RED - TRANSPORTE DE RED',
  'SEGURIDAD',
  'SISTEMA ELECTRICO',
  'TX'
];

const SEVERIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
const ESTADOS = ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];

export default function EditarTicketV1({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [siteQ, setSiteQ] = useState('');
  const [siteOpts, setSiteOpts] = useState<any[]>([]);

  // Cargar ticket existente
  useEffect(() => {
    const loadTicket = async () => {
      const { data, error } = await supabase
        .from('tickets_v1')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading ticket:', error);
        setMensaje('Error al cargar el ticket: ' + error.message);
        return;
      }

      setTicket(data);
      if (data.codigo_site) {
        setSiteQ(`${data.codigo_site}`);
      }
    };

    if (id) {
      loadTicket();
    }
  }, [id]);

  // Búsqueda de sites
  useEffect(() => {
    if (!siteQ.trim() || (ticket && siteQ === ticket.codigo_site)) {
      setSiteOpts([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      const { data } = await supabase.from('sites')
        .select('codigo,site,direccion')
        .or(`codigo.ilike.%${siteQ}%,site.ilike.%${siteQ}%`)
        .limit(10);
      setSiteOpts(data || []);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [siteQ, ticket]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTicket((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');

    try {
      if (!ticket.descripcion || !ticket.tipo_falla) {
        setMensaje('Los campos Descripción y Tipo de Falla son obligatorios');
        setLoading(false);
        return;
      }

      const updateData = {
        folio: ticket.folio,
        descripcion: ticket.descripcion,
        tipo_falla: ticket.tipo_falla,
        severidad: ticket.severidad,
        estado: ticket.estado,
        detalle: ticket.detalle,
        codigo_site: ticket.codigo_site || null,
        created_by: ticket.created_by,
        updated_at: new Date().toISOString(),
        // Actualizar resuelto_at si el estado cambia a RESUELTO o CERRADO
        resuelto_at: (ticket.estado === 'RESUELTO' || ticket.estado === 'CERRADO') 
          ? ticket.resuelto_at || new Date().toISOString()
          : ticket.resuelto_at
      };

      const { error } = await supabase
        .from('tickets_v1')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error al actualizar ticket:', error);
        setMensaje('Error al actualizar el ticket: ' + error.message);
        setLoading(false);
        return;
      }

      setMensaje('✅ Ticket V1 actualizado exitosamente');
      
      setTimeout(() => {
        router.push('/tickets-v1');
      }, 2000);

    } catch (error) {
      console.error('Error inesperado:', error);
      setMensaje('Error inesperado al actualizar el ticket');
      setLoading(false);
    }
  };

  if (!ticket) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <h2>🔄 Cargando ticket...</h2>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('es-ES');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px' 
      }}>
        <h2 style={{ margin: 0, color: '#007bff' }}>
          Editar Ticket V1 #{ticket.folio || ticket.id} 📝
        </h2>
        <Link 
          href="/tickets-v1"
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px'
          }}
        >
          ← Volver a Tickets V1
        </Link>
      </div>

      {mensaje && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: mensaje.includes('Error') ? '#f8d7da' : '#d4edda',
          color: mensaje.includes('Error') ? '#721c24' : '#155724',
          border: `1px solid ${mensaje.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '6px',
          fontWeight: 'bold'
        }}>
          {mensaje}
        </div>
      )}

      {/* Información del ticket */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Información del Ticket</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '14px' }}>
          <div><strong>ID:</strong> {ticket.id}</div>
          <div><strong>Creado:</strong> {formatDate(ticket.created_at)}</div>
          <div><strong>Actualizado:</strong> {formatDate(ticket.updated_at)}</div>
          <div><strong>Detectado:</strong> {formatDate(ticket.detectado_at)}</div>
          <div><strong>Resuelto:</strong> {formatDate(ticket.resuelto_at) || 'Pendiente'}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ 
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        
        {/* Información básica */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '8px' }}>
            Información Básica
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Folio
              </label>
              <input
                type="text"
                name="folio"
                value={ticket.folio || ''}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Creado por
              </label>
              <input
                type="text"
                name="created_by"
                value={ticket.created_by || ''}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Descripción del problema */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '8px' }}>
            Descripción del Problema
          </h3>
          
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Descripción *
              </label>
              <select
                name="descripcion"
                value={ticket.descripcion || ''}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Seleccionar descripción</option>
                {DESCRIPCIONES.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Tipo de Falla *
              </label>
              <select
                name="tipo_falla"
                value={ticket.tipo_falla || ''}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Seleccionar tipo de falla</option>
                {TIPOS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Detalle adicional
              </label>
              <textarea
                name="detalle"
                value={ticket.detalle || ''}
                onChange={handleInputChange}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </div>

        {/* Clasificación */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '8px' }}>
            Clasificación
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Severidad
              </label>
              <select
                name="severidad"
                value={ticket.severidad || 'MEDIA'}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                {SEVERIDADES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Estado
              </label>
              <select
                name="estado"
                value={ticket.estado || 'NUEVO'}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                {ESTADOS.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Site asociado */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '8px' }}>
            Site Asociado
          </h3>
          
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Código del Site
            </label>
            <input
              type="text"
              name="codigo_site"
              value={ticket.codigo_site || ''}
              onChange={handleInputChange}
              placeholder="Código del site"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '30px' }}>
          <Link
            href="/tickets-v1"
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          >
            Cancelar
          </Link>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? '🔄 Actualizando...' : '✅ Actualizar Ticket V1'}
          </button>
        </div>
      </form>
    </div>
  );
}