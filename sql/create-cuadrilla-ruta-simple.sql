-- Crear tabla CUADRILLA_RUTA para tracking de ubicación (versión simplificada)
CREATE TABLE IF NOT EXISTS public.CUADRILLA_RUTA (
    id BIGSERIAL PRIMARY KEY,
    cuadrilla_id INTEGER NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_cuadrilla_ruta_cuadrilla_id ON public.CUADRILLA_RUTA(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_ruta_timestamp ON public.CUADRILLA_RUTA(timestamp);
CREATE INDEX IF NOT EXISTS idx_cuadrilla_ruta_fecha ON public.CUADRILLA_RUTA(fecha);

-- Comentarios para documentación
COMMENT ON TABLE public.CUADRILLA_RUTA IS 'Tabla para registrar el tracking de ubicación de cuadrillas cada 5 segundos durante rutas activas';
COMMENT ON COLUMN public.CUADRILLA_RUTA.cuadrilla_id IS 'ID de la cuadrilla (referencia a tabla cuadrillas_v1)';
COMMENT ON COLUMN public.CUADRILLA_RUTA.fecha IS 'Fecha del registro de ubicación';
COMMENT ON COLUMN public.CUADRILLA_RUTA.hora IS 'Hora del registro de ubicación';
COMMENT ON COLUMN public.CUADRILLA_RUTA.timestamp IS 'Timestamp completo del registro';
COMMENT ON COLUMN public.CUADRILLA_RUTA.latitud IS 'Latitud de la ubicación registrada';
COMMENT ON COLUMN public.CUADRILLA_RUTA.longitud IS 'Longitud de la ubicación registrada';

-- Verificar que la tabla fue creada correctamente
SELECT 'Tabla CUADRILLA_RUTA creada exitosamente' as resultado;