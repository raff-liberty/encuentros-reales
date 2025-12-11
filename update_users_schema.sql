-- ============================================================================
-- MIGRACIÓN DE BASE DE DATOS: NUEVOS CAMPOS DE REGISTRO
-- ============================================================================
-- No es necesario crear nuevas tablas. Solo necesitamos añadir columnas a la tabla 'users'.

-- 1. Añadir columnas para el perfil extendido
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role text DEFAULT 'BUSCADOR',
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS verified text DEFAULT 'PENDIENTE', -- PENDIENTE, VERIFICADO, RECHAZADO
ADD COLUMN IF NOT EXISTS verification_photos jsonb; -- Para guardar URLs de fotos (rostro, dni)

-- 2. Asegurar que los usuarios pueden subir sus propias fotos (Storage)
-- (Esto se configura en la UI de Supabase Storage, creando un bucket 'verification-photos' público o privado)

-- 3. Actualizar políticas RLS (Opcional, según tu configuración actual)
-- Asegura que el usuario puede ver su propio estado de verificación
-- CREATE POLICY "Users can see own profile" ON public.users FOR SELECT USING (auth.uid() = id);
-- Asegura que el usuario puede actualizar su propio perfil durante el registro
-- CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- INSTRUCCIONES:
-- Copia y pega este script en el Editor SQL de tu panel de Supabase y ejecútalo.
-- ============================================================================
