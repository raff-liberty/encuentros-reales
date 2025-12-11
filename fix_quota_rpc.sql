-- ============================================================================
-- SOLUCIÓN COMPLETA: LIMPIEZA Y FUNCION PARA SUBIR FOTOS
-- ============================================================================

-- 1. LIMPIEZA INMEDIATA (Ejecuta esto para desbloquear a Juan)
-- Elimina la clave 'verification_photos' de los metadatos de TODOS los usuarios
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'verification_photos'
WHERE raw_user_meta_data ? 'verification_photos';

-- 2. CREAR FUNCIÓN PARA SUBIR FOTOS DE FORMA SEGURA
-- Esta función permite guardar las fotos sin pasar por auth.users
-- evitando el error de "QuotaExceededError"
CREATE OR REPLACE FUNCTION public.upload_verification_photos(photos jsonb)
RETURNS void AS $$
BEGIN
    UPDATE public.users
    SET verification_photos = photos
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. VERIFICACIÓN
SELECT count(*) as usuarios_con_fotos_en_auth 
FROM auth.users 
WHERE raw_user_meta_data ? 'verification_photos';
