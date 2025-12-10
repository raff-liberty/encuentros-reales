-- DEBUG STORAGE POLICIES --
-- Vamos a permitir subir a CUALQUIER usuario autenticado sin comprobar el nombre de la carpeta
-- Esto nos dirá si el problema era el "nombre de carpeta" (user_id).

DROP POLICY IF EXISTS "Usuarios suben su avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios actualizan su avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios suben a galería" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios borran de galería" ON storage.objects;

-- Política ULTRA PERMISIVA para Avatares (Solo requiere estar logueado)
CREATE POLICY "Permisiva Avatar Insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Permisiva Avatar Update" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

-- Política ULTRA PERMISIVA para Galería
CREATE POLICY "Permisiva Galeria Insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Permisiva Galeria Delete" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'gallery');

-- Asegurar que buckets son públicos (otra vez)
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
UPDATE storage.buckets SET public = true WHERE id = 'gallery';
