-- Habilitar RLS en notifications si no está habilitado
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política 1: Los usuarios pueden ver sus propias notificaciones
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política 2: Los usuarios pueden borrar sus propias notificaciones (marcar como leídas/borrar)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Política 3: Permitir crear notificaciones
-- Opción A: Cualquier usuario autenticado puede crear una notificación (necesario si la lógica está en el cliente)
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
CREATE POLICY "Users can create notifications" ON notifications
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Opción de seguridad adicional (opcional):
-- Si quisieras restringir quién envía qué, podrías validar que el sender_id coincida con auth.uid(),
-- pero como muchas notificaciones son "del sistema" (disparadas por acciones del usuario), 
-- permitir INSERT a authenticated es lo más práctico para este prototipo.
