-- CORRECCIÓN: AÑADIR COLUMNA GALERÍA --

-- El error indica que falta la columna 'gallery' en la tabla 'users'.
-- Ejecuta esto para solucionarlo.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;

-- Asegurarnos también de que avatar_url existe (por si acaso)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Confirmar que search_zones y age existen
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS search_zones TEXT[],
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Comentario: 
-- Ahora la tabla users tendrá el campo 'gallery' donde guardaremos el array de URLs.
