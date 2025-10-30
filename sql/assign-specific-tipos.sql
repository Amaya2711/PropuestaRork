-- Script para asignar tipos específicos a cuadrillas existentes
-- Esto es útil para testing y demostración

-- Asignar tipo A a las primeras cuadrillas (IDs menores)
UPDATE cuadrillas_v1 
SET tipo = 'A' 
WHERE id <= (SELECT MIN(id) + (MAX(id) - MIN(id)) / 3 FROM cuadrillas_v1);

-- Asignar tipo B a las cuadrillas del medio
UPDATE cuadrillas_v1 
SET tipo = 'B' 
WHERE id > (SELECT MIN(id) + (MAX(id) - MIN(id)) / 3 FROM cuadrillas_v1)
  AND id <= (SELECT MIN(id) + 2 * (MAX(id) - MIN(id)) / 3 FROM cuadrillas_v1);

-- Asignar tipo C a las últimas cuadrillas (IDs mayores)
UPDATE cuadrillas_v1 
SET tipo = 'C' 
WHERE id > (SELECT MIN(id) + 2 * (MAX(id) - MIN(id)) / 3 FROM cuadrillas_v1);

-- Verificar la distribución
SELECT 
    tipo,
    COUNT(*) as cantidad,
    MIN(id) as id_minimo,
    MAX(id) as id_maximo,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM cuadrillas_v1), 2) as porcentaje
FROM cuadrillas_v1 
GROUP BY tipo 
ORDER BY tipo;

-- Mostrar algunas cuadrillas de ejemplo
SELECT id, nombre, zona, tipo, activo
FROM cuadrillas_v1 
ORDER BY tipo, id
LIMIT 20;