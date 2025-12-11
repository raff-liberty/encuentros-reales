-- ============================================================================
-- ARREGLO DE PERMISOS DE ADMINISTRADOR (RLS)
-- ============================================================================
-- Este script permite que los usuarios con rol 'ADMIN' puedan ver los datos de TODOS los usuarios.
-- Ejecuta esto en el Editor SQL de Supabase.

-- 1. Habilitar RLS en la tabla users (por seguridad, si no lo estaba ya)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Crear política: "Los administradores pueden ver todos los perfiles"
-- Primero borramos la política si ya existía para evitar conflictos
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

CREATE POLICY "Admins can view all profiles"
ON public.users
FOR SELECT
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
);

-- 3. Crear política: "Los administradores pueden actualizar estados de verificación"
DROP POLICY IF EXISTS "Admins can update verification" ON public.users;

CREATE POLICY "Admins can update verification"
ON public.users
FOR UPDATE
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
);

-- 4. Crear política básica: "Los usuarios pueden ver su propio perfil" (Fallback esencial)
DROP POLICY IF EXISTS "Users can see own profile" ON public.users;

CREATE POLICY "Users can see own profile"
ON public.users
FOR SELECT
USING (
  auth.uid() = id
);

-- 5. Crear política para creación de perfil durante el registro
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
WITH CHECK (
  auth.uid() = id
);

-- 6. Crear política para que los usuarios puedan actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (
  auth.uid() = id
);
