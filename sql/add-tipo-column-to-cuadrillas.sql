-- Script para agregar columna TIPO a la tabla cuadrillas_v1
-- Los valores permitidos son A, B o C

-- 1. Agregar la columna TIPO con restricción de valores
ALTER TABLE cuadrillas_v1 
ADD COLUMN tipo VARCHAR(1) CHECK (tipo IN ('A', 'B', 'C'));

-- 2. Poblar la columna con valores aleatorios para registros existentes
UPDATE cuadrillas_v1 
SET tipo = CASE 
    WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
    WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
    ELSE 'C'
END
WHERE tipo IS NULL;

-- 3. Hacer la columna NOT NULL después de poblarla
ALTER TABLE cuadrillas_v1 
ALTER COLUMN tipo SET NOT NULL;

-- 4. Crear un índice para mejorar el rendimiento de consultas por tipo
CREATE INDEX idx_cuadrillas_v1_tipo ON cuadrillas_v1(tipo);

-- Verificar los resultados
SELECT tipo, COUNT(*) as cantidad
FROM cuadrillas_v1 
GROUP BY tipo 
ORDER BY tipo;