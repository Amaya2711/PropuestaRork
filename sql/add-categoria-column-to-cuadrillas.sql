-- Script para agregar columna CATEGORIA a la tabla cuadrillas_v1
-- Los valores permitidos son A, B o C

-- 1. Agregar la columna CATEGORIA con restricción de valores
ALTER TABLE cuadrillas_v1 
ADD COLUMN categoria VARCHAR(1) CHECK (categoria IN ('A', 'B', 'C'));

-- 2. Poblar la columna con valores aleatorios para registros existentes
UPDATE cuadrillas_v1 
SET categoria = CASE 
    WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
    WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
    ELSE 'C'
END
WHERE categoria IS NULL;

-- 3. Hacer la columna NOT NULL después de poblarla
ALTER TABLE cuadrillas_v1 
ALTER COLUMN categoria SET NOT NULL;

-- 4. Crear un índice para mejorar el rendimiento de consultas por categoria
CREATE INDEX idx_cuadrillas_v1_categoria ON cuadrillas_v1(categoria);

-- Verificar los resultados
SELECT categoria, COUNT(*) as cantidad
FROM cuadrillas_v1 
GROUP BY categoria 
ORDER BY categoria;

-- Verificar distribución de tipos y categorías
SELECT 
    tipo,
    categoria,
    COUNT(*) as cantidad
FROM cuadrillas_v1 
GROUP BY tipo, categoria
ORDER BY tipo, categoria;