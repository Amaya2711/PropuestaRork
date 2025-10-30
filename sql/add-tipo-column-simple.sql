-- Script simple paso a paso para agregar columna TIPO con valores A, B, C
-- Usar este si el script principal presenta problemas

-- Paso 1: Agregar la columna si no existe
ALTER TABLE cuadrillas_v1 ADD COLUMN IF NOT EXISTS tipo VARCHAR(1);

-- Paso 2: Poblar con valores A, B, C basado en el ID
UPDATE cuadrillas_v1 
SET tipo = CASE 
    WHEN (id % 3) = 0 THEN 'A'
    WHEN (id % 3) = 1 THEN 'B'
    ELSE 'C'
END
WHERE tipo IS NULL;

-- Paso 3: Agregar restricción para validar solo valores A, B, C
ALTER TABLE cuadrillas_v1 
ADD CONSTRAINT IF NOT EXISTS check_cuadrillas_tipo 
CHECK (tipo IN ('A', 'B', 'C'));

-- Paso 4: Hacer la columna NOT NULL
ALTER TABLE cuadrillas_v1 ALTER COLUMN tipo SET NOT NULL;

-- Paso 5: Verificar que todos los registros tienen valores A, B, o C
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN tipo IN ('A', 'B', 'C') THEN 1 END) as registros_con_tipo_valido,
    COUNT(CASE WHEN tipo IS NULL THEN 1 END) as registros_nulos
FROM cuadrillas_v1;

-- Paso 6: Ver distribución de tipos A, B, C
SELECT 
    tipo,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM cuadrillas_v1), 1) as porcentaje
FROM cuadrillas_v1 
GROUP BY tipo 
ORDER BY tipo;

-- Paso 7: Mostrar ejemplos de cuadrillas con cada tipo
SELECT id, nombre, zona, tipo, activo
FROM cuadrillas_v1 
ORDER BY tipo, id
LIMIT 15;