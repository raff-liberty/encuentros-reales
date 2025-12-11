-- ============================================================================
-- CREAR USUARIO ADMIN: alcaldemolinarafael@gmail.com
-- ============================================================================
-- IMPORTANTE: Primero debes crear el usuario en Authentication > Users
-- Email: alcaldemolinarafael@gmail.com
-- Password: admin123
-- ✅ Auto Confirm User: MARCADO
-- ============================================================================

-- PASO 1: Después de crear el usuario en Authentication, ejecuta esto:
-- Crear/actualizar perfil de admin en public.users
INSERT INTO public.users (
    id,
    email,
    username,
    role,
    verified,
    created_at
)
SELECT 
    id,
    email,
    'Rafael Admin',
    'ADMIN',
    'VERIFICADO',
    created_at
FROM auth.users
WHERE email = 'alcaldemolinarafael@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET 
    role = 'ADMIN',
    verified = 'VERIFICADO',
    username = 'Rafael Admin';

-- PASO 2: Verificar que se creó correctamente
SELECT 
    id,
    email,
    username,
    role,
    verified,
    created_at
FROM public.users
WHERE email = 'alcaldemolinarafael@gmail.com';

-- PASO 3: Ver todos los admins
SELECT 
    email,
    username,
    role,
    verified
FROM public.users
WHERE role = 'ADMIN';
