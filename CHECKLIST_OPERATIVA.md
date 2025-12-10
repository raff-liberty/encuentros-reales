# 📋 CHECKLIST OPERATIVA - RAMA DEV (SUPABASE)

Este documento detalla los pasos necesarios para tener la aplicación 100% operativa utilizando Supabase como backend.

## 🗄️ BASE DE DATOS (SUPABASE)

### 1. Tablas y Políticas de Seguridad (RLS)
- [ ] **Tabla `reviews`:**
  - Ejecutar `setup_reviews_table.sql` en el SQL Editor de Supabase.
  - Verificar que las políticas RLS permitan:
    - `INSERT` solo a usuarios autenticados (participantes y organizadores).
    - `SELECT` a todos (public) para calcular promedios.
- [ ] **Triggers de Puntuación:**
  - Ejecutar `update_rating_trigger.sql` para que el promedio de estrellas (`rating` en tabla `users`) se recalcule automáticamente al insertar una review.

### 2. Estados del Evento
- [ ] Verificar que la transición de estados funcione en DB:
  - `ACTIVO` -> `CERRADO` (Selección cerrada) -> `FINALIZADO` (Evento concluido).

---

## 💻 FRONTEND (app-new-complete.js)

### 3. Gestión de Candidatos (CRÍTICO)
- [ ] **Refactorizar `manageEventApplicants`:**
  - Actualmente usa `DataService` (mock). Cambiar a `SupabaseService.getEventApplications(eventId)`.
  - Asegurar que carga los perfiles de usuario reales desde Supabase.
- [ ] **Botones de Aceptación/Rechazo:**
  - Conectar los botones en la lista de candidatos con `SupabaseService.acceptApplicant` y `SupabaseService.updateApplicationStatus`.

### 4. Flujo de Finalización de Evento (Organizadores)
- [x] **Botón "Finalizar Evento" en `showEventDetail`:**
  - **Condición:** Mostrar solo si el usuario es el Organizador Y el evento no está ya finalizado.
  - **Acción:** Llamar a `SupabaseService.finalizeEvent(eventId)`.
  - **Feedback:** Mostrar confirmación y actualizar la vista visualmente (cambiar estado a "FINALIZADO").

### 5. Sistema de Valoraciones (Reviews)
- [x] **Modal de Valoración:**
  - Implementar lógica para abrir el modal `rate-modal`.
  - **Para Organizadores:** Listar a los participantes ACEPTADOS para valorar.
  - **Para Participantes:** Mostrar formulario para valorar a la ORGANIZADORA.
- [x] **Botón "Valorar" en `showEventDetail`:**
  - **Condición:** Mostrar solo si el evento está en estado `FINALIZADO` y el usuario participó (o es organizador).
  - **Acción:** Abrir el modal de valoración.
- [x] **Envío de Valoraciones:**
  - Conectar el formulario del modal con `SupabaseService.submitEventRatings`.

### 6. Notificaciones
- [ ] **Visualización:**
  - Asegurar que `loadNotifications` usa `SupabaseService.getNotificationsByUser`.
- [ ] **Acciones:**
  - Al hacer clic en una notificación (ej: "Has sido aceptado"), debe llevar al detalle del evento correspondiente.

---

## 🎨 UI/UX & LIMPIEZA

- [ ] **Eliminar Dependencias de `DataService`:**
  - Buscar y reemplazar cualquier llamada residual a `DataService` por `SupabaseService` o `AppState`.
- [ ] **Feedback Visual:**
  - Añadir Toast notifications (`app.showToast`) para todas las acciones de escritura (Aceptar candidato, Finalizar evento, Enviar review).

---

## 🚀 PASOS INMEDIATOS RECOMENDADOS

1.  **Ejecutar SQL:** Corre los scripts `setup_reviews_table.sql` y `update_rating_trigger.sql`.
2.  **Actualizar `showEventDetail`:** Añade la lógica condicional para los botones de "Finalizar" y "Valorar".
3.  **Implementar `openRateModal`:** Crea la función que preparará el formulario de votación.
