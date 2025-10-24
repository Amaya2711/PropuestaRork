// Utilidades para manejo de autenticación
export interface UserData {
  id_usuario: string;
  nombre_usuario: string;
  id_empleado: string;
  nombre_empleado: string;
  loginTime: string;
}

// CONSTANTE GLOBAL - Accesible desde cualquier parte del sistema
export const USUARIO_ACTUAL = (): string => {
  if (typeof window === 'undefined') return '';
  
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.nombre_usuario || '';
    }
  } catch (error) {
    console.error('Error obteniendo USUARIO_ACTUAL:', error);
  }
  
  return '';
};

export const getLoggedUser = (): UserData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem('userData');
    const isAuth = localStorage.getItem('isAuthenticated');
    
    if (isAuth === 'true' && userData) {
      return JSON.parse(userData);
    }
  } catch (error) {
    console.error('Error getting logged user:', error);
  }
  
  return null;
};

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return localStorage.getItem('isAuthenticated') === 'true';
};

export const logout = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('userData');
  window.location.reload();
};

// Función para usar en cualquier proceso del sistema
export const getUsuarioActual = (): string => {
  return USUARIO_ACTUAL();
};

// Hook personalizado para componentes que necesiten el usuario
export const useCurrentUser = () => {
  const userData = getLoggedUser();
  return {
    isAuthenticated: isAuthenticated(),
    nombreUsuario: userData?.nombre_usuario || '',
    nombreEmpleado: userData?.nombre_empleado || '',
    idUsuario: userData?.id_usuario || '',
    idEmpleado: userData?.id_empleado || ''
  };
};