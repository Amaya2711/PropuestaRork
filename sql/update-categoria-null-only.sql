-- Script alternativo para actualizar solo registros SIN categoria definida
-- Ejecutar este script si quieres preservar valores existentes

-- 1. Verificar cuántos registros no tienen categoria
SELECT 
    CASE 
        WHEN categoria IS NULL THEN 'SIN CATEGORIA'
        ELSE 'CON CATEGORIA'
    END as estado,
    COUNT(*) as cantidad
FROM cuadrillas 
GROUP BY 
    CASE 
        WHEN categoria IS NULL THEN 'SIN CATEGORIA'
        ELSE 'CON CATEGORIA'
    END;

-- 2. Actualizar SOLO los registros que no tienen categoria
UPDATE cuadrillas 
SET categoria = CASE 
    WHEN (RANDOM() * 3)::INT = 0 THEN 'A'
    WHEN (RANDOM() * 3)::INT = 1 THEN 'B'
    ELSE 'C'
END
WHERE categoria IS NULL;

-- 3. Verificar los resultados
SELECT categoria, COUNT(*) as cantidad
FROM cuadrillas 
GROUP BY categoria
ORDER BY categoria;