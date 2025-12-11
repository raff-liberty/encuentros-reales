-- ============================================================================
-- SCRIPT DE SINCRONIZACIÓN: auth.users <-> public.users
-- ============================================================================
-- Este script ayuda a identificar y corregir desincronizaciones entre
-- la tabla de autenticación de Supabase y la tabla de perfiles de usuario
-- ============================================================================

-- ============================================================================
-- DIAGNÓSTICO: Encontrar usuarios desincronizados
-- ============================================================================

-- 1. Usuarios que existen en auth.users pero NO en public.users
-- (Esto causa el error "usuario sin perfil" al hacer login)
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created_at,
    au.email_confirmed_at,
    au.last_sign_in_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- 2. Usuarios que existen en public.users pero NO en auth.users
-- (Esto no debería pasar, pero si pasa, estos usuarios no pueden hacer login)
SELECT 
    pu.id,
    pu.email,
    pu.username,
    pu.role,
    pu.created_at
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- 3. Ver usuarios con email no confirmado
-- (Estos usuarios pueden tener problemas para hacer login)
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
WHERE au.email_confirmed_at IS NULL
ORDER BY au.created_at DESC;

-- ============================================================================
-- CORRECCIÓN AUTOMÁTICA: Crear perfiles faltantes
-- ============================================================================

-- Este INSERT creará perfiles en public.users para todos los usuarios
-- que existen en auth.users pero no tienen perfil
INSERT INTO public.users (
    id,
    email,
    username,
    role,
    verified,
    created_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'username',
        SPLIT_PART(au.email, '@', 1)
    ) as username,
    COALESCE(
        au.raw_user_meta_data->>'role',
        'BUSCADOR'
    ) as role,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'VERIFICADO'
        ELSE 'PENDIENTE'
    END as verified,
    au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN: Confirmar que la sincronización está completa
-- ============================================================================

-- Debe devolver 0 filas si todo está sincronizado
SELECT 
    'Usuarios en auth sin perfil' as issue,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL

UNION ALL

SELECT 
    'Usuarios en public sin auth' as issue,
    COUNT(*) as count
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- ============================================================================
-- BONUS: Confirmar emails automáticamente (SOLO PARA DESARROLLO)
-- ============================================================================
-- ⚠️ ADVERTENCIA: Esto confirma TODOS los emails sin verificación
-- Solo usar en entorno de desarrollo/testing
-- ⚠️ NO EJECUTAR EN PRODUCCIÓN

-- Descomentar las siguientes líneas solo si estás en desarrollo:
-- UPDATE auth.users
-- SET email_confirmed_at = NOW()
-- WHERE email_confirmed_at IS NULL;

-- ============================================================================
-- CREAR TRIGGER AUTOMÁTICO (RECOMENDADO)
-- ============================================================================
-- Este trigger creará automáticamente un perfil en public.users
-- cada vez que se registre un nuevo usuario en auth.users

-- Primero, crear la función
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        username,
        role,
        verified,
        created_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'role',
            'BUSCADOR'
        ),
        CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL THEN 'VERIFICADO'
            ELSE 'PENDIENTE'
        END,
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Luego, crear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Ver todos los usuarios sincronizados
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    pu.username,
    pu.role,
    pu.verified,
    au.created_at
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- ============================================================================
-- INSTRUCCIONES:
-- ============================================================================
-- 1. Ejecuta primero las consultas de DIAGNÓSTICO para ver qué está mal
-- 2. Ejecuta la sección de CORRECCIÓN AUTOMÁTICA para crear perfiles faltantes
-- 3. Ejecuta la VERIFICACIÓN para confirmar que todo está sincronizado
-- 4. (Opcional) Ejecuta la sección de TRIGGER para prevenir problemas futuros
-- 5. Ejecuta la VERIFICACIÓN FINAL para ver todos los usuarios correctamente
-- ============================================================================
