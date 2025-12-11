-- ============================================================================
-- SOLUCIÓN TEMPORAL: Deshabilitar RLS para permitir login
-- ============================================================================
-- Esto deshabilitará temporalmente las restricciones de seguridad
-- Solo para diagnóstico - NO usar en producción
-- ============================================================================

-- PASO 1: Deshabilitar RLS temporalmente
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- PASO 2: Verificar que se deshabilitó
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'users';

-- Debería mostrar: rls_habilitado = false

-- ============================================================================
-- DESPUÉS DE HACER LOGIN EXITOSO, VUELVE A HABILITAR RLS:
-- ============================================================================
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ============================================================================
