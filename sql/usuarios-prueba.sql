-- Script para crear usuarios de prueba en Supabase
-- Ejecutar después de haber creado las tablas EMPLEADO y USUARIO

-- Insertar empleados de prueba
INSERT INTO public.empleado (nombre_empleado, celular_empleado, documento_empleado, estado_empleado) VALUES
('Juan Carlos Pérez García', '+51987654321', '12345678', 'ACTIVO'),
('María Elena López Silva', '+51876543210', '87654321', 'ACTIVO'),
('Carlos Roberto Rodríguez', '+51765432109', '11223344', 'ACTIVO'),
('Ana Patricia Mendoza', '+51654321098', '22334455', 'ACTIVO'),
('Luis Fernando Torres', '+51543210987', '33445566', 'INACTIVO');

-- Obtener los IDs de los empleados insertados para crear usuarios
-- Insertar usuarios de prueba con contraseñas simples (cambiar en producción)
INSERT INTO public.usuario (nombre_usuario, id_empleado, clave_usuario) 
SELECT 'admin', id_empleado, 'admin123' FROM public.empleado WHERE documento_empleado = '12345678'
UNION ALL
SELECT 'jperez', id_empleado, 'pass123' FROM public.empleado WHERE documento_empleado = '12345678'
UNION ALL
SELECT 'mlopez', id_empleado, 'maria456' FROM public.empleado WHERE documento_empleado = '87654321'
UNION ALL
SELECT 'crodriguez', id_empleado, 'carlos789' FROM public.empleado WHERE documento_empleado = '11223344'
UNION ALL
SELECT 'amendoza', id_empleado, 'ana2024' FROM public.empleado WHERE documento_empleado = '22334455';

-- Verificar los datos insertados
SELECT 
    u.nombre_usuario,
    u.clave_usuario,
    e.nombre_empleado,
    e.estado_empleado,
    u.fecha_creacion
FROM public.usuario u
JOIN public.empleado e ON u.id_empleado = e.id_empleado
ORDER BY u.fecha_creacion DESC;