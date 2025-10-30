-- Script para actualizar la vista cuadrillas_v1 para incluir los campos skill_1, skill_2, skill_3, tipo y categoria
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Primero eliminamos la vista existente
DROP VIEW IF EXISTS cuadrillas_v1;

-- 2. Creamos la nueva vista con los campos skill adicionales, tipo y categoria
CREATE VIEW cuadrillas_v1 AS
SELECT 
    id,
    codigo,
    nombre,
    supervisor,
    zona,
    activo,
    latitud,
    longitud,
    telefono,
    skill_1,
    skill_2,
    skill_3,
    -- Campos de clasificación
    tipo,
    categoria,
    -- Campos adicionales que puedan existir
    departamento,
    provincia,
    distrito,
    correo,
    capacidad,
    created_at,
    updated_at
FROM cuadrillas
WHERE activo = true OR activo IS NULL;  -- Solo cuadrillas activas o sin estado definido

-- 3. Opcional: Agregar comentario a la vista
COMMENT ON VIEW cuadrillas_v1 IS 'Vista de cuadrillas que incluye información de skills, tipo y categoría para el sistema de mapas';