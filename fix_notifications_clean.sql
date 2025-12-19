-- DIAGNÓSTICO: Verificar notificaciones existentes
SELECT COUNT(*) as total_notifications FROM notifications;

-- Ver políticas RLS actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- SOLUCIÓN: Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON notifications;

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: Permitir crear notificaciones para cualquier usuario
CREATE POLICY "Authenticated users can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- POLÍTICA 2: Ver solo propias notificaciones
CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- POLÍTICA 3: Actualizar solo propias notificaciones
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- VERIFICACIÓN: Ver políticas creadas
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- Ver últimas notificaciones
SELECT id, user_id, type, title, message, created_at, read
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
