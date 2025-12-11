-- ============================================================================
-- FIX FINAL ESPECÍFICO PARA JUAN
-- ============================================================================

-- 1. Verificación PREVIA (Para ver si realmente tiene datos basura)
SELECT 
    email, 
    length(raw_user_meta_data::text) as tamano_datos_bytes,
    CASE WHEN raw_user_meta_data ? 'verification_photos' THEN 'TIENE FOTOS (MALO)' ELSE 'LIMPIO (BUENO)' END as estado
FROM auth.users 
WHERE email = 'juan-buscador@yopmail.com';

-- 2. LIMPIEZA DRÁSTICA (Solo para Juan)
-- Eliminamos específicamente la clave de fotos
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'verification_photos'
WHERE email = 'juan-buscador@yopmail.com';

-- 3. Verificación POSTERIOR
SELECT 
    email, 
    length(raw_user_meta_data::text) as tamano_datos_ahora,
    CASE WHEN raw_user_meta_data ? 'verification_photos' THEN 'ERROR: NO SE BORRÓ' ELSE 'EXITO: YA NO TIENE FOTOS' END as estado_final
FROM auth.users 
WHERE email = 'juan-buscador@yopmail.com';
