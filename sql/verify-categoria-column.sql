-- Script de verificación para la columna CATEGORIA
-- Confirma que todos los valores son A, B, o C

-- 1. Verificar estructura de la columna categoria
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cuadrillas_v1' 
AND column_name = 'categoria';

-- 2. Verificar restricciones CHECK para categoria
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%categoria%' 
OR check_clause LIKE '%categoria%';

-- 3. Contar registros por categoría (debe ser solo A, B, C)
SELECT 
    categoria,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM cuadrillas_v1), 1) as porcentaje
FROM cuadrillas_v1 
GROUP BY categoria 
ORDER BY categoria;

-- 4. Verificar que NO hay valores inválidos en categoria
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN categoria IN ('A', 'B', 'C') THEN 1 END) as valores_validos,
    COUNT(CASE WHEN categoria NOT IN ('A', 'B', 'C') OR categoria IS NULL THEN 1 END) as valores_invalidos
FROM cuadrillas_v1;

-- 5. Comparar distribución de TIPO vs CATEGORIA
SELECT 
    tipo,
    categoria,
    COUNT(*) as cantidad
FROM cuadrillas_v1 
GROUP BY tipo, categoria
ORDER BY tipo, categoria;

-- 6. Verificar que tipo y categoría son independientes
SELECT 
    'Distribución Cruzada' as analisis,
    COUNT(CASE WHEN tipo = 'A' AND categoria = 'A' THEN 1 END) as A_A,
    COUNT(CASE WHEN tipo = 'A' AND categoria = 'B' THEN 1 END) as A_B,
    COUNT(CASE WHEN tipo = 'A' AND categoria = 'C' THEN 1 END) as A_C,
    COUNT(CASE WHEN tipo = 'B' AND categoria = 'A' THEN 1 END) as B_A,
    COUNT(CASE WHEN tipo = 'B' AND categoria = 'B' THEN 1 END) as B_B,
    COUNT(CASE WHEN tipo = 'B' AND categoria = 'C' THEN 1 END) as B_C,
    COUNT(CASE WHEN tipo = 'C' AND categoria = 'A' THEN 1 END) as C_A,
    COUNT(CASE WHEN tipo = 'C' AND categoria = 'B' THEN 1 END) as C_B,
    COUNT(CASE WHEN tipo = 'C' AND categoria = 'C' THEN 1 END) as C_C
FROM cuadrillas_v1;

-- 7. Mostrar ejemplos con tipo y categoría
SELECT 
    id, 
    nombre, 
    zona, 
    tipo,
    categoria,
    activo,
    CONCAT('Tipo ', tipo, ' - Cat ', categoria) as clasificacion
FROM cuadrillas_v1 
WHERE tipo IS NOT NULL AND categoria IS NOT NULL
ORDER BY tipo, categoria, id
LIMIT 20;

-- 8. Verificar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'cuadrillas_v1' 
AND (indexdef LIKE '%categoria%' OR indexdef LIKE '%tipo%');