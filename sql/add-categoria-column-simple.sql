-- Script simple paso a paso para agregar columna CATEGORIA con valores A, B, C
-- Usar este si el script principal presenta problemas

-- Paso 1: Agregar la columna si no existe
ALTER TABLE cuadrillas_v1 ADD COLUMN IF NOT EXISTS categoria VARCHAR(1);

-- Paso 2: Poblar con valores A, B, C basado en una distribución diferente al tipo
UPDATE cuadrillas_v1 
SET categoria = CASE 
    WHEN ((id * 7) % 3) = 0 THEN 'A'
    WHEN ((id * 7) % 3) = 1 THEN 'B'
    ELSE 'C'
END
WHERE categoria IS NULL;

-- Paso 3: Agregar restricción para validar solo valores A, B, C
ALTER TABLE cuadrillas_v1 
ADD CONSTRAINT IF NOT EXISTS check_cuadrillas_categoria 
CHECK (categoria IN ('A', 'B', 'C'));

-- Paso 4: Hacer la columna NOT NULL
ALTER TABLE cuadrillas_v1 ALTER COLUMN categoria SET NOT NULL;

-- Paso 5: Verificar que todos los registros tienen valores A, B, o C
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN categoria IN ('A', 'B', 'C') THEN 1 END) as registros_con_categoria_valida,
    COUNT(CASE WHEN categoria IS NULL THEN 1 END) as registros_nulos
FROM cuadrillas_v1;

-- Paso 6: Ver distribución de categorías A, B, C
SELECT 
    categoria,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM cuadrillas_v1), 1) as porcentaje
FROM cuadrillas_v1 
GROUP BY categoria 
ORDER BY categoria;

-- Paso 7: Comparar tipo vs categoría (deben ser independientes)
SELECT 
    tipo,
    categoria,
    COUNT(*) as cantidad
FROM cuadrillas_v1 
GROUP BY tipo, categoria
ORDER BY tipo, categoria;

-- Paso 8: Mostrar ejemplos de cuadrillas con tipo y categoría
SELECT id, nombre, zona, tipo, categoria, activo
FROM cuadrillas_v1 
ORDER BY tipo, categoria, id
LIMIT 20;