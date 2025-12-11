-- ============================================================================
-- CONFIGURACIÓN FINAL DE RLS - POLÍTICAS CORRECTAS
-- ============================================================================
-- Este script configura RLS de forma que permita el login y operaciones normales
-- ============================================================================

-- PASO 1: Limpiar TODAS las políticas anteriores
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' 
        AND schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
END $$;

-- PASO 2: Crear políticas CORRECTAS que permitan login

-- Política 1: Permitir SELECT para usuarios autenticados (ver su propio perfil)
CREATE POLICY "allow_select_own_profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política 2: Permitir INSERT para usuarios autenticados (crear perfil al registrarse)
CREATE POLICY "allow_insert_own_profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Política 3: Permitir UPDATE para usuarios autenticados (actualizar su perfil)
CREATE POLICY "allow_update_own_profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política 4: Permitir a ADMINS ver TODOS los perfiles
CREATE POLICY "allow_admin_select_all"
ON public.users
FOR SELECT
TO authenticated
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
);

-- Política 5: Permitir a ADMINS actualizar TODOS los perfiles
CREATE POLICY "allow_admin_update_all"
ON public.users
FOR UPDATE
TO authenticated
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
)
WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
);

-- Política 6: Permitir a ADMINS eliminar usuarios
CREATE POLICY "allow_admin_delete_all"
ON public.users
FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
);

-- PASO 3: Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- PASO 4: Verificar que las políticas se crearon correctamente
SELECT 
    policyname,
    cmd as operacion,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Lectura'
        WHEN cmd = 'INSERT' THEN 'Inserción'
        WHEN cmd = 'UPDATE' THEN 'Actualización'
        WHEN cmd = 'DELETE' THEN 'Eliminación'
    END as tipo
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- PASO 5: Verificar que RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS habilitado correctamente'
        ELSE '❌ RLS NO está habilitado'
    END as estado
FROM pg_tables
WHERE tablename = 'users';

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Deberías ver 6 políticas:
-- 1. allow_admin_delete_all (DELETE)
-- 2. allow_admin_select_all (SELECT)
-- 3. allow_admin_update_all (UPDATE)
-- 4. allow_insert_own_profile (INSERT)
-- 5. allow_select_own_profile (SELECT)
-- 6. allow_update_own_profile (UPDATE)
--
-- Y RLS debe estar habilitado (true)
-- ============================================================================
