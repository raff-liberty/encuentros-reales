-- ============================================================================
-- ASIGNAR ROL DE ADMINISTRADOR
-- ============================================================================
-- Reemplaza 'tu_email@ejemplo.com' con el email del usuario que quieres hacer Admin.

UPDATE public.users
SET role = 'ADMIN', verified = 'VERIFICADO'
WHERE email = 'pon_aqui_tu_email@gmail.com';

-- Para verificar quién es admin actualmente:
SELECT * FROM public.users WHERE role = 'ADMIN';
