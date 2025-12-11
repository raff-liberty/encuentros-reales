-- ============================================================================
-- SOLUCIÓN DEFINITIVA: RLS CONFIGURADO CORRECTAMENTE
-- ============================================================================
-- Este script configura RLS para permitir login y operaciones normales
-- manteniendo la seguridad
-- ============================================================================

-- PASO 1: Limpiar todas las políticas existentes
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

-- PASO 2: Crear políticas PERMISIVAS para usuarios autenticados

-- Política 1: Cualquier usuario autenticado puede LEER su propio perfil
CREATE POLICY "authenticated_users_select_own"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política 2: Cualquier usuario autenticado puede CREAR su propio perfil
-- IMPORTANTE: Esto permite que el código cree perfiles automáticamente
CREATE POLICY "authenticated_users_insert_own"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Política 3: Cualquier usuario autenticado puede ACTUALIZAR su propio perfil
CREATE POLICY "authenticated_users_update_own"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política 4: Los ADMINS pueden LEER todos los perfiles
CREATE POLICY "admins_select_all"
ON public.users
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'ADMIN'
    )
);

-- Política 5: Los ADMINS pueden ACTUALIZAR todos los perfiles
CREATE POLICY "admins_update_all"
ON public.users
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'ADMIN'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'ADMIN'
    )
);

-- Política 6: Los ADMINS pueden ELIMINAR usuarios
CREATE POLICY "admins_delete_all"
ON public.users
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'ADMIN'
    )
);

-- PASO 3: Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- PASO 4: Verificar configuración
SELECT 
    '=== POLÍTICAS CREADAS ===' as seccion;

SELECT 
    policyname,
    cmd as operacion,
    CASE cmd
        WHEN 'SELECT' THEN 'Lectura ✅'
        WHEN 'INSERT' THEN 'Inserción ✅'
        WHEN 'UPDATE' THEN 'Actualización ✅'
        WHEN 'DELETE' THEN 'Eliminación ✅'
    END as tipo
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

SELECT 
    '=== ESTADO DE RLS ===' as seccion;

SELECT 
    tablename,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS HABILITADO CORRECTAMENTE'
        ELSE '❌ ERROR: RLS NO ESTÁ HABILITADO'
    END as estado
FROM pg_tables
WHERE tablename = 'users';

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Deberías ver 6 políticas:
-- 1. admins_delete_all (DELETE) - Eliminación ✅
-- 2. admins_select_all (SELECT) - Lectura ✅
-- 3. admins_update_all (UPDATE) - Actualización ✅
-- 4. authenticated_users_insert_own (INSERT) - Inserción ✅
-- 5. authenticated_users_select_own (SELECT) - Lectura ✅
-- 6. authenticated_users_update_own (UPDATE) - Actualización ✅
--
-- Y RLS debe mostrar: ✅ RLS HABILITADO CORRECTAMENTE
-- ============================================================================

-- ============================================================================
-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- ============================================================================
-- 1. Refresca tu aplicación (F5)
-- 2. Intenta hacer login con: alcaldemolinarafael@gmail.com / admin123
-- 3. Debería funcionar correctamente
-- 4. Si sigue dando error, comparte el mensaje de error
-- ============================================================================
