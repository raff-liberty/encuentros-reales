-- ============================================================================
-- ARREGLAR POLÍTICAS RLS PARA PERMITIR LOGIN
-- ============================================================================

-- PASO 1: Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can see own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update verification" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admins_select_all" ON public.users;
DROP POLICY IF EXISTS "admins_update_all" ON public.users;

-- PASO 2: Crear políticas correctas

-- Política 1: Los usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política 2: Los usuarios pueden insertar su propio perfil (IMPORTANTE para login)
CREATE POLICY "users_insert_own"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Política 3: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política 4: Los admins pueden ver todos los perfiles
CREATE POLICY "admins_select_all"
ON public.users
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'ADMIN'
    )
);

-- Política 5: Los admins pueden actualizar todos los perfiles
CREATE POLICY "admins_update_all"
ON public.users
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'ADMIN'
    )
);

-- PASO 3: Asegurar que RLS está habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- PASO 4: Verificar las políticas creadas
SELECT 
    policyname,
    cmd as operacion,
    roles
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
