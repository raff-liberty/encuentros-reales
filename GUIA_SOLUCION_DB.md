# 🔧 Guía de Solución: Problemas de Acceso a la Base de Datos

## 📋 Resumen del Problema
No puedes acceder con ningún usuario actualmente en la rama **dev** del proyecto.
- **Backend**: Supabase
- **Hosting**: Vercel
- **Proyecto**: Encuentros Reales

## 🎯 Causas Más Comunes

### 1. **Desincronización entre `auth.users` y `public.users`**
   - Los usuarios existen en la tabla de autenticación pero no tienen perfil
   - Esto causa errores al intentar hacer login

### 2. **Políticas RLS (Row Level Security) mal configuradas**
   - Las políticas están bloqueando el acceso a los datos
   - Los usuarios no pueden leer su propio perfil

### 3. **Estado de verificación incorrecto**
   - Los usuarios tienen `verified = 'PENDIENTE'` y la app no permite el acceso
   - Los emails no están confirmados en Supabase Auth

### 4. **Usuario admin no configurado correctamente**
   - No existe un usuario con `role = 'ADMIN'`
   - El usuario admin existe pero no está verificado

## 🔍 Pasos de Diagnóstico y Solución

### **PASO 1: Acceder a Supabase**

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto "Encuentros Reales" (rama dev)
4. Ve a **SQL Editor** en el menú lateral

### **PASO 2: Ejecutar Diagnóstico Completo**

1. Abre el archivo `diagnose_and_fix_db.sql` que acabo de crear
2. Copia **TODO** el contenido
3. Pégalo en el SQL Editor de Supabase
4. **ANTES de ejecutar**, busca la línea 130 y reemplaza `'admin@encuentros.com'` con tu email real
5. Haz clic en **Run** (o presiona Ctrl+Enter)
6. Revisa los resultados de las consultas SELECT

**Qué buscar en los resultados:**
- ¿Aparece algún usuario en la tabla `users`?
- ¿Hay algún usuario con `role = 'ADMIN'`?
- ¿Cuántas políticas RLS aparecen? (Deberían ser 5)
- ¿RLS está habilitado? (`rowsecurity` debe ser `true`)

### **PASO 3: Sincronizar auth.users con public.users**

1. Abre el archivo `sync_auth_users.sql`
2. Copia **TODO** el contenido
3. Pégalo en el SQL Editor de Supabase
4. Ejecuta el script completo
5. Revisa la sección "VERIFICACIÓN" - debe mostrar 0 usuarios desincronizados

**Este script hará:**
- ✅ Crear perfiles faltantes en `public.users`
- ✅ Crear un trigger automático para prevenir problemas futuros
- ✅ Sincronizar todos los usuarios existentes

### **PASO 4: Verificar Usuario Admin**

Ejecuta esta consulta en el SQL Editor:

```sql
SELECT id, email, username, role, verified 
FROM public.users 
WHERE role = 'ADMIN';
```

**Si NO aparece ningún usuario:**

1. Primero, verifica qué usuarios existen:
```sql
SELECT id, email, username, role, verified 
FROM public.users;
```

2. Si ves tu usuario pero no es admin, actualízalo:
```sql
UPDATE public.users
SET role = 'ADMIN', verified = 'VERIFICADO'
WHERE email = 'TU_EMAIL_AQUI@ejemplo.com';
```

3. Si NO ves ningún usuario, necesitas crear uno:
   - Ve a **Authentication** > **Users** en Supabase
   - Haz clic en **Add user** > **Create new user**
   - Ingresa email y password
   - Marca "Auto Confirm User"
   - Después de crear, ejecuta:
   ```sql
   UPDATE public.users
   SET role = 'ADMIN', verified = 'VERIFICADO'
   WHERE email = 'EMAIL_DEL_USUARIO_CREADO@ejemplo.com';
   ```

### **PASO 5: Verificar Políticas RLS**

Ejecuta esta consulta:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
```

**Deberías ver estas 5 políticas:**
1. `Admins can update all profiles` (UPDATE)
2. `Admins can view all profiles` (SELECT)
3. `Users can insert own profile` (INSERT)
4. `Users can see own profile` (SELECT)
5. `Users can update own profile` (UPDATE)

**Si no ves estas políticas**, vuelve a ejecutar el script `diagnose_and_fix_db.sql` completo.

### **PASO 6: Probar el Login**

1. Abre tu aplicación en el navegador
2. Intenta hacer login con el usuario admin que configuraste
3. Si funciona, ¡perfecto! ✅
4. Si NO funciona, continúa al PASO 7

### **PASO 7: Verificar Confirmación de Email**

Si el login sigue fallando, verifica que el email está confirmado:

```sql
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    pu.role,
    pu.verified
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'TU_EMAIL@ejemplo.com';
```

**Si `email_confirmed_at` es NULL:**

Opción A - Desde Supabase UI:
1. Ve a **Authentication** > **Users**
2. Busca tu usuario
3. Haz clic en los tres puntos (...)
4. Selecciona "Confirm email"

Opción B - Desde SQL (solo desarrollo):
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'TU_EMAIL@ejemplo.com';
```

### **PASO 8: Verificar Configuración del Frontend**

1. Abre `supabase-client.js`
2. Verifica que las credenciales sean correctas:
   ```javascript
   const SUPABASE_URL = 'https://saqmbaanltvvidenvhow.supabase.co';
   const SUPABASE_ANON_KEY = 'sb_publishable_1jDDbu4bsfv9IihHc7fd5w_008ETkIV';
   ```
3. Compara con las credenciales en Supabase:
   - Ve a **Settings** > **API**
   - Verifica que `Project URL` coincida con `SUPABASE_URL`
   - Verifica que `anon public` key coincida con `SUPABASE_ANON_KEY`

## 🚨 Solución Rápida de Emergencia

Si nada de lo anterior funciona, ejecuta este script de "reset completo":

```sql
-- 1. Deshabilitar RLS temporalmente
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Ver todos los usuarios
SELECT * FROM public.users;

-- 3. Crear/actualizar usuario admin
INSERT INTO public.users (
    id,
    email,
    username,
    role,
    verified,
    created_at
)
SELECT 
    id,
    email,
    SPLIT_PART(email, '@', 1),
    'ADMIN',
    'VERIFICADO',
    created_at
FROM auth.users
WHERE email = 'TU_EMAIL@ejemplo.com'
ON CONFLICT (id) 
DO UPDATE SET 
    role = 'ADMIN',
    verified = 'VERIFICADO';

-- 4. Volver a habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Recrear políticas (ejecutar todo el bloque 2.4 de diagnose_and_fix_db.sql)
```

## 📞 Checklist Final

Antes de intentar hacer login de nuevo, verifica:

- [ ] RLS está habilitado en la tabla `users`
- [ ] Existen 5 políticas RLS activas
- [ ] Existe al menos un usuario con `role = 'ADMIN'`
- [ ] El usuario admin tiene `verified = 'VERIFICADO'`
- [ ] El email del usuario está confirmado (`email_confirmed_at` no es NULL)
- [ ] El usuario existe en AMBAS tablas: `auth.users` Y `public.users`
- [ ] Las credenciales de Supabase en el frontend son correctas
- [ ] El trigger automático está creado (para prevenir problemas futuros)

## 🔄 Próximos Pasos Después de Solucionar

Una vez que puedas hacer login:

1. **Verifica que puedes acceder al panel de admin**
2. **Prueba crear un usuario nuevo** para verificar que el trigger funciona
3. **Revisa los eventos** para asegurarte de que los datos se cargan correctamente
4. **Documenta qué solución funcionó** para referencia futura

## 💡 Prevención de Problemas Futuros

1. **Siempre usa el trigger automático** (`handle_new_user`) para crear perfiles
2. **No modifiques las políticas RLS** sin probarlas primero
3. **Mantén sincronizadas** las tablas `auth.users` y `public.users`
4. **Usa el SQL Editor** para verificar el estado de la BD regularmente

---

## 📝 Notas Adicionales

- Los scripts SQL creados son seguros y no borran datos
- Puedes ejecutarlos múltiples veces sin problemas (son idempotentes)
- Si tienes dudas, ejecuta primero solo las consultas SELECT para ver el estado actual
- Guarda estos scripts para futuras referencias

---

**¿Necesitas ayuda adicional?** Comparte los resultados de las consultas de diagnóstico y te ayudaré a interpretarlos.
