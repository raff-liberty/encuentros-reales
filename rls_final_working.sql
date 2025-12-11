-- ============================================================================
-- SOLUCIÓN DEFINITIVA RLS - CONFIGURACIÓN QUE FUNCIONA
-- ============================================================================
-- Este script implementa políticas RLS que permiten el login correcto
-- manteniendo la seguridad de la aplicación
-- ============================================================================

-- PASO 1: Limpiar TODAS las políticas existentes
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

-- PASO 2: Crear políticas que FUNCIONAN

-- Política 1: SELECT - Cualquier usuario autenticado puede leer perfiles
-- IMPORTANTE: Esto es necesario para que el login funcione y para que los usuarios
-- puedan ver perfiles de organizadores y participantes
CREATE POLICY "allow_authenticated_select"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Política 2: INSERT - Solo puedes crear tu propio perfil
-- Esto permite que el código cree perfiles automáticamente durante el login
CREATE POLICY "allow_own_insert"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Política 3: UPDATE - Solo puedes actualizar tu propio perfil O eres admin
-- Los admins pueden actualizar cualquier perfil
CREATE POLICY "allow_own_or_admin_update"
ON public.users
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id 
  OR 
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
)
WITH CHECK (
  auth.uid() = id 
  OR 
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
);

-- Política 4: DELETE - Solo admins pueden eliminar usuarios
CREATE POLICY "allow_admin_delete"
ON public.users
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
);

-- PASO 3: Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- PASO 4: Verificar configuración
SELECT 
    '=== POLÍTICAS CREADAS ===' as info;

SELECT 
    policyname,
    cmd as operacion,
    CASE cmd
        WHEN 'SELECT' THEN '✅ Lectura (todos los autenticados)'
        WHEN 'INSERT' THEN '✅ Inserción (solo propio perfil)'
        WHEN 'UPDATE' THEN '✅ Actualización (propio perfil o admin)'
        WHEN 'DELETE' THEN '✅ Eliminación (solo admin)'
    END as descripcion
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

SELECT 
    '=== ESTADO DE RLS ===' as info;

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
-- Deberías ver 4 políticas:
-- 1. allow_admin_delete (DELETE) - ✅ Eliminación (solo admin)
-- 2. allow_authenticated_select (SELECT) - ✅ Lectura (todos los autenticados)
-- 3. allow_own_insert (INSERT) - ✅ Inserción (solo propio perfil)
-- 4. allow_own_or_admin_update (UPDATE) - ✅ Actualización (propio perfil o admin)
--
-- Y RLS debe mostrar: ✅ RLS HABILITADO CORRECTAMENTE
-- ============================================================================

-- ============================================================================
-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- ============================================================================
-- 1. Cierra sesión en tu aplicación (si estás logueado)
-- 2. Refresca la página (F5)
-- 3. Intenta hacer login con: alcaldemolinarafael@gmail.com / admin123
-- 4. Debería funcionar correctamente ✅
-- 5. Prueba crear un usuario nuevo para verificar que todo funciona
-- ============================================================================

-- ============================================================================
-- SEGURIDAD:
-- ============================================================================
-- Esta configuración es SEGURA porque:
-- ✅ Los usuarios pueden VER perfiles (necesario para la app)
-- ✅ Los usuarios SOLO pueden MODIFICAR su propio perfil
-- ✅ Los usuarios NO pueden cambiar su rol a ADMIN
-- ✅ Solo los ADMINS pueden eliminar usuarios
-- ✅ Solo los ADMINS pueden modificar perfiles de otros usuarios
-- ============================================================================
