-- Tabla de REVIEWS (Valoraciones)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID REFERENCES users(id), -- Quién valora (Organizadora)
    reviewed_id UUID REFERENCES users(id), -- A quién valora (Participante)
    event_id UUID REFERENCES events(id),   -- En qué evento
    rating NUMERIC NOT NULL,               -- 1 a 5
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar seguridad
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Organizadores pueden crear reviews
CREATE POLICY "Organizers can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Todos pueden LEER reviews (para mostrar promedios)
CREATE POLICY "Anyone can read reviews" ON reviews
    FOR SELECT USING (true);
