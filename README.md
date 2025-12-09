# Encuentros Reales 🔞

> Plataforma moderna para encuentros entre adultos.
> **Estado:** 🟢 Desplegado en Vercel.
Auténticos

## 🔥 Descripción

Plataforma web completa para facilitar encuentros reales entre adultos verificados. Sistema robusto con verificación de usuarios, gestión de eventos con niveles de gangbang, sistema de reputación y panel administrativo completo.

## ✨ Características Principales

### 1. **Sistema de Usuarios**
- ✅ Registro con verificación obligatoria
- ✅ Roles fijos: OFERENTE, BUSCADOR, ADMIN
- ✅ Sistema de reputación con valoraciones (1-5 estrellas)
- ✅ Perfiles públicos con historial completo
- ✅ Avatares únicos generados automáticamente

### 2. **Niveles de Gangbang**
Cada evento debe declarar uno de estos tres niveles:

- **🌊 Tradicional**: Fluido, espontáneo, sin turnos fijos
- **⚡ Sumiso (Potenciado)**: Rol sumiso, iniciativa de participantes
- **📋 Estructurado**: Orden, turnos y tiempos definidos

### 3. **Gestión de Eventos (OFERENTE)**
- Crear eventos con todos los detalles
- Recibir y gestionar postulaciones
- Aceptar/rechazar candidatos individualmente
- Ver perfiles completos con historial de valoraciones
- Cerrar postulaciones cuando esté lista la lista
- Marcar eventos como finalizados
- Valorar a cada participante (obligatorio)

### 4. **Postulación a Eventos (BUSCADOR)**
- Ver todos los eventos disponibles
- Filtrar por nivel de gangbang y zona
- Postularse a eventos de interés
- Recibir notificaciones de aceptación/rechazo
- Acceso a ubicación exacta solo si es aceptado
- Construir reputación con valoraciones

### 5. **Panel de Administración**
- Vista completa de usuarios y eventos
- Estadísticas en tiempo real
- Gestión de usuarios (eliminar, suspender)
- Gestión de eventos (eliminar, modificar)
- Registro de auditoría completo
- Métricas de aceptación y uso

### 6. **Sistema de Notificaciones**
- Notificaciones automáticas por email (simuladas)
- Alertas en tiempo real
- Historial de notificaciones

### 7. **Auditoría y Seguridad**
- Registro completo de todas las acciones
- Trazabilidad de acceso a datos sensibles
- Control de revelación de contactos
- Logs exportables para compliance

## 🚀 Cómo Usar

### Opción 1: Abrir directamente
1. Abre el archivo `index.html` en tu navegador
2. ¡Listo! La aplicación está funcionando

### Opción 2: Servidor local (recomendado)
```bash
# Si tienes Python instalado
python -m http.server 8000

# Si tienes Node.js instalado
npx serve
```

Luego abre: `http://localhost:8000`

## 👤 Usuarios de Prueba

### Admin
- **Email**: admin@encuentros.com
- **Password**: admin123
- **Rol**: ADMIN (acceso completo)

### Oferente
- **Email**: oferente@test.com
- **Password**: test123
- **Rol**: OFERENTE (puede crear eventos)

### Buscador
- **Email**: buscador@test.com
- **Password**: test123
- **Rol**: BUSCADOR (puede postularse a eventos)

## 📋 Flujo Completo del Sistema

### Para OFERENTES:
1. **Registro** → Verificación → Perfil activo
2. **Crear Evento** → Definir nivel de gangbang, fecha, capacidad, reglas
3. **Recibir Postulaciones** → Ver perfiles con historial completo
4. **Aceptar/Rechazar** → Gestionar lista de asistentes
5. **Cerrar Postulaciones** → Confirmar lista final
6. **Realizar Encuentro** → (fuera de la app)
7. **Marcar como Finalizado** → Valorar a cada participante
8. **Reputación Actualizada** → Las valoraciones quedan permanentes

### Para BUSCADORES:
1. **Registro** → Verificación → Perfil activo
2. **Explorar Eventos** → Filtrar por nivel y zona
3. **Postularse** → Enviar solicitud
4. **Esperar Decisión** → Notificación de aceptación/rechazo
5. **Si Aceptado** → Acceso a ubicación exacta y contacto
6. **Asistir al Encuentro** → (fuera de la app)
7. **Recibir Valoración** → Construir reputación

### Para ADMIN:
- Monitoreo completo de usuarios y eventos
- Gestión de verificaciones
- Eliminación de usuarios/eventos problemáticos
- Auditoría de todas las acciones
- Estadísticas y métricas

## 🎨 Diseño

- **Tema oscuro premium** con gradientes vibrantes
- **Animaciones suaves** y micro-interacciones
- **Diseño responsive** para móvil y desktop
- **Glassmorphism** y efectos modernos
- **Tipografía profesional** (Inter)

## 🔒 Seguridad y Privacidad

- Ubicación exacta solo visible para aceptados
- Datos de contacto protegidos
- Sistema de verificación obligatorio
- Registro de auditoría completo
- Control de acceso por roles

## 📊 Datos Incluidos

La aplicación incluye datos de demostración:
- 3 usuarios (admin, oferente, buscador)
- 3 eventos de ejemplo (uno de cada nivel)
- Valoraciones de muestra
- Historial de auditoría

## 🛠️ Tecnologías

- **HTML5** - Estructura semántica
- **CSS3** - Diseño moderno con variables CSS
- **JavaScript Vanilla** - Lógica de aplicación
- **LocalStorage** - Persistencia de sesión
- **API de Dicebear** - Generación de avatares

## 📝 Próximos Pasos (Producción)

Para llevar esto a producción necesitarías:

1. **Backend Real**:
   - Node.js + Express o Python + FastAPI
   - Base de datos (PostgreSQL, MongoDB)
   - API REST o GraphQL

2. **Autenticación**:
   - JWT tokens
   - OAuth 2.0
   - Verificación de email real

3. **Almacenamiento**:
   - Subida de fotos reales (AWS S3, Cloudinary)
   - Verificación de identidad con documentos

4. **Notificaciones**:
   - Email real (SendGrid, AWS SES)
   - SMS (Twilio)
   - Push notifications

5. **Seguridad**:
   - HTTPS obligatorio
   - Rate limiting
   - CAPTCHA
   - Encriptación de datos sensibles

6. **Compliance**:
   - GDPR compliance
   - Términos y condiciones
   - Política de privacidad
   - Verificación de edad real

## 📄 Licencia

Este es un proyecto de demostración. Todos los derechos reservados.

## ⚠️ Advertencia

Esta es una aplicación de demostración con datos simulados. Para uso en producción se requiere:
- Verificación real de identidad
- Sistema de pagos (si aplica)
- Moderación humana
- Cumplimiento legal completo
- Infraestructura de seguridad robusta

---

**Creado con 🔥 para demostrar capacidades de desarrollo web moderno**
