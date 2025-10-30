-- Script para corregir la columna CATEGORIA en la tabla cuadrillas
-- Asegurar que todos los valores sean A, B, C

-- 1. Primero vemos qué valores únicos hay actualmente en la columna categoria
SELECT DISTINCT categoria, COUNT(*) as cantidad
FROM cuadrillas 
WHERE categoria IS NOT NULL
GROUP BY categoria
ORDER BY categoria;

-- 2. Para registros sin categoria, asignar valores aleatorios A, B, C
UPDATE cuadrillas 
SET categoria = CASE 
    WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
    WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
    ELSE 'C'
END
WHERE categoria IS NULL;

-- 3. Si hay valores incorrectos en categoria, corregirlos
UPDATE cuadrillas 
SET categoria = CASE 
    WHEN categoria NOT IN ('A', 'B', 'C') THEN 
        CASE 
            WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
            WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
            ELSE 'C'
        END
    ELSE categoria
END;

-- 4. Verificar los resultados después de la actualización
SELECT categoria, COUNT(*) as cantidad
FROM cuadrillas 
GROUP BY categoria 
ORDER BY categoria;

-- 5. Opcional: Agregar restricción CHECK si no existe
-- ALTER TABLE cuadrillas 
-- ADD CONSTRAINT check_categoria_values CHECK (categoria IN ('A', 'B', 'C'));