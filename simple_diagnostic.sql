-- ============================================================================
-- DIAGNÓSTICO SIMPLE - Ejecutar consulta por consulta
-- ============================================================================
-- Copia y pega CADA BLOQUE por separado en el SQL Editor
-- ============================================================================

-- CONSULTA 1: Ver todos los usuarios
SELECT 
    id,
    email,
    username,
    role,
    verified,
    created_at
FROM public.users
ORDER BY created_at DESC;

-- CONSULTA 2: Contar usuarios por tipo
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(*) FILTER (WHERE role = 'ADMIN') as admins,
    COUNT(*) FILTER (WHERE role = 'OFERENTE') as oferentes,
    COUNT(*) FILTER (WHERE role = 'BUSCADOR') as buscadores,
    COUNT(*) FILTER (WHERE verified = 'VERIFICADO') as verificados,
    COUNT(*) FILTER (WHERE verified = 'PENDIENTE') as pendientes
FROM public.users;

-- CONSULTA 3: Ver si RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'users';

-- CONSULTA 4: Ver políticas RLS activas
SELECT 
    policyname,
    cmd as tipo_operacion
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- CONSULTA 5: Ver usuarios desincronizados
SELECT 
    COUNT(*) as usuarios_sin_perfil
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
