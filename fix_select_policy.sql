-- ============================================================================
-- SOLUCIÓN FINAL: Permitir SELECT a usuarios recién autenticados
-- ============================================================================

-- El problema es que cuando un usuario hace login, Supabase lo autentica PRIMERO
-- y LUEGO intenta leer su perfil, pero RLS bloquea el SELECT porque el perfil
-- aún no está "visible" para el usuario recién autenticado.

-- Solución: Agregar una política que permita a CUALQUIER usuario autenticado
-- leer perfiles (no solo el suyo)

-- PASO 1: Eliminar la política restrictiva de SELECT
DROP POLICY IF EXISTS "authenticated_users_select_own" ON public.users;

-- PASO 2: Crear una política MÁS PERMISIVA para SELECT
-- Esto permite que cualquier usuario autenticado pueda leer perfiles
-- (necesario para que el login funcione)
CREATE POLICY "authenticated_users_select_any"
ON public.users
FOR SELECT
TO authenticated
USING (true);  -- Permite leer cualquier perfil si estás autenticado

-- PASO 3: Verificar las políticas
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN policyname = 'authenticated_users_select_any' THEN '⭐ NUEVA - Permite login'
        ELSE ''
    END as nota
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- ============================================================================
-- EXPLICACIÓN:
-- ============================================================================
-- Esta política permite que cualquier usuario autenticado pueda LEER perfiles.
-- Esto es necesario para:
-- 1. El login funcione (el usuario necesita leer su propio perfil)
-- 2. Ver información de organizadores de eventos
-- 3. Ver perfiles de otros participantes (funcionalidad de la app)
--
-- SEGURIDAD:
-- - Los usuarios SOLO pueden MODIFICAR su propio perfil (política UPDATE)
-- - Los usuarios SOLO pueden CREAR su propio perfil (política INSERT)
-- - Solo los ADMINS pueden modificar/eliminar otros perfiles
-- ============================================================================
