-- Script de verificación para la columna TIPO
-- Confirma que todos los valores son A, B, o C

-- 1. Verificar estructura de la columna
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cuadrillas_v1' 
AND column_name = 'tipo';

-- 2. Verificar restricciones CHECK
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%tipo%' 
OR check_clause LIKE '%tipo%';

-- 3. Contar registros por tipo (debe ser solo A, B, C)
SELECT 
    tipo,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM cuadrillas_v1), 1) as porcentaje
FROM cuadrillas_v1 
GROUP BY tipo 
ORDER BY tipo;

-- 4. Verificar que NO hay valores inválidos
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN tipo IN ('A', 'B', 'C') THEN 1 END) as valores_validos,
    COUNT(CASE WHEN tipo NOT IN ('A', 'B', 'C') OR tipo IS NULL THEN 1 END) as valores_invalidos
FROM cuadrillas_v1;

-- 5. Mostrar ejemplos de cada tipo con datos completos
SELECT 
    'TIPO A' as categoria,
    id, 
    codigo,
    nombre, 
    zona, 
    tipo,
    activo
FROM cuadrillas_v1 
WHERE tipo = 'A' 
LIMIT 3

UNION ALL

SELECT 
    'TIPO B' as categoria,
    id, 
    codigo,
    nombre, 
    zona, 
    tipo,
    activo
FROM cuadrillas_v1 
WHERE tipo = 'B' 
LIMIT 3

UNION ALL

SELECT 
    'TIPO C' as categoria,
    id, 
    codigo,
    nombre, 
    zona, 
    tipo,
    activo
FROM cuadrillas_v1 
WHERE tipo = 'C' 
LIMIT 3

ORDER BY categoria, id;

-- 6. Verificar índice
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'cuadrillas_v1' 
AND indexdef LIKE '%tipo%';