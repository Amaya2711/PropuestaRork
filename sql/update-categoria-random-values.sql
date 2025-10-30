-- Script para actualizar la columna CATEGORIA con valores aleatorios A, B o C
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar el estado actual de la columna categoria
SELECT 'ANTES DE ACTUALIZAR' as estado, categoria, COUNT(*) as cantidad
FROM cuadrillas 
WHERE categoria IS NOT NULL
GROUP BY categoria
ORDER BY categoria;

-- 2. Actualizar TODOS los registros con valores aleatorios A, B o C
UPDATE cuadrillas 
SET categoria = CASE 
    WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
    WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
    ELSE 'C'
END;

-- 3. Verificar los resultados después de la actualización
SELECT 'DESPUÉS DE ACTUALIZAR' as estado, categoria, COUNT(*) as cantidad
FROM cuadrillas 
GROUP BY categoria
ORDER BY categoria;

-- 4. Mostrar algunos ejemplos de los registros actualizados
SELECT 
    id,
    codigo,
    nombre,
    zona,
    tipo,
    categoria,
    'ACTUALIZADO' as estado
FROM cuadrillas 
ORDER BY id
LIMIT 10;

-- 5. Verificar distribución porcentual
SELECT 
    categoria,
    COUNT(*) as cantidad,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM cuadrillas)), 2) as porcentaje
FROM cuadrillas 
GROUP BY categoria
ORDER BY categoria;