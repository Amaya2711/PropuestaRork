'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Rutas que no requieren autenticación
  const publicRoutes = ['/login'];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const authStatus = localStorage.getItem('isAuthenticated');
      const userDataStr = localStorage.getItem('userData');

      if (authStatus === 'true' && userDataStr) {
        const userData = JSON.parse(userDataStr);
        
        // Verificar que la sesión no sea muy antigua (opcional)
        const loginTime = new Date(userData.loginTime);
        const now = new Date();
        const diffHours = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);

        // Sesión válida por 8 horas
        if (diffHours < 8) {
          setIsAuthenticated(true);
          setUserData(userData);
        } else {
          // Sesión expirada
          logout();
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUserData(null);
    router.push('/login');
  };

  // Mostrar loading mientras verifica autenticación
  if (isAuthenticated === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
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

  // Si no está autenticado y no está en una ruta pública
  if (!isAuthenticated && !publicRoutes.includes(pathname)) {
    router.push('/login');
    return null;
  }

  // Si está autenticado y está en login, redirigir al dashboard
  if (isAuthenticated && pathname === '/login') {
    router.push('/');
    return null;
  }

  // Si está en una ruta pública, mostrar sin wrapper de autenticación
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  // Usuario autenticado - mostrar contenido con información de usuario
  return (
    <div>
      {/* Barra superior de usuario (opcional) */}
      {isAuthenticated && userData && pathname !== '/login' && (
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
              Bienvenido, {userData.nombre_empleado || userData.nombre_usuario}
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
      )}
      
      {/* Contenido principal */}
      {children}
    </div>
  );
}