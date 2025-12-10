
-- Habilitar RLS en applications si no está habilitado
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Política 1: Los usuarios pueden ver sus propias aplicaciones
DROP POLICY IF EXISTS "Users can view own applications" ON applications;
CREATE POLICY "Users can view own applications" ON applications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política 2: Los usuarios pueden crear sus propias aplicaciones
DROP POLICY IF EXISTS "Users can create own applications" ON applications;
CREATE POLICY "Users can create own applications" ON applications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política 3: Los organizadores pueden ver aplicaciones de SU evento
-- Esta es la clave para que la gestión funcione
DROP POLICY IF EXISTS "Organizers can view applications for their events" ON applications;
CREATE POLICY "Organizers can view applications for their events" ON applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = applications.event_id
            AND events.organizer_id = auth.uid()
        )
    );

-- Política 4: Los organizadores pueden actualizar el estado de las aplicaciones de su evento
DROP POLICY IF EXISTS "Organizers can update applications for their events" ON applications;
CREATE POLICY "Organizers can update applications for their events" ON applications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = applications.event_id
            AND events.organizer_id = auth.uid()
        )
    );
