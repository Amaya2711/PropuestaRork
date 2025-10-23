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

export default function NuevoTicketV1() {
  const router = useRouter();
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [cuadrillas, setCuadrillas] = useState<any[]>([]);
  const [siteQ, setSiteQ] = useState('');
  const [siteOpts, setSiteOpts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    folio: '',
    descripcion: '',
    tipo_falla: '',
    severidad: 'MEDIA',
    estado: 'NUEVO',
    detalle: '',
    codigo_site: '',
    creado_por: ''
  });

  useEffect(() => {
    // Cargar cuadrillas activas
    supabase.from('cuadrillas').select('id,codigo,nombre').eq('activo', true)
      .then(({ data }) => setCuadrillas(data || []));
  }, []);

  // Búsqueda de sites
  useEffect(() => {
    const id = setTimeout(async () => {
      if (!siteQ.trim()) { 
        setSiteOpts([]); 
        return; 
      }
      const { data } = await supabase.from('sites')
        .select('codigo,site,direccion')
        .or(`codigo.ilike.%${siteQ}%,site.ilike.%${siteQ}%`)
        .limit(10);
      setSiteOpts(data || []);
    }, 300);
    return () => clearTimeout(id);
  }, [siteQ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');

    try {
      // Validaciones básicas
      if (!formData.descripcion || !formData.tipo_falla) {
        setMensaje('Los campos Descripción y Tipo de Falla son obligatorios');
        setLoading(false);
        return;
      }

      // Generar folio automático si no se proporciona
      const folio = formData.folio || `TKT-${Date.now()}`;

      const ticketData = {
        folio: folio,
        descripcion: formData.descripcion,
        tipo_falla: formData.tipo_falla,
        severidad: formData.severidad,
        estado: formData.estado,
        detalle: formData.detalle || null,
        codigo_site: formData.codigo_site || null,
        creado_por: formData.creado_por || 'Sistema',
        detectado_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tickets_v1')
        .insert([ticketData])
        .select('id')
        .single();

      if (error) {
        console.error('Error al crear ticket:', error);
        setMensaje('Error al crear el ticket: ' + error.message);
        setLoading(false);
        return;
      }

      setMensaje('✅ Ticket V1 creado exitosamente');
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push('/tickets-v1');
      }, 2000);

    } catch (error) {
      console.error('Error inesperado:', error);
      setMensaje('Error inesperado al crear el ticket');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px' 
      }}>
        <h2 style={{ margin: 0, color: '#28a745' }}>Nuevo Ticket V1 📋</h2>
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
                Folio (opcional)
              </label>
              <input
                type="text"
                name="folio"
                value={formData.folio}
                onChange={handleInputChange}
                placeholder="Se genera automáticamente si no se especifica"
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
                name="creado_por"
                value={formData.creado_por}
                onChange={handleInputChange}
                placeholder="Nombre del usuario"
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
                value={formData.descripcion}
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
                value={formData.tipo_falla}
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
                value={formData.detalle}
                onChange={handleInputChange}
                rows={4}
                placeholder="Descripción detallada del problema..."
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
                value={formData.severidad}
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
                Estado inicial
              </label>
              <select
                name="estado"
                value={formData.estado}
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
              Buscar Site
            </label>
            <input
              type="text"
              value={siteQ}
              onChange={e => setSiteQ(e.target.value)}
              placeholder="Buscar por código o nombre del site"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            
            {!!siteOpts.length && (
              <div style={{
                border: '1px solid #ddd',
                borderTop: 'none',
                maxHeight: '200px',
                overflowY: 'auto',
                backgroundColor: 'white'
              }}>
                {siteOpts.map((s: any) => (
                  <div
                    key={s.codigo}
                    style={{
                      padding: '10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee'
                    }}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, codigo_site: s.codigo }));
                      setSiteQ(`${s.codigo} - ${s.site}`);
                      setSiteOpts([]);
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <strong>{s.codigo}</strong> – {s.site}
                    {s.direccion && <div style={{ fontSize: '12px', color: '#666' }}>{s.direccion}</div>}
                  </div>
                ))}
              </div>
            )}

            {formData.codigo_site && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '4px',
                color: '#155724'
              }}>
                <strong>Site seleccionado:</strong> {formData.codigo_site}
              </div>
            )}
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
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? '🔄 Creando...' : '✅ Crear Ticket V1'}
          </button>
        </div>
      </form>
    </div>
  );
}