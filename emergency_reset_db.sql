-- ============================================================================
-- SCRIPT DE EMERGENCIA: RESET COMPLETO DE CONFIGURACIÓN
-- ============================================================================
-- ⚠️ ADVERTENCIA: Este script resetea completamente la configuración de RLS
-- Solo usar si los otros scripts no funcionaron
-- NO borra datos de usuarios, solo resetea políticas y configuración
-- ============================================================================

-- ============================================================================
-- PASO 1: BACKUP DE SEGURIDAD (OPCIONAL PERO RECOMENDADO)
-- ============================================================================
-- Descomentar para crear una tabla de backup antes de hacer cambios

-- CREATE TABLE users_backup AS SELECT * FROM public.users;

-- ============================================================================
-- PASO 2: LIMPIAR POLÍTICAS RLS EXISTENTES
-- ============================================================================

-- Deshabilitar RLS temporalmente para poder trabajar
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes
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

-- Verificar que no queden políticas
SELECT 
    COUNT(*) as politicas_restantes,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Todas las políticas eliminadas'
        ELSE '❌ Aún quedan ' || COUNT(*) || ' políticas'
    END as estado
FROM pg_policies 
WHERE tablename = 'users';

-- ============================================================================
-- PASO 3: ASEGURAR ESTRUCTURA DE LA TABLA
-- ============================================================================

-- Agregar columnas faltantes (si no existen)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role text DEFAULT 'BUSCADOR',
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS verified text DEFAULT 'PENDIENTE',
ADD COLUMN IF NOT EXISTS verification_photos jsonb,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();

-- Verificar estructura
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 4: SINCRONIZAR USUARIOS DE auth.users A public.users
-- ============================================================================

-- Insertar usuarios faltantes desde auth.users
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
    ),
    COALESCE(
        au.raw_user_meta_data->>'role',
        'BUSCADOR'
    ),
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'VERIFICADO'
        ELSE 'PENDIENTE'
    END,
    au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verificar sincronización
SELECT 
    'Usuarios sincronizados' as estado,
    COUNT(*) as cantidad
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.id;

-- ============================================================================
-- PASO 5: CREAR/ACTUALIZAR USUARIO ADMINISTRADOR
-- ============================================================================

-- ⚠️ IMPORTANTE: Reemplaza 'TU_EMAIL@ejemplo.com' con tu email real

-- Opción A: Si ya tienes un usuario en auth.users, actualízalo
UPDATE public.users
SET 
    role = 'ADMIN',
    verified = 'VERIFICADO',
    username = COALESCE(username, 'Admin')
WHERE email = 'TU_EMAIL@ejemplo.com';  -- ⚠️ CAMBIAR ESTE EMAIL

-- Opción B: Si necesitas confirmar el email también
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'TU_EMAIL@ejemplo.com'  -- ⚠️ CAMBIAR ESTE EMAIL
  AND email_confirmed_at IS NULL;

-- Verificar que el admin fue creado
SELECT 
    id,
    email,
    username,
    role,
    verified,
    created_at
FROM public.users
WHERE role = 'ADMIN';

-- ============================================================================
-- PASO 6: CREAR POLÍTICAS RLS DESDE CERO
-- ============================================================================

-- Política 1: Los usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Política 2: Los usuarios pueden insertar su propio perfil
CREATE POLICY "users_insert_own"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Política 3: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- Política 4: Los admins pueden ver todos los perfiles
CREATE POLICY "admins_select_all"
ON public.users
FOR SELECT
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
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'ADMIN'
    )
);

-- Verificar que las políticas fueron creadas
SELECT 
    policyname,
    cmd,
    CASE cmd
        WHEN 'SELECT' THEN 'Lectura'
        WHEN 'INSERT' THEN 'Inserción'
        WHEN 'UPDATE' THEN 'Actualización'
        WHEN 'DELETE' THEN 'Eliminación'
    END as operacion
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- ============================================================================
-- PASO 7: HABILITAR RLS
-- ============================================================================

-- Habilitar Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verificar que RLS está habilitado
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
-- PASO 8: CREAR TRIGGER PARA SINCRONIZACIÓN AUTOMÁTICA
-- ============================================================================

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Crear función para el trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
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
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Verificar que el trigger fue creado
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================================================
-- PASO 9: VERIFICACIÓN FINAL COMPLETA
-- ============================================================================

SELECT '=== VERIFICACIÓN FINAL ===' as seccion;

-- 9.1 Estado de RLS
SELECT 
    '1. RLS' as verificacion,
    CASE 
        WHEN rowsecurity = true THEN '✅ Habilitado'
        ELSE '❌ Deshabilitado'
    END as estado
FROM pg_tables
WHERE tablename = 'users'

UNION ALL

-- 9.2 Cantidad de políticas
SELECT 
    '2. Políticas RLS' as verificacion,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ ' || COUNT(*) || ' políticas activas'
        ELSE '❌ Solo ' || COUNT(*) || ' políticas (se necesitan 5)'
    END as estado
FROM pg_policies
WHERE tablename = 'users'

UNION ALL

-- 9.3 Usuarios admin
SELECT 
    '3. Usuarios Admin' as verificacion,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' admin(s) configurado(s)'
        ELSE '❌ No hay usuarios admin'
    END as estado
FROM public.users
WHERE role = 'ADMIN'

UNION ALL

-- 9.4 Sincronización
SELECT 
    '4. Sincronización' as verificacion,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Todos los usuarios sincronizados'
        ELSE '❌ ' || COUNT(*) || ' usuarios sin sincronizar'
    END as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL

UNION ALL

-- 9.5 Trigger
SELECT 
    '5. Trigger automático' as verificacion,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Trigger configurado'
        ELSE '❌ Trigger no encontrado'
    END as estado
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 9.6 Mostrar usuarios admin
SELECT 
    '=== USUARIOS ADMINISTRADORES ===' as seccion;

SELECT 
    email,
    username,
    role,
    verified,
    created_at
FROM public.users
WHERE role = 'ADMIN'
ORDER BY created_at DESC;

-- ============================================================================
-- PASO 10: INSTRUCCIONES FINALES
-- ============================================================================

SELECT '=== PRÓXIMOS PASOS ===' as seccion;

SELECT 
    '1. Verifica que todos los checks anteriores muestren ✅' as instruccion
UNION ALL
SELECT '2. Si hay algún ❌, revisa ese paso específico'
UNION ALL
SELECT '3. Intenta hacer login con el usuario admin configurado'
UNION ALL
SELECT '4. Si el login falla, verifica que el email esté confirmado en Authentication > Users'
UNION ALL
SELECT '5. Si todo funciona, ¡ya puedes usar la aplicación! 🎉';

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 
-- ✅ Este script es SEGURO:
--    - NO borra datos de usuarios
--    - Solo resetea configuración de seguridad
--    - Puedes ejecutarlo múltiples veces
--
-- ⚠️ RECUERDA:
--    - Cambiar 'TU_EMAIL@ejemplo.com' en el PASO 5
--    - Verificar los resultados de cada SELECT
--    - Guardar este script para futuras referencias
--
-- 🔄 Si necesitas volver atrás:
--    - Restaura desde users_backup si creaste el backup
--    - O simplemente vuelve a ejecutar este script
--
-- ============================================================================
