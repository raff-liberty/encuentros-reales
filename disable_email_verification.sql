-- ============================================================================
-- DESHABILITAR VERIFICACIÓN DE EMAIL AUTOMÁTICA
-- ============================================================================
-- Este trigger auto-confirma el email del usuario inmediatamente después
-- de registrarse, así no necesita verificar por email.
-- La aprobación será SOLO manual por el admin (vía el campo verified).
-- ============================================================================

-- Función que auto-confirma el email
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar el usuario para confirmar el email automáticamente
    UPDATE auth.users 
    SET email_confirmed_at = NOW()
    WHERE id = NEW.id AND email_confirmed_at IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta después de crear el usuario
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;

CREATE TRIGGER on_auth_user_auto_confirm
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_email();

-- Verificar que se creó
SELECT 
    'Trigger de auto-confirmación creado' as status,
    trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_auto_confirm';

-- ============================================================================
-- IMPORTANTE: También debes ir a Supabase Dashboard y deshabilitar:
-- Authentication → Providers → Email → Desactivar "Confirm email"
-- 
-- Si no puedes acceder al dashboard, este trigger es una alternativa.
-- ============================================================================

-- OPCIONAL: Confirmar emails de usuarios existentes que están pendientes
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW() 
-- WHERE email_confirmed_at IS NULL;
