'use client';
import { useAuth } from '../context/AuthContext';
import LoginForm from './LoginForm';

interface AppContentProps {
  children: React.ReactNode;
}

export default function AppContent({ children }: AppContentProps) {
  const { isAuthenticated, userData, USUARIO_ACTUAL, logout, loading } = useAuth();

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#64748b' }}>Verificando acceso...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Si NO está autenticado, mostrar formulario de login
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Si está autenticado, mostrar la aplicación completa con navegación
  return (
    <div>
      {/* Barra superior de usuario */}
      <div style={{
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '8px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px'
      }}>
        <div>
          <span style={{ fontWeight: '500' }}>
            Bienvenido, {userData?.nombre_empleado || USUARIO_ACTUAL}
          </span>
          <span style={{ marginLeft: '15px', color: '#94a3b8' }}>
            Usuario: {USUARIO_ACTUAL}
          </span>
          <span style={{ marginLeft: '15px', color: '#94a3b8' }}>
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
        <button
          onClick={logout}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #475569',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Navegación principal */}
      <header style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>
        <nav style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/">Inicio</a>
          <a href="/sites-v1" style={{ fontWeight: 'bold', color: '#28a745' }}>Sites</a>
          <a href="/cuadrillas">Cuadrillas</a>
          <a href="/tickets-v1" style={{ fontWeight: 'bold', color: '#007bff' }}>Tickets</a>
          <a href="/map">Mapa</a>
          <a href="/map-google" style={{ fontWeight: 'bold', color: '#dc3545' }}>Google Maps</a>
        </nav>
      </header>

      {/* Contenido principal */}
      <main style={{ padding: '16px', maxWidth: 1300, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}