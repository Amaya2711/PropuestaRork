'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const REGIONES = [
  'AMAZONAS', 'ANCASH', 'APURIMAC', 'AREQUIPA', 'AYACUCHO',
  'CAJAMARCA', 'CALLAO', 'CUSCO', 'HUANCAVELICA', 'HUANUCO',
  'ICA', 'JUNIN', 'LA LIBERTAD', 'LAMBAYEQUE', 'LIMA',
  'LORETO', 'MADRE DE DIOS', 'MOQUEGUA', 'PASCO', 'PIURA',
  'PUNO', 'SAN MARTIN', 'TACNA', 'TUMBES', 'UCAYALI'
];

export default function EditSiteV1({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [site, setSite] = useState<any>(null);

  // Cargar site existente
  useEffect(() => {
    const loadSite = async () => {
      const { data, error } = await supabase
        .from('sites_v1')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading site:', error);
        setMessage('Error al cargar el site: ' + error.message);
        return;
      }

      setSite(data);
    };

    if (id) {
      loadSite();
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSite((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!site.codigo?.trim()) {
      errors.push('El código del site es obligatorio');
    }

    if (!site.site?.trim()) {
      errors.push('El nombre del site es obligatorio');
    }

    if (!site.region) {
      errors.push('La región es obligatoria');
    }

    // Validar coordenadas si se proporcionan
    if (site.latitud) {
      const lat = parseFloat(site.latitud);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push('La latitud debe ser un número válido entre -90 y 90');
      }
    }

    if (site.longitud) {
      const lng = parseFloat(site.longitud);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push('La longitud debe ser un número válido entre -180 y 180');
      }
    }

    if (site.potencia && site.potencia !== '') {
      const potencia = parseFloat(site.potencia);
      if (isNaN(potencia) || potencia < 0) {
        errors.push('La potencia debe ser un número válido mayor o igual a 0');
      }
    }

    if (site.altura_antena && site.altura_antena !== '') {
      const altura = parseFloat(site.altura_antena);
      if (isNaN(altura) || altura < 0) {
        errors.push('La altura de antena debe ser un número válido mayor o igual a 0');
      }
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const errors = validateForm();
      if (errors.length > 0) {
        setMessage('❌ Errores de validación:\n' + errors.join('\n'));
        setLoading(false);
        return;
      }

      // Verificar si otro site tiene el mismo código (excluyendo el actual)
      const { data: existingSite } = await supabase
        .from('sites_v1')
        .select('id, codigo')
        .eq('codigo', site.codigo.trim().toUpperCase())
        .neq('id', id)
        .single();

      if (existingSite) {
        setMessage('❌ Error: Ya existe otro site con este código');
        setLoading(false);
        return;
      }

      const updateData = {
        codigo: site.codigo.trim().toUpperCase(),
        site: site.site.trim(),
        direccion: site.direccion?.trim() || null,
        region: site.region,
        latitud: site.latitud ? parseFloat(site.latitud) : null,
        longitud: site.longitud ? parseFloat(site.longitud) : null,
        tipo_site: site.tipo_site?.trim() || null,
        estado: site.estado || 'ACTIVO',
        proveedor: site.proveedor?.trim() || null,
        tecnologia: site.tecnologia?.trim() || null,
        banda_frecuencia: site.banda_frecuencia?.trim() || null,
        potencia: site.potencia ? parseFloat(site.potencia) : null,
        altura_antena: site.altura_antena ? parseFloat(site.altura_antena) : null,
        observaciones: site.observaciones?.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('sites_v1')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error al actualizar site:', error);
        setMessage('❌ Error al actualizar el site: ' + error.message);
        setLoading(false);
        return;
      }

      setMessage('✅ Site V1 actualizado exitosamente');
      
      setTimeout(() => {
        router.push('/sites-v1');
      }, 2000);

    } catch (error) {
      console.error('Error inesperado:', error);
      setMessage('❌ Error inesperado al actualizar el site');
      setLoading(false);
    }
  };

  if (!site) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <h2>🔄 Cargando site...</h2>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('es-ES');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px' 
      }}>
        <h2 style={{ margin: 0, color: '#007bff' }}>
          Editar Site V1: {site.codigo} 📝
        </h2>
        <Link 
          href="/sites-v1"
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px'
          }}
        >
          ← Volver a Sites V1
        </Link>
      </div>

      {message && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          color: message.includes('Error') ? '#721c24' : '#155724',
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '6px',
          whiteSpace: 'pre-line',
          fontWeight: 'bold'
        }}>
          {message}
        </div>
      )}

      {/* Información del site */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Información del Site</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '14px' }}>
          <div><strong>ID:</strong> {site.id}</div>
          <div><strong>Creado:</strong> {formatDate(site.created_at)}</div>
          <div><strong>Actualizado:</strong> {formatDate(site.updated_at)}</div>
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
                Código del Site *
              </label>
              <input
                type="text"
                name="codigo"
                value={site.codigo || ''}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Nombre del Site *
              </label>
              <input
                type="text"
                name="site"
                value={site.site || ''}
                onChange={handleInputChange}
                required
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

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Dirección
            </label>
            <input
              type="text"
              name="direccion"
              value={site.direccion || ''}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Región *
              </label>
              <select
                name="region"
                value={site.region || ''}
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
                <option value="">Seleccionar región</option>
                {REGIONES.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Tipo de Site
              </label>
              <select
                name="tipo_site"
                value={site.tipo_site || ''}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Seleccionar tipo</option>
                <option value="MACRO">MACRO</option>
                <option value="MICRO">MICRO</option>
                <option value="PICO">PICO</option>
                <option value="FEMTO">FEMTO</option>
                <option value="REPETIDOR">REPETIDOR</option>
                <option value="BACKBONE">BACKBONE</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Estado
              </label>
              <select
                name="estado"
                value={site.estado || 'ACTIVO'}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                <option value="PROYECTO">PROYECTO</option>
              </select>
            </div>
          </div>
        </div>

        {/* Coordenadas geográficas */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '8px' }}>
            Coordenadas Geográficas
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Latitud
              </label>
              <input
                type="number"
                step="any"
                name="latitud"
                value={site.latitud || ''}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Valor entre -90 y 90 grados
              </small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Longitud
              </label>
              <input
                type="number"
                step="any"
                name="longitud"
                value={site.longitud || ''}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Valor entre -180 y 180 grados
              </small>
            </div>
          </div>
        </div>

        {/* Información técnica */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '8px' }}>
            Información Técnica
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Proveedor
              </label>
              <input
                type="text"
                name="proveedor"
                value={site.proveedor || ''}
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
                Tecnología
              </label>
              <select
                name="tecnologia"
                value={site.tecnologia || ''}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Seleccionar tecnología</option>
                <option value="2G">2G</option>
                <option value="3G">3G</option>
                <option value="4G">4G</option>
                <option value="5G">5G</option>
                <option value="2G/3G">2G/3G</option>
                <option value="3G/4G">3G/4G</option>
                <option value="4G/5G">4G/5G</option>
                <option value="2G/3G/4G">2G/3G/4G</option>
                <option value="3G/4G/5G">3G/4G/5G</option>
                <option value="TODAS">TODAS</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Banda de Frecuencia
              </label>
              <input
                type="text"
                name="banda_frecuencia"
                value={site.banda_frecuencia || ''}
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
                Potencia (W)
              </label>
              <input
                type="number"
                step="0.1"
                name="potencia"
                value={site.potencia || ''}
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
                Altura Antena (m)
              </label>
              <input
                type="number"
                step="0.1"
                name="altura_antena"
                value={site.altura_antena || ''}
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

        {/* Observaciones */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '8px' }}>
            Observaciones
          </h3>
          
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Notas adicionales
            </label>
            <textarea
              name="observaciones"
              value={site.observaciones || ''}
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

        {/* Botones */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '30px' }}>
          <Link
            href="/sites-v1"
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
            {loading ? '🔄 Actualizando...' : '✅ Actualizar Site V1'}
          </button>
        </div>
      </form>
    </div>
  );
}