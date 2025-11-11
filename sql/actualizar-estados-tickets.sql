-- Script para actualizar los valores de la columna estado en tickets_v1
-- para que coincidan con los nombres en catalogo_estados

-- Actualizar valores que no coinciden exactamente
UPDATE public.tickets_v1
SET estado = 'ASIGNADO'
WHERE estado = 'ASIGNAR';

UPDATE public.tickets_v1
SET estado = 'NUEVO'
WHERE estado IN ('NEW', 'NUEVA');

UPDATE public.tickets_v1
SET estado = 'RESUELTO'
WHERE estado IN ('RESOLVED', 'RESUELTA');

-- Verificar los estados únicos actuales en tickets_v1
SELECT DISTINCT estado, COUNT(*) as cantidad
FROM public.tickets_v1
GROUP BY estado
ORDER BY estado;

-- Verificar que los estados coincidan con el catálogo
SELECT 
    t.estado,
    CASE 
        WHEN c.nombre IS NULL THEN 'NO EXISTE EN CATÁLOGO'
        ELSE 'OK'
    END as validacion
FROM (
    SELECT DISTINCT estado 
    FROM public.tickets_v1
) t
LEFT JOIN public.catalogo_estados c ON t.estado = c.nombre
ORDER BY t.estado;
