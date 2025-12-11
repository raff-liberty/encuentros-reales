-- ============================================================================
-- VERIFICACIÓN RÁPIDA DEL ESTADO DE LA BASE DE DATOS
-- ============================================================================
-- Ejecuta este script para obtener un resumen completo del estado actual
-- ============================================================================

-- 1. RESUMEN DE USUARIOS
SELECT 
    '=== RESUMEN DE USUARIOS ===' as seccion;

SELECT 
    COUNT(*) as total_usuarios,
    COUNT(*) FILTER (WHERE role = 'ADMIN') as admins,
    COUNT(*) FILTER (WHERE role = 'OFERENTE') as oferentes,
    COUNT(*) FILTER (WHERE role = 'BUSCADOR') as buscadores,
    COUNT(*) FILTER (WHERE verified = 'VERIFICADO') as verificados,
    COUNT(*) FILTER (WHERE verified = 'PENDIENTE') as pendientes,
    COUNT(*) FILTER (WHERE verified = 'RECHAZADO') as rechazados
FROM public.users;

-- 2. USUARIOS ADMINISTRADORES
SELECT 
    '=== USUARIOS ADMINISTRADORES ===' as seccion;

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

-- 3. ÚLTIMOS 5 USUARIOS CREADOS
SELECT 
    '=== ÚLTIMOS 5 USUARIOS CREADOS ===' as seccion;

SELECT 
    id,
    email,
    username,
    role,
    verified,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. ESTADO DE RLS (Row Level Security)
SELECT 
    '=== ESTADO DE RLS ===' as seccion;

SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'users';

-- 5. POLÍTICAS RLS ACTIVAS
SELECT 
    '=== POLÍTICAS RLS ACTIVAS ===' as seccion;

SELECT 
    policyname as nombre_politica,
    cmd as comando,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Lectura'
        WHEN cmd = 'INSERT' THEN 'Inserción'
        WHEN cmd = 'UPDATE' THEN 'Actualización'
        WHEN cmd = 'DELETE' THEN 'Eliminación'
        ELSE cmd
    END as tipo_operacion
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- 6. USUARIOS DESINCRONIZADOS (auth vs public)
SELECT 
    '=== USUARIOS DESINCRONIZADOS ===' as seccion;

-- Usuarios en auth.users sin perfil en public.users
SELECT 
    'En auth.users pero NO en public.users' as problema,
    COUNT(*) as cantidad
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL

UNION ALL

-- Usuarios en public.users sin entrada en auth.users
SELECT 
    'En public.users pero NO en auth.users' as problema,
    COUNT(*) as cantidad
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- 7. USUARIOS CON EMAIL NO CONFIRMADO
SELECT 
    '=== USUARIOS CON EMAIL NO CONFIRMADO ===' as seccion;

SELECT 
    au.id,
    au.email,
    pu.username,
    pu.role,
    au.created_at,
    au.email_confirmed_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email_confirmed_at IS NULL
ORDER BY au.created_at DESC;

-- 8. ESTRUCTURA DE LA TABLA USERS
SELECT 
    '=== COLUMNAS DE LA TABLA USERS ===' as seccion;

SELECT 
    column_name as columna,
    data_type as tipo_dato,
    is_nullable as permite_null,
    column_default as valor_por_defecto
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. EVENTOS ACTIVOS
SELECT 
    '=== EVENTOS ACTIVOS ===' as seccion;

SELECT 
    COUNT(*) as total_eventos,
    COUNT(*) FILTER (WHERE status = 'ACTIVO') as activos,
    COUNT(*) FILTER (WHERE status = 'CERRADO') as cerrados,
    COUNT(*) FILTER (WHERE status = 'FINALIZADO') as finalizados
FROM public.events;

-- 10. DIAGNÓSTICO FINAL
SELECT 
    '=== DIAGNÓSTICO FINAL ===' as seccion;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users WHERE role = 'ADMIN') = 0 
        THEN '❌ NO HAY USUARIOS ADMIN'
        ELSE '✅ Hay usuarios admin'
    END as estado_admin,
    
    CASE 
        WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'users') = true
        THEN '✅ RLS está habilitado'
        ELSE '❌ RLS NO está habilitado'
    END as estado_rls,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users') >= 5
        THEN '✅ Políticas RLS configuradas (' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users') || ')'
        ELSE '❌ Faltan políticas RLS (' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users') || '/5)'
    END as estado_politicas,
    
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM auth.users au 
            LEFT JOIN public.users pu ON au.id = pu.id 
            WHERE pu.id IS NULL
        ) = 0
        THEN '✅ Usuarios sincronizados'
        ELSE '❌ Hay ' || (
            SELECT COUNT(*) 
            FROM auth.users au 
            LEFT JOIN public.users pu ON au.id = pu.id 
            WHERE pu.id IS NULL
        ) || ' usuarios desincronizados'
    END as estado_sincronizacion;

-- ============================================================================
-- INTERPRETACIÓN DE RESULTADOS:
-- ============================================================================
-- 
-- ✅ TODO CORRECTO si ves:
--    - Al menos 1 usuario ADMIN
--    - RLS habilitado = true
--    - 5 políticas RLS activas
--    - 0 usuarios desincronizados
--    - Usuarios admin con verified = 'VERIFICADO'
--
-- ❌ PROBLEMAS si ves:
--    - 0 usuarios ADMIN → Ejecuta diagnose_and_fix_db.sql
--    - RLS habilitado = false → Ejecuta diagnose_and_fix_db.sql
--    - Menos de 5 políticas → Ejecuta diagnose_and_fix_db.sql
--    - Usuarios desincronizados > 0 → Ejecuta sync_auth_users.sql
--    - Email no confirmado → Confirma el email desde Supabase UI
--
-- ============================================================================
