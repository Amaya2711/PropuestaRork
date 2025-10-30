-- Script completo para corregir los datos de tipo y categoria en cuadrillas
-- Ejecutar este script en Supabase SQL Editor

-- PASO 1: Verificar el estado actual de los datos
SELECT 'TIPOS ACTUALES' as info, tipo, COUNT(*) as cantidad
FROM cuadrillas 
WHERE tipo IS NOT NULL
GROUP BY tipo
UNION ALL
SELECT 'CATEGORIAS ACTUALES' as info, categoria, COUNT(*) as cantidad
FROM cuadrillas 
WHERE categoria IS NOT NULL
GROUP BY categoria
ORDER BY info, cantidad DESC;

-- PASO 2: Limpiar la columna TIPO - convertir todos los valores a A, B, C
UPDATE cuadrillas 
SET tipo = CASE 
    -- Si contiene palabras clave específicas, mapear
    WHEN tipo ILIKE '%choque%' OR tipo ILIKE '%emergency%' OR tipo ILIKE '%urgente%' THEN 'A'
    WHEN tipo ILIKE '%regular%' OR tipo ILIKE '%normal%' OR tipo ILIKE '%standard%' THEN 'B'
    WHEN tipo ILIKE '%mantenimiento%' OR tipo ILIKE '%preventivo%' OR tipo ILIKE '%maintenance%' THEN 'C'
    -- Si ya es A, B, C mantener
    WHEN tipo IN ('A', 'B', 'C') THEN tipo
    -- Para cualquier otro valor, asignar aleatoriamente
    ELSE CASE 
        WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
        WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
        ELSE 'C'
    END
END
WHERE tipo IS NOT NULL;

-- PASO 3: Asignar tipo a registros que no lo tienen
UPDATE cuadrillas 
SET tipo = CASE 
    WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
    WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
    ELSE 'C'
END
WHERE tipo IS NULL;

-- PASO 4: Limpiar la columna CATEGORIA - asegurar que sea A, B, C
UPDATE cuadrillas 
SET categoria = CASE 
    WHEN categoria IN ('A', 'B', 'C') THEN categoria
    ELSE CASE 
        WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
        WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
        ELSE 'C'
    END
END
WHERE categoria IS NOT NULL;

-- PASO 5: Asignar categoria a registros que no la tienen
UPDATE cuadrillas 
SET categoria = CASE 
    WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
    WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
    ELSE 'C'
END
WHERE categoria IS NULL;

-- PASO 6: Verificar los resultados finales
SELECT 'TIPOS FINALES' as info, tipo, COUNT(*) as cantidad
FROM cuadrillas 
GROUP BY tipo
UNION ALL
SELECT 'CATEGORIAS FINALES' as info, categoria, COUNT(*) as cantidad
FROM cuadrillas 
GROUP BY categoria
ORDER BY info, tipo;

-- PASO 7: Recrear la vista cuadrillas_v1 para asegurar que incluya los campos actualizados
DROP VIEW IF EXISTS cuadrillas_v1;

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
    -- Campos adicionales
    departamento,
    provincia,
    distrito,
    correo,
    capacidad,
    created_at,
    updated_at
FROM cuadrillas
WHERE activo = true OR activo IS NULL;

-- PASO 8: Verificar que la vista funciona correctamente
SELECT COUNT(*) as total_cuadrillas_en_vista FROM cuadrillas_v1;

SELECT 'VISTA - TIPOS' as info, tipo, COUNT(*) as cantidad
FROM cuadrillas_v1 
GROUP BY tipo
UNION ALL
SELECT 'VISTA - CATEGORIAS' as info, categoria, COUNT(*) as cantidad
FROM cuadrillas_v1 
GROUP BY categoria
ORDER BY info, tipo;