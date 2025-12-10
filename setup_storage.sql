-- HABILITAR STORAGE (si no estuviera) --
-- Crear bucket de AVATARES (Público)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Crear bucket de GALERÍA (Público)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- ELIMINAR POLÍTICAS ANTIGUAS (para evitar duplicados/errores) --
DROP POLICY IF EXISTS "Avatars visibles para todos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios suben su avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios actualizan su avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios borran su avatar" ON storage.objects;

DROP POLICY IF EXISTS "Galería visible para todos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios suben a galería" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios actualizan galería" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios borran de galería" ON storage.objects;

-- CREAR POLÍTICAS DE SEGURIDAD PARA 'avatars' --

-- 1. Ver (SELECT): Público
CREATE POLICY "Avatars visibles para todos" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 2. Subir (INSERT): Autenticados
CREATE POLICY "Usuarios suben su avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

-- 3. Actualizar (UPDATE): Autenticados (propietarios)
CREATE POLICY "Usuarios actualizan su avatar" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Borrar (DELETE): Autenticados (propietarios)
CREATE POLICY "Usuarios borran su avatar" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);


-- CREAR POLÍTICAS DE SEGURIDAD PARA 'gallery' --

-- 1. Ver (SELECT): Público
CREATE POLICY "Galería visible para todos" ON storage.objects
  FOR SELECT USING (bucket_id = 'gallery');

-- 2. Subir (INSERT): Autenticados
CREATE POLICY "Usuarios suben a galería" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery');

-- 3. Borrar (DELETE): Autenticados (propietarios)
-- Nota: Asumimos estructura "userId/filename"
CREATE POLICY "Usuarios borran de galería" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
