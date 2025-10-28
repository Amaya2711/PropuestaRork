-- Script para crear la tabla catalogo_estados
-- Basado en la estructura de las otras tablas de catálogo existentes

-- Crear la tabla catalogo_estados
CREATE TABLE IF NOT EXISTS public.catalogo_estados (
    id SERIAL PRIMARY KEY,
    codigo INTEGER NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar los estados solicitados con códigos correlativos
INSERT INTO public.catalogo_estados (codigo, nombre, descripcion) VALUES
(1, 'ASIGNADO', 'Ticket asignado a una cuadrilla'),
(2, 'EN EJECUCION', 'Ticket en proceso de ejecución'),
(3, 'EN ESPERA', 'Ticket en espera de recursos o información'),
(4, 'EN RUTA', 'Cuadrilla en ruta hacia el sitio'),
(5, 'EN SITIO', 'Cuadrilla presente en el sitio'),
(6, 'NEUTRALIZADO', 'Problema neutralizado temporalmente'),
(7, 'NUEVO', 'Ticket recién creado'),
(8, 'RESUELTO', 'Ticket completamente resuelto');

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_catalogo_estados_codigo ON public.catalogo_estados(codigo);
CREATE INDEX IF NOT EXISTS idx_catalogo_estados_nombre ON public.catalogo_estados(nombre);
CREATE INDEX IF NOT EXISTS idx_catalogo_estados_activo ON public.catalogo_estados(activo);

-- Agregar comentarios para documentación
COMMENT ON TABLE public.catalogo_estados IS 'Catálogo de estados para los tickets del sistema';
COMMENT ON COLUMN public.catalogo_estados.codigo IS 'Código numérico único del estado';
COMMENT ON COLUMN public.catalogo_estados.nombre IS 'Nombre del estado';
COMMENT ON COLUMN public.catalogo_estados.descripcion IS 'Descripción detallada del estado';
COMMENT ON COLUMN public.catalogo_estados.activo IS 'Indica si el estado está activo para su uso';

-- Verificar los datos insertados
SELECT * FROM public.catalogo_estados ORDER BY codigo;