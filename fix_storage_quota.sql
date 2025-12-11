-- ============================================================================
-- FIX: Limpiar metadatos pesados (Fotos) de auth.users
-- ============================================================================
-- Motivo: El error "QuotaExceededError" ocurre porque las fotos de verificación
-- se guardaron en los metadatos de autenticación, saturando el localStorage
-- del navegador al intentar iniciar sesión.
-- ============================================================================

-- 1. Limpiar datos de usuarios existentes (SOLUCIONA EL ERROR DE JUAN)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'verification_photos';

-- 2. Crear Trigger para limpiar automáticamente al verificar
-- Esto asegura que cuando apruebes a alguien en el futuro,
-- también se limpie en auth.users, no solo en public.users

CREATE OR REPLACE FUNCTION public.clean_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el usuario es verificado o rechazado, limpiar sus metadatos de autenticación
    IF (NEW.verified = 'VERIFICADO' OR NEW.verified = 'RECHAZADO') THEN
        UPDATE auth.users
        SET raw_user_meta_data = raw_user_meta_data - 'verification_photos'
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en public.users
DROP TRIGGER IF EXISTS on_user_verified_clean_auth ON public.users;

CREATE TRIGGER on_user_verified_clean_auth
    AFTER UPDATE OF verified ON public.users
    FOR EACH ROW
    WHEN (OLD.verified <> NEW.verified)
    EXECUTE FUNCTION public.clean_auth_metadata();

-- Confirmación
SELECT 'Metadatos limpiados y trigger de limpieza configurado' as mensaje;
