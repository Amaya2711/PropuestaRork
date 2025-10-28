-- Script para crear la tabla catalogo_falla
-- Basado en la estructura de las otras tablas de catálogo existentes

-- Crear la tabla catalogo_falla
CREATE TABLE IF NOT EXISTS public.catalogo_falla (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar los niveles de falla solicitados
INSERT INTO public.catalogo_falla (codigo, nombre, descripcion) VALUES
('P0', 'CRITICA', 'P0 - Falla crítica que requiere atención inmediata'),
('P1', 'ALTA', 'P1 - Falla de alta prioridad'),
('P2', 'MEDIA', 'P2 - Falla de prioridad media'),
('P3', 'BAJA', 'P3 - Falla de baja prioridad');

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_catalogo_falla_codigo ON public.catalogo_falla(codigo);
CREATE INDEX IF NOT EXISTS idx_catalogo_falla_nombre ON public.catalogo_falla(nombre);
CREATE INDEX IF NOT EXISTS idx_catalogo_falla_activo ON public.catalogo_falla(activo);

-- Agregar comentarios para documentación
COMMENT ON TABLE public.catalogo_falla IS 'Catálogo de niveles de falla para clasificar la criticidad de los tickets';
COMMENT ON COLUMN public.catalogo_falla.codigo IS 'Código de prioridad (P0, P1, P2, P3)';
COMMENT ON COLUMN public.catalogo_falla.nombre IS 'Nombre del nivel de falla';
COMMENT ON COLUMN public.catalogo_falla.descripcion IS 'Descripción detallada del nivel de falla';
COMMENT ON COLUMN public.catalogo_falla.activo IS 'Indica si el nivel de falla está activo para su uso';

-- Verificar los datos insertados
SELECT * FROM public.catalogo_falla ORDER BY codigo;