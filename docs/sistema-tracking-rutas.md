# Sistema de Tracking de Rutas para Cuadrillas

## 📋 Tabla CUADRILLA_RUTA

### Descripción
La tabla `CUADRILLA_RUTA` registra automáticamente la ubicación de las cuadrillas cada 5 segundos cuando se activa el tracking de ruta.

### Estructura de la Tabla

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGSERIAL | Identificador único del registro (PK) |
| `cuadrilla_id` | INTEGER | ID de la cuadrilla (referencia a cuadrillas_v1) |
| `fecha` | DATE | Fecha del registro |
| `hora` | TIME | Hora del registro |
| `timestamp` | TIMESTAMPTZ | Timestamp completo del registro |
| `latitud` | DECIMAL(10,8) | Latitud de la ubicación |
| `longitud` | DECIMAL(11,8) | Longitud de la ubicación |
| `created_at` | TIMESTAMPTZ | Fecha de creación del registro |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización |

### Configuración en Supabase

1. **Ejecutar el script SQL:**
   ```sql
   -- Ejecutar el contenido de sql/create-cuadrilla-ruta.sql
   ```

2. **Verificar la tabla:**
   ```sql
   SELECT * FROM CUADRILLA_RUTA LIMIT 5;
   ```

3. **Verificar políticas RLS:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'cuadrilla_ruta';
   ```

### Funcionalidad en la Aplicación

#### Botón "INICIAR RUTA"
- **Ubicación:** Panel de control del mapa Google Maps
- **Función:** Inicia el tracking automático cada 5 segundos
- **Estado:** Cambia a "DETENER RUTA" cuando está activo

#### Proceso de Tracking
1. **Inicio:** Se selecciona automáticamente la primera cuadrilla disponible
2. **Registro:** Cada 5 segundos se inserta un nuevo registro en `CUADRILLA_RUTA`
3. **Datos:** Se registra ID, fecha, hora, latitud y longitud actual
4. **Indicador:** Panel verde muestra información de la ruta activa

#### Ejemplo de Uso
```javascript
// Estructura del registro insertado
{
  cuadrilla_id: 123,
  fecha: "2025-11-06",
  hora: "14:30:25",
  latitud: -12.0464,
  longitud: -77.0428
}
```

### Consultas Útiles

#### Ver registros recientes
```sql
SELECT 
  cr.id,
  c.codigo as cuadrilla_codigo,
  cr.fecha,
  cr.hora,
  cr.latitud,
  cr.longitud
FROM CUADRILLA_RUTA cr
JOIN cuadrillas_v1 c ON cr.cuadrilla_id = c.id
ORDER BY cr.timestamp DESC
LIMIT 10;
```

#### Tracking de una cuadrilla específica
```sql
SELECT 
  fecha,
  hora,
  latitud,
  longitud,
  timestamp
FROM CUADRILLA_RUTA 
WHERE cuadrilla_id = 123
ORDER BY timestamp DESC;
```

#### Eliminar registros antiguos (opcional)
```sql
DELETE FROM CUADRILLA_RUTA 
WHERE timestamp < NOW() - INTERVAL '30 days';
```

### Características Técnicas

- ✅ **Inserción automática** cada 5 segundos
- ✅ **Timestamp preciso** con zona horaria
- ✅ **Índices optimizados** para consultas rápidas
- ✅ **RLS habilitado** para seguridad
- ✅ **Limpieza automática** al detener ruta
- ✅ **Indicadores visuales** de estado

### Consideraciones

1. **Rendimiento:** Los registros se acumulan rápidamente (720 registros/hora por cuadrilla)
2. **Almacenamiento:** Considerar archivado o limpieza periódica de datos antiguos
3. **Concurrencia:** Solo una ruta puede estar activa simultáneamente
4. **Ubicación:** Se usa la última ubicación conocida de la cuadrilla

### Troubleshooting

#### Error: "tabla CUADRILLA_RUTA no existe"
- Ejecutar el script SQL de creación de tabla

#### Error: "permission denied"
- Verificar políticas RLS en Supabase Dashboard

#### No se registran ubicaciones
- Verificar que las cuadrillas tengan coordenadas válidas
- Comprobar conexión a Supabase en la consola del navegador