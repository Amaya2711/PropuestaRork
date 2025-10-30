-- Script para corregir la columna TIPO en la tabla cuadrillas
-- Cambiar valores existentes a A, B, C

-- 1. Primero vemos qué valores únicos hay actualmente en la columna tipo
SELECT DISTINCT tipo, COUNT(*) as cantidad
FROM cuadrillas 
WHERE tipo IS NOT NULL
GROUP BY tipo
ORDER BY tipo;

-- 2. Actualizar los valores existentes a A, B, C
-- Si los valores actuales son diferentes, los mapeamos
UPDATE cuadrillas 
SET tipo = CASE 
    WHEN tipo LIKE '%CHOQUE%' OR tipo LIKE '%A%' THEN 'A'
    WHEN tipo LIKE '%REGULAR%' OR tipo LIKE '%B%' THEN 'B'
    ELSE 'C'
END
WHERE tipo IS NOT NULL AND tipo NOT IN ('A', 'B', 'C');

-- 3. Para registros sin tipo, asignar valores aleatorios A, B, C
UPDATE cuadrillas 
SET tipo = CASE 
    WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
    WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
    ELSE 'C'
END
WHERE tipo IS NULL;

-- 4. Verificar los resultados después de la actualización
SELECT tipo, COUNT(*) as cantidad
FROM cuadrillas 
GROUP BY tipo 
ORDER BY tipo;

-- 5. Opcional: Agregar restricción CHECK si no existe
-- ALTER TABLE cuadrillas 
-- ADD CONSTRAINT check_tipo_values CHECK (tipo IN ('A', 'B', 'C'));