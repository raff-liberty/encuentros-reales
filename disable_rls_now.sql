-- ============================================================================
-- SOLUCIÓN INMEDIATA: Deshabilitar RLS y verificar funcionamiento
-- ============================================================================
-- Vamos a deshabilitar RLS temporalmente para confirmar que todo lo demás funciona
-- Luego crearemos una solución RLS que funcione correctamente
-- ============================================================================

-- PASO 1: Deshabilitar RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- PASO 2: Verificar que está deshabilitado
SELECT 
    tablename,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DESHABILITADO - Prueba el login ahora'
        ELSE '❌ RLS AÚN HABILITADO'
    END as estado
FROM pg_tables
WHERE tablename = 'users';

-- ============================================================================
-- INSTRUCCIONES:
-- ============================================================================
-- 1. Ejecuta este script
-- 2. Refresca tu aplicación (F5)
-- 3. Intenta hacer login con: alcaldemolinarafael@gmail.com / admin123
-- 4. Si funciona, confirma y trabajaremos en una solución RLS correcta
-- 5. Si NO funciona, hay otro problema diferente a RLS
-- ============================================================================
