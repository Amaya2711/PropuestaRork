# Sistema de Autenticación - Rork

## 📋 Descripción
Sistema de login que valida credenciales contra las tablas `USUARIO` y `EMPLEADO` en Supabase.

## 🚀 Funcionalidades Implementadas

### ✅ Formulario de Login (`/login`)
- **Validación de campos**: Usuario y contraseña obligatorios
- **Verificación en BD**: Consulta tabla `usuario` con join a `empleado`
- **Estados de empleado**: Solo usuarios con empleados "ACTIVOS" pueden acceder
- **Sesión segura**: Información guardada en localStorage
- **Feedback visual**: Mensajes de error/éxito claros
- **Diseño responsive**: Interfaz moderna y profesional

### ✅ Protección de Rutas (`AuthWrapper`)
- **Rutas protegidas**: Todas las páginas requieren autenticación
- **Ruta pública**: `/login` accesible sin autenticación
- **Redirección automática**: Usuarios no autenticados van a `/login`
- **Sesión persistente**: Mantiene login hasta 8 horas
- **Logout seguro**: Limpia datos y redirige

### ✅ Barra de Usuario
- **Información del usuario**: Muestra nombre del empleado
- **Fecha actual**: Información contextual
- **Botón logout**: Cierre de sesión fácil
- **Diseño integrado**: Se muestra en todas las páginas protegidas

## 🔧 Configuración Inicial

### 1. Ejecutar scripts SQL en Supabase
```sql
-- 1. Crear las tablas (ejecutar scripts proporcionados)
-- 2. Insertar usuarios de prueba:
```
Ejecutar el archivo `sql/usuarios-prueba.sql`

### 2. Usuarios de Prueba Creados
| Usuario | Contraseña | Empleado | Estado |
|---------|------------|----------|--------|
| `admin` | `admin123` | Juan Carlos Pérez | ACTIVO |
| `jperez` | `pass123` | Juan Carlos Pérez | ACTIVO |
| `mlopez` | `maria456` | María Elena López | ACTIVO |
| `crodriguez` | `carlos789` | Carlos Roberto | ACTIVO |
| `amendoza` | `ana2024` | Ana Patricia | ACTIVO |

## 🎯 Flujo de Autenticación

### 1. Acceso Inicial
```
Usuario no autenticado → Redirige a /login
```

### 2. Proceso de Login
```
1. Usuario ingresa credenciales
2. Sistema busca en tabla 'usuario'
3. Verifica contraseña (comparación directa por ahora)
4. Valida que empleado esté ACTIVO
5. Guarda sesión en localStorage
6. Redirige al dashboard (/)
```

### 3. Protección de Rutas
```
1. AuthWrapper verifica localStorage
2. Si no hay sesión válida → /login
3. Si sesión expirada (>8h) → /login
4. Si válida → Muestra contenido + barra usuario
```

### 4. Logout
```
1. Botón "Cerrar Sesión" en barra superior
2. Limpia localStorage
3. Redirige a /login
```

## 🔒 Seguridad Implementada

### ✅ Validaciones
- **Campos obligatorios**: Usuario y contraseña requeridos
- **Estado de empleado**: Solo ACTIVOS pueden acceder
- **Sesión temporal**: Expira automáticamente en 8 horas
- **Rutas protegidas**: Sin bypass posible

### ⚠️ Mejoras de Seguridad Recomendadas
- **Hash de contraseñas**: Implementar bcrypt o similar
- **Tokens JWT**: Reemplazar localStorage con tokens seguros
- **Rate limiting**: Prevenir ataques de fuerza bruta
- **HTTPS**: Asegurar comunicación encriptada
- **Audit logs**: Registrar intentos de login

## 📱 Uso del Sistema

### Para Acceder:
1. Navegar a `http://localhost:3000`
2. Sistema redirige automáticamente a `/login`
3. Usar cualquier usuario de prueba listado arriba
4. Una vez autenticado, acceso completo a todas las funciones

### Para Desarrolladores:
```typescript
// Verificar si usuario está logueado
import { isAuthenticated, getLoggedUser } from '@/lib/auth';

if (isAuthenticated()) {
  const userData = getLoggedUser();
  console.log('Usuario actual:', userData?.nombre_usuario);
}

// Forzar logout
import { logout } from '@/lib/auth';
logout();
```

## 🛠️ Estructura de Archivos

```
app/
├── login/
│   └── page.tsx              # Formulario de login
├── components/
│   └── AuthWrapper.tsx       # Protección de rutas
├── layout.tsx                # Layout con AuthWrapper
lib/
└── auth.ts                   # Utilidades de autenticación
sql/
└── usuarios-prueba.sql       # Datos de prueba
```

## 🐛 Troubleshooting

### Usuario no puede acceder:
1. ✅ Verificar que existe en tabla `usuario`
2. ✅ Verificar que contraseña coincide
3. ✅ Verificar que empleado asociado esté ACTIVO
4. ✅ Revisar console del navegador para errores

### Redirección infinita:
1. ✅ Limpiar localStorage del navegador
2. ✅ Verificar que `/login` esté en `publicRoutes`
3. ✅ Verificar estructura de datos en localStorage

### Sesión se pierde:
1. ✅ Verificar que datos estén en localStorage
2. ✅ Comprobar que no hayan pasado 8 horas
3. ✅ Verificar formato de fecha en `loginTime`

## 📝 Próximas Mejoras

- [ ] Implementar hash de contraseñas con bcrypt
- [ ] Agregar sistema de roles y permisos
- [ ] Crear página de recuperación de contraseña
- [ ] Implementar "Recordar sesión"
- [ ] Agregar logs de auditoría
- [ ] Implementar 2FA (autenticación de dos factores)

---

**Nota**: Este sistema está listo para desarrollo. Para producción, implementar las mejoras de seguridad recomendadas.