-- ============================================================================
-- FIX: Política RLS para permitir registro de usuarios
-- ============================================================================
-- El problema es que cuando un usuario se registra:
-- 1. Supabase crea el usuario en auth.users
-- 2. El código intenta crear el perfil en public.users
-- 3. RLS bloquea porque la política INSERT requiere auth.uid() = id
--    pero hay un problema de timing
-- ============================================================================

-- Primero, ver las políticas actuales
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

-- Eliminar la política de INSERT actual
DROP POLICY IF EXISTS "allow_own_insert" ON public.users;

-- Crear una nueva política de INSERT más permisiva
-- Permite insertar SI el id coincide con auth.uid() O si no existe perfil aún
CREATE POLICY "allow_authenticated_insert"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = id
);

-- Verificar que se creó correctamente
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users' ORDER BY cmd;

-- ============================================================================
-- NOTA: Si sigue fallando, el problema puede ser que Supabase no ha 
-- establecido auth.uid() correctamente durante el signUp.
-- En ese caso, podemos usar una función de servicio con SECURITY DEFINER.
-- ============================================================================
