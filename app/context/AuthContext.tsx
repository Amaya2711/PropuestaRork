'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Tipos para el contexto
interface UserData {
  id_usuario: string;
  nombre_usuario: string;
  id_empleado: string;
  nombre_empleado: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userData: UserData | null;
  USUARIO_ACTUAL: string; // Constante global con nombre_usuario
  login: (nombreUsuario: string, claveUsuario: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  loading: boolean;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider del contexto
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // CONSTANTE GLOBAL - Siempre disponible en todo el sistema
  const USUARIO_ACTUAL = userData?.nombre_usuario || '';

  // Verificar autenticación al cargar la app
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = () => {
    try {
      const authStatus = localStorage.getItem('isAuthenticated');
      const userDataStr = localStorage.getItem('userData');

      if (authStatus === 'true' && userDataStr) {
        const storedUserData = JSON.parse(userDataStr);
        
        // Verificar que la sesión no sea muy antigua (8 horas)
        const loginTime = new Date(storedUserData.loginTime);
        const now = new Date();
        const diffHours = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);

        if (diffHours < 8) {
          setIsAuthenticated(true);
          setUserData(storedUserData);
          console.log('Sesión restaurada para:', storedUserData.nombre_usuario);
        } else {
          // Sesión expirada
          console.log('Sesión expirada');
          clearAuth();
        }
      }
    } catch (error) {
      console.error('Error checking stored auth:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const login = async (nombreUsuario: string, claveUsuario: string): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('Iniciando login para:', nombreUsuario);

      // Buscar el usuario en la base de datos
      const { data: usuarios, error } = await supabase
        .from('usuario')
        .select(`
          id_usuario,
          nombre_usuario,
          clave_usuario,
          id_empleado,
          empleado:id_empleado (
            id_empleado,
            nombre_empleado,
            estado_empleado
          )
        `)
        .eq('nombre_usuario', nombreUsuario.trim())
        .single();

      if (error) {
        console.error('Error buscando usuario:', error);
        return { success: false, message: 'Usuario o contraseña incorrectos' };
      }

      // Verificar que el usuario existe
      if (!usuarios) {
        return { success: false, message: 'Usuario o contraseña incorrectos' };
      }

      // Verificar que el empleado asociado está activo
      if (usuarios.empleado && Array.isArray(usuarios.empleado) && usuarios.empleado[0]) {
        if (usuarios.empleado[0].estado_empleado !== 'ACTIVO') {
          return { success: false, message: 'Su cuenta está inactiva. Contacte al administrador' };
        }
      }

      // Verificar contraseña (comparación directa por ahora)
      if (usuarios.clave_usuario !== claveUsuario) {
        return { success: false, message: 'Usuario o contraseña incorrectos' };
      }

      // Autenticación exitosa
      const empleadoData = usuarios.empleado && Array.isArray(usuarios.empleado) ? usuarios.empleado[0] : null;
      const newUserData: UserData = {
        id_usuario: usuarios.id_usuario,
        nombre_usuario: usuarios.nombre_usuario,
        id_empleado: usuarios.id_empleado,
        nombre_empleado: empleadoData?.nombre_empleado || ''
      };

      // Guardar en contexto y localStorage
      setIsAuthenticated(true);
      setUserData(newUserData);
      
      const dataToStore = {
        ...newUserData,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('userData', JSON.stringify(dataToStore));
      localStorage.setItem('isAuthenticated', 'true');

      console.log('Login exitoso para:', usuarios.nombre_usuario);
      return { success: true, message: 'Acceso exitoso' };

    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, message: 'Error del sistema. Intente nuevamente' };
    }
  };

  const logout = () => {
    console.log('Cerrando sesión para:', USUARIO_ACTUAL);
    clearAuth();
  };

  const clearAuth = () => {
    setIsAuthenticated(false);
    setUserData(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userData');
  };

  const value: AuthContextType = {
    isAuthenticated,
    userData,
    USUARIO_ACTUAL, // ← CONSTANTE GLOBAL DISPONIBLE EN TODO EL SISTEMA
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

// Función para obtener el usuario actual desde cualquier parte del sistema
export function getUsuarioActual(): string {
  if (typeof window === 'undefined') return '';
  
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.nombre_usuario || '';
    }
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
  }
  
  return '';
}