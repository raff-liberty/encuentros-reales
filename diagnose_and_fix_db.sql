-- ============================================================================
-- DIAGNÓSTICO Y CORRECCIÓN COMPLETA DE BASE DE DATOS
-- Proyecto: Encuentros Reales (Rama DEV)
-- Backend: Supabase
-- ============================================================================

-- ============================================================================
-- PARTE 1: DIAGNÓSTICO - Ver el estado actual
-- ============================================================================

-- 1.1 Ver todos los usuarios y su estado
SELECT 
    id,
    email,
    username,
    role,
    verified,
    created_at
FROM public.users
ORDER BY created_at DESC;

-- 1.2 Ver usuarios administradores
SELECT 
    id,
    email,
    username,
    role,
    verified
FROM public.users
WHERE role = 'ADMIN';

-- 1.3 Ver todas las políticas RLS activas en la tabla users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users';

-- 1.4 Verificar si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- ============================================================================
-- PARTE 2: CORRECCIÓN - Arreglar problemas comunes
-- ============================================================================

-- 2.1 Asegurar que la tabla users tiene las columnas necesarias
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role text DEFAULT 'BUSCADOR',
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS verified text DEFAULT 'PENDIENTE',
ADD COLUMN IF NOT EXISTS verification_photos jsonb,
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_count integer DEFAULT 0;

-- 2.2 Habilitar RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2.3 ELIMINAR TODAS las políticas existentes para empezar limpio
DROP POLICY IF EXISTS "Users can see own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update verification" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.users;

-- 2.4 CREAR políticas RLS correctas y funcionales

-- Política 1: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can see own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Política 2: Los usuarios pueden insertar su propio perfil durante el registro
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Política 3: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- Política 4: Los administradores pueden ver TODOS los perfiles
CREATE POLICY "Admins can view all profiles"
ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  )
);

-- Política 5: Los administradores pueden actualizar cualquier perfil
CREATE POLICY "Admins can update all profiles"
ON public.users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  )
);

-- ============================================================================
-- PARTE 3: CREAR/ACTUALIZAR USUARIO ADMINISTRADOR
-- ============================================================================

-- 3.1 Primero, verifica qué email quieres usar como admin
-- REEMPLAZA 'tu_email@ejemplo.com' con tu email real

-- Opción A: Si el usuario ya existe en auth.users, solo actualiza el perfil
UPDATE public.users
SET 
    role = 'ADMIN',
    verified = 'VERIFICADO'
WHERE email = 'admin@encuentros.com';

-- Opción B: Si necesitas crear un usuario admin desde cero en la tabla users
-- (Esto solo funciona si ya existe en auth.users)
-- INSERT INTO public.users (id, email, username, role, verified, created_at)
-- VALUES (
--     'UUID_DEL_USUARIO_EN_AUTH',  -- Obtén esto de auth.users
--     'admin@encuentros.com',
--     'Admin',
--     'ADMIN',
--     'VERIFICADO',
--     NOW()
-- )
-- ON CONFLICT (id) DO UPDATE
-- SET role = 'ADMIN', verified = 'VERIFICADO';

-- ============================================================================
-- PARTE 4: VERIFICACIÓN FINAL
-- ============================================================================

-- 4.1 Ver usuarios administradores creados
SELECT 
    id,
    email,
    username,
    role,
    verified,
    created_at
FROM public.users
WHERE role = 'ADMIN';

-- 4.2 Ver todas las políticas activas (deben ser 5)
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ============================================================================
-- PARTE 5: SOLUCIÓN DE PROBLEMAS COMUNES
-- ============================================================================

-- Problema 1: "No puedo acceder con ningún usuario"
-- Solución: Verifica que el usuario existe en AMBAS tablas (auth.users Y public.users)

-- Ver usuarios en auth.users (solo visible para service_role)
-- SELECT id, email, created_at FROM auth.users;

-- Ver usuarios en public.users
SELECT id, email, username, role, verified FROM public.users;

-- Problema 2: "El usuario existe pero no puede hacer login"
-- Solución: Verifica el estado de verificación del email en Supabase Auth

-- Problema 3: "Error de permisos al intentar leer datos"
-- Solución: Verifica que RLS está configurado correctamente (ejecuta PARTE 2.3 y 2.4)

-- ============================================================================
-- INSTRUCCIONES DE USO:
-- ============================================================================
-- 1. Abre el Editor SQL de Supabase (https://app.supabase.com)
-- 2. Selecciona tu proyecto
-- 3. Ve a "SQL Editor"
-- 4. Copia y pega este script COMPLETO
-- 5. ANTES de ejecutar, reemplaza 'admin@encuentros.com' con tu email real en la línea 130
-- 6. Ejecuta el script completo
-- 7. Revisa los resultados de las consultas SELECT para verificar que todo está correcto
-- ============================================================================
