-- Script para agregar la columna CATEGORIA a la vista cuadrillas_v1
-- Este script actualiza la vista existente para incluir el nuevo campo categoria

-- 1. Verificar la vista actual
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cuadrillas_v1' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Eliminar la vista existente
DROP VIEW IF EXISTS cuadrillas_v1;

-- 3. Recrear la vista incluyendo el campo categoria
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
    tipo,
    categoria,
    -- Otros campos adicionales
    departamento,
    provincia,
    distrito,
    correo,
    capacidad,
    created_at,
    updated_at
FROM cuadrillas
WHERE activo = true OR activo IS NULL;

-- 4. Verificar que la vista se creó correctamente con categoria
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cuadrillas_v1' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Probar la vista con algunos registros
SELECT 
    id,
    codigo,
    nombre,
    zona,
    tipo,
    categoria,
    activo
FROM cuadrillas_v1 
WHERE tipo IS NOT NULL AND categoria IS NOT NULL
LIMIT 10;

-- 6. Verificar distribución de tipos y categorías en la vista
SELECT 
    'TIPOS' as campo,
    tipo as valor,
    COUNT(*) as cantidad
FROM cuadrillas_v1 
WHERE tipo IS NOT NULL
GROUP BY tipo

UNION ALL

SELECT 
    'CATEGORIAS' as campo,
    categoria as valor,
    COUNT(*) as cantidad
FROM cuadrillas_v1 
WHERE categoria IS NOT NULL
GROUP BY categoria

ORDER BY campo, valor;

-- 7. Agregar comentario actualizado
COMMENT ON VIEW cuadrillas_v1 IS 'Vista de cuadrillas que incluye skills, tipo (A/B/C) y categoría (A/B/C) para clasificación y filtrado';