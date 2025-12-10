-- FUNCIÓN: Calcular promedio de calificación
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET rating = (
        SELECT AVG(rating)
        FROM reviews
        WHERE reviewed_id = NEW.reviewed_id
    )
    WHERE id = NEW.reviewed_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Ejecutar cuando se inserte o actualice una review
DROP TRIGGER IF EXISTS on_review_created ON reviews;
CREATE TRIGGER on_review_created
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_user_rating();

-- CORRECCIÓN: Asegurar que la columna 'rating' existe y es numérica
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;

-- NOTAS SOBRE NOTIFICACIONES
-- Si las notificaciones no llegan, asegúrate de que la política de INSERT permite a 'authenticated'
-- crear notificaciones para OTROS usuarios (user_id != auth.uid()).
-- La política creada anteriormente permitía esto:
-- CREATE POLICY "Users can create notifications" ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Esto es correcto.
