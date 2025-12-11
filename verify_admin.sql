-- ============================================================================
-- VERIFICAR QUE EL ADMIN FUE CREADO CORRECTAMENTE
-- ============================================================================

-- 1. Ver el usuario admin creado
SELECT 
    id,
    email,
    username,
    role,
    verified,
    created_at
FROM public.users
WHERE email = 'admin.encuentros@yopmail.com';

-- 2. Ver TODOS los usuarios admin (por si hay más de uno)
SELECT 
    id,
    email,
    username,
    role,
    verified,
    created_at
FROM public.users
WHERE role = 'ADMIN'
ORDER BY created_at DESC;

-- 3. Verificar que el usuario también existe en auth.users
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    au.created_at,
    pu.username,
    pu.role,
    pu.verified
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'admin.encuentros@yopmail.com';
