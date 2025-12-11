-- ============================================================================
-- SOLUCIÓN DEFINITIVA: Trigger para crear perfiles automáticamente
-- ============================================================================
-- Este trigger se ejecuta cuando se crea un usuario en auth.users
-- y crea automáticamente su perfil en public.users
-- ============================================================================

-- PASO 1: Crear la función que manejará el trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        username,
        full_name,
        role,
        birth_date,
        province,
        verified,
        verification_photos,
        created_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', 'usuario'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'BUSCADOR'),
        (NEW.raw_user_meta_data->>'birth_date')::date,
        COALESCE(NEW.raw_user_meta_data->>'province', ''),
        COALESCE(NEW.raw_user_meta_data->>'verified', 'PENDIENTE'),
        COALESCE(NEW.raw_user_meta_data->'verification_photos', '{}'::jsonb),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- El usuario ya existe, ignorar
        RETURN NEW;
    WHEN OTHERS THEN
        -- Loguear el error pero no fallar
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 2: Crear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- PASO 3: Verificar que se creó
SELECT 
    'Trigger creado correctamente' as status,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================================================
-- IMPORTANTE: Después de ejecutar esto:
-- 1. Borra a Juan de Authentication
-- 2. Regístralo de nuevo
-- 3. El perfil se creará automáticamente gracias al trigger
-- ============================================================================
