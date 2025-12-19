// ===== INICIALIZACIÓN DE SUPABASE =====
const SUPABASE_URL = 'https://saqmbaanltvvidenvhow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhcW1iYWFubHR2dmlkZW52aG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTAxNTEsImV4cCI6MjA4MDg4NjE1MX0.n6LHIyp6lIINIRzgzHYjLTWg2Sj_XeLRxc3car5XqLo';

// Inicializar cliente de Supabase
let supabaseClient = null;
if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabaseClient;
        console.log('✅ Cliente Supabase inicializado en supabase-service.js');
    } catch (e) {
        console.error('❌ Error inicializando Supabase:', e);
    }
} else {
    console.warn('⚠️ window.supabase no disponible aún. Se inicializará cuando esté listo.');
}

const SupabaseService = {
    // ===== AUTENTICACIÓN =====
    async signUp(email, password, userData) {
        if (!supabaseClient) throw new Error('Supabase no está configurado');

        // 1. Registrar usuario SIN las fotos en los metadatos (para evitar QuotaExceededError)
        // El trigger handle_new_user creará el perfil inicial
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: userData.username,
                    full_name: userData.full_name,
                    role: userData.role,
                    birth_date: userData.birth_date,
                    province: userData.province,
                    verified: userData.verified || 'PENDIENTE'
                    // NO enviamos verification_photos aquí
                }
            }
        });

        if (error) throw error;

        // 2. Subir las fotos usando una función RPC segura
        // Esto guarda las fotos directamente en public.users sin pasar por auth.users
        if (data.user && userData.verification_photos) {
            const { error: rpcError } = await supabaseClient
                .rpc('upload_verification_photos', {
                    photos: userData.verification_photos
                });

            if (rpcError) {
                console.error('Error subiendo fotos:', rpcError);
                // No bloqueamos el registro, pero logueamos el error
            }
        }

        return data.user;
    },

    async signIn(email, password) {
        if (!supabaseClient) throw new Error('Supabase no está configurado');

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Intentar obtener perfil completo
        let { data: profile, error: profileError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        // Si no existe perfil (error PGRST116), lo creamos ahora "on-the-fly"
        if (profileError && (profileError.code === 'PGRST116' || !profile)) {
            console.warn('Usuario sin perfil encontrado. Creando perfil por defecto...');

            // Usar metadatos guardados en auth si existen, o valores por defecto
            const metadata = data.user.user_metadata || {};

            const newProfile = {
                id: data.user.id,
                email: email,
                username: metadata.username || email.split('@')[0], // Fallback al email si no hay username
                role: metadata.role || 'BUSCADOR',                 // Fallback a BUSCADOR
                created_at: new Date()
            };

            const { data: createdProfile, error: createError } = await supabaseClient
                .from('users')
                .insert([newProfile])
                .select()
                .single();

            if (createError) {
                console.error('Error crítico creando perfil de recuperación:', createError);
                throw createError;
            }

            profile = createdProfile;
        } else if (profileError) {
            // Si es otro tipo de error, lanzarlo
            throw profileError;
        }

        // Normalizar avatar_url a avatar para compatibilidad con UI
        if (profile) {
            profile.avatar = profile.avatar_url || profile.avatar;
        }

        return profile;
    },

    async signOut() {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
    },

    async getCurrentUser() {
        if (!supabaseClient) return null;
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return null;

        const { data: profile } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        // Normalizar avatar_url a avatar
        if (profile) {
            profile.avatar = profile.avatar_url || profile.avatar;
        }

        return profile;
    },

    async getUserById(userId) {
        const { data: profile, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Normalizar avatar_url a avatar
        if (profile) {
            profile.avatar = profile.avatar_url || profile.avatar;
        }

        return profile;
    },

    async updateUser(userId, updates) {
        console.log('Intentando actualizar usuario:', userId, updates);
        const { data, error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error Supabase Update:', error);
            throw error;
        }
        return data;
    },

    // ===== STORAGE (ARCHIVOS) =====
    async uploadFile(bucket, path, file) {
        const { data, error } = await supabaseClient.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        // Obtener URL pública
        const { data: { publicUrl } } = supabaseClient.storage
            .from(bucket)
            .getPublicUrl(path);

        return publicUrl;
    },

    async deleteFile(bucket, path) {
        // path puede ser la URL completa o solo el path relativo
        // Si es URL completa, extraer path
        if (path.startsWith('http')) {
            const urlParts = path.split(`${bucket}/`);
            if (urlParts.length > 1) path = urlParts[1];
        }

        const { error } = await supabaseClient.storage
            .from(bucket)
            .remove([path]);

        if (error) throw error;
        return true;
    },

    // ===== EVENTOS =====
    async getAllEvents() {
        const { data, error } = await supabaseClient
            .from('events')
            .select(`
                *,
                organizer:users (
                    username,
                    avatar_url
                )
            `)
            .eq('status', 'ACTIVO') // Solo eventos activos
            .order('date', { ascending: true });

        if (error) throw error;

        // Normalizar avatar_url a avatar
        if (data) {
            data.forEach(event => {
                if (event.organizer) {
                    event.organizer.avatar = event.organizer.avatar_url || event.organizer.avatar;
                }
            });
        }

        return data;
    },

    // Función específica para Admin: Trae TODOS los eventos (no solo activos)
    async getAdminAllEvents() {
        const { data, error } = await supabaseClient
            .from('events')
            .select(`
                *,
                organizer:users (
                    username,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false }); // Ordenar por creación

        if (error) throw error;

        // Normalizar avatar_url a avatar
        if (data) {
            data.forEach(event => {
                if (event.organizer) {
                    event.organizer.avatar = event.organizer.avatar_url || event.organizer.avatar;
                }
            });
        }
        return data;
    },

    async getEventsByCreator(userId) {
        const { data, error } = await supabaseClient
            .from('events')
            .select(`
                *,
                applicants:applications(*)
            `)
            .eq('organizer_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getEventById(eventId) {
        const { data, error } = await supabaseClient
            .from('events')
            .select(`
                *,
                organizer:users (
                    username,
                    avatar_url
                )
            `)
            .eq('id', eventId)
            .single();

        if (error) throw error;

        // Normalizar avatar_url a avatar
        if (data && data.organizer) {
            data.organizer.avatar = data.organizer.avatar_url || data.organizer.avatar;
        }

        return data;
    },

    async createEvent(eventData, userId) {
        const { data, error } = await supabaseClient
            .from('events')
            .insert([{
                ...eventData,
                organizer_id: userId,
                status: 'ACTIVO'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateEvent(eventId, updates) {
        const { data, error } = await supabaseClient
            .from('events')
            .update(updates)
            .eq('id', eventId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteEvent(eventId) {
        const { error } = await supabaseClient
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) throw error;
        return true;
    },

    async getEventByIdFull(eventId) {
        const { data, error } = await supabaseClient
            .from('events')
            .select(`
            *,
            organizer:users(*)
        `)
            .eq('id', eventId)
            .single();

        if (error) throw error;

        // Normalizar avatar_url a avatar
        if (data && data.organizer) {
            data.organizer.avatar = data.organizer.avatar_url || data.organizer.avatar;
        }

        return data;
    },

    // ===== POSTULACIONES =====
    async createApplication(userId, eventId) {
        // 1. Crear la postulación
        const { data, error } = await supabaseClient
            .from('applications')
            .insert([{
                user_id: userId,
                event_id: eventId,
                status: 'PENDIENTE'
            }])
            .select()
            .single();

        if (error) throw error;

        // 2. Obtener info del evento para notificar al dueño
        const { data: event } = await supabaseClient
            .from('events')
            .select('organizer_id, title')
            .eq('id', eventId)
            .single();

        // 3. Crear notificación (no fallar si esto falla)
        if (event) {
            try {
                await this.createNotification({
                    user_id: event.organizer_id,
                    type: 'NEW_APPLICATION',
                    title: '🔔 Nueva candidatura',
                    message: `Alguien se ha postulado a tu evento "${event.title}"`,
                    related_id: eventId
                });
                console.log('✅ Notificación creada correctamente');
            } catch (notifError) {
                console.error('❌ Error creando notificación:', notifError);
                // No lanzar el error, la aplicación ya se creó exitosamente
            }
        }

        return data;
    },

    async getApplicationsByUser(userId) {
        const { data, error } = await supabaseClient
            .from('applications')
            .select(`
        *,
        event:events(
          *,
          organizer:organizer_id(*)
        )
      `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Obtener postulaciones para un evento específico (vista oferente)
    async getEventApplications(eventId) {
        const { data, error } = await supabaseClient
            .from('applications')
            .select(`
                *,
                applicant:users(*)
            `)
            .eq('event_id', eventId);

        if (error) throw error;
        return data;
    },

    async updateApplicationStatus(applicationId, newStatus, eventId) {
        // 1. Actualizar estado
        const { data, error } = await supabaseClient
            .from('applications')
            .update({ status: newStatus })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        // 2. Obtener info para notificar al usuario
        try {
            const { data: appData } = await supabaseClient
                .from('applications')
                .select(`
                    user_id,
                    event:events(title)
                `)
                .eq('id', applicationId)
                .single();

            if (appData && appData.event) {
                const message = newStatus === 'ACEPTADO'
                    ? `¡Felicidades! Has sido aceptado en el evento "${appData.event.title}"`
                    : `Tu solicitud para el evento "${appData.event.title}" ha sido rechazada`;

                await this.createNotification({
                    user_id: appData.user_id,
                    type: 'APPLICATION_STATUS',
                    title: newStatus === 'ACEPTADO' ? '✅ Solicitud Aceptada' : '❌ Solicitud Rechazada',
                    message: message,
                    related_id: eventId
                });
            }
        } catch (err) {
            console.error('Error enviando notificación de estado:', err);
        }

        return data;
    },

    async acceptApplicant(eventId, userId) {
        // 1. Actualizar estado
        const { data, error } = await supabaseClient
            .from('applications')
            .update({ status: 'ACEPTADO' })
            .match({ event_id: eventId, user_id: userId }) // Match ambas columnas
            .select()
            .single();

        if (error) throw error;

        // 2. Obtener info para notificar
        const { data: event } = await supabaseClient
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        // 3. Notificar
        if (event) {
            await this.createNotification({
                user_id: userId,
                type: 'APPLICATION_ACCEPTED',
                title: '✅ ¡Has sido aceptado!',
                message: `Has sido aceptado en "${event.title}". Fecha: ${event.date} a las ${event.time}. Ubicación: ${event.location}`,
                related_id: eventId
            });
        }

        return data;
    },

    // ===== GESTIÓN DE ETAPAS DEL EVENTO =====
    async closeEventSelection(eventId) {
        // 1. Actualizar estado a CERRADO
        const { data: event, error } = await supabaseClient
            .from('events')
            .update({ status: 'CERRADO' })
            .eq('id', eventId)
            .select()
            .single();

        if (error) throw error;

        // 2. Notificar a los PARTICIPANTES ACEPTADOS
        try {
            await this.notifyAcceptedParticipants(eventId, 'EVENT_SELECTION_CLOSED',
                '🔒 Selección Cerrada',
                `La selección para "${event.title}" ha finalizado. ¡Estás dentro! Prepárate para el evento.`
            );
        } catch (err) {
            console.error('Error notificando cierre:', err);
        }

        return event;
    },

    async finalizeEvent(eventId) {
        // 1. Actualizar estado del EVENTO a FINALIZADO
        const { data: event, error } = await supabaseClient
            .from('events')
            .update({ status: 'FINALIZADO' })
            .eq('id', eventId)
            .select()
            .single();

        if (error) throw error;

        // 2. Actualizar estado de las POSTULACIONES 'ACEPTADO' a 'FINALIZADO'
        const { error: appError } = await supabaseClient
            .from('applications')
            .update({ status: 'FINALIZADO' })
            .eq('event_id', eventId)
            .eq('status', 'ACEPTADO');

        if (appError) console.error('Error actualizando postulaciones a finalizado:', appError);

        // 3. Notificar a los PARTICIPANTES (ahora en estado FINALIZADO)
        try {
            // Nota: notifyAcceptedParticipants busca por 'ACEPTADO', necesitamos que busque también 'FINALIZADO' 
            // o mejor, actualizamos la función de notificación para ser más flexible, 
            // pero para no romper nada, haremos la query manual aquí o ajustaremos notifyAcceptedParticipants.
            // Dado que acabamos de cambiarlos a FINALIZADO, notifyAcceptedParticipants(..., 'ACEPTADO') ya no los encontrará.

            // Re-implementamos notificación manual para este caso específico
            const { data: participants } = await supabaseClient
                .from('applications')
                .select('user_id')
                .eq('event_id', eventId)
                .eq('status', 'FINALIZADO');

            if (participants && participants.length > 0) {
                const notifications = participants.map(app => ({
                    user_id: app.user_id,
                    type: 'EVENT_FINISHED',
                    title: '🏁 Evento Finalizado',
                    message: `El evento "${event.title}" ha finalizado. ¡No olvides valorar a la organizadora!`,
                    related_id: eventId,
                    read: false
                }));
                await supabaseClient.from('notifications').insert(notifications);
            }

        } catch (err) {
            console.error('Error notificando finalización:', err);
        }

        return event;
    },

    async submitEventRatings(ratings) {
        if (!ratings || ratings.length === 0) return;

        const { error } = await supabaseClient
            .from('reviews')
            .insert(ratings);

        if (error) throw error;
    },

    async notifyAcceptedParticipants(eventId, type, title, message) {
        // Obtener IDs de usuarios aceptados
        const { data: applications } = await supabaseClient
            .from('applications')
            .select('user_id')
            .eq('event_id', eventId)
            .eq('status', 'ACEPTADO');

        if (!applications || applications.length === 0) return;

        const notifications = applications.map(app => ({
            user_id: app.user_id,
            type: type,
            title: title,
            message: message,
            related_id: eventId,
            read: false
        }));

        const { error } = await supabaseClient
            .from('notifications')
            .insert(notifications);

        if (error) throw error;
    },

    // ===== NOTIFICACIONES =====
    async getNotificationsByUser(userId) {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async createNotification(notification) {
        const { data, error } = await supabaseClient
            .from('notifications')
            .insert([notification])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async markNotificationAsRead(notificationId) {
        const { error } = await supabaseClient
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    async getReviewsByReviewer(reviewerId) {
        const { data, error } = await supabaseClient
            .from('reviews')
            .select('*')
            .eq('reviewer_id', reviewerId);

        if (error) throw error;
        return data;
    },

    async getReviewsByReviewed(reviewedId) {
        const { data, error } = await supabaseClient
            .from('reviews')
            .select(`
                *,
                reviewer:reviewer_id (username),
                event:event_id (title, gangbang_level)
            `)
            .eq('reviewed_id', reviewedId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async markAllNotificationsAsRead(userId) {
        const { error } = await supabaseClient
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId);

        if (error) throw error;
    },

    // ===== ADMIN USER MANAGEMENT =====
    async getUsersByStatus(status) {
        // Obtenemos los usuarios filtrados por columna 'verified'
        // Nota: Asegúrate de que la columna existe en tu tabla 'users'
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('verified', status)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Normalizar avatar
        if (data) {
            data.forEach(u => {
                u.avatar = u.avatar_url || u.avatar;
            });
        }
        return data;
    },

    async getAllUsers() {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Normalizar avatar
        if (data) {
            data.forEach(u => {
                u.avatar = u.avatar_url || u.avatar;
            });
        }
        return data;
    },

    async verifyUser(userId, newStatus) {
        const updates = { verified: newStatus };

        // Si se aprueba o rechaza, eliminar las fotos de verificación por privacidad
        if (newStatus === 'VERIFICADO' || newStatus === 'RECHAZADO') {
            updates.verification_photos = {};
        }

        const { data, error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteUser(userId) {
        // Primero eliminar de public.users
        const { error } = await supabaseClient
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        // NOTA: Eliminar de auth.users requiere usar la API de administración de Supabase
        // que no está disponible directamente en el cliente JS con anon key por seguridad.
        // Pero con el trigger 'on delete cascade' (si está configurado) o manualmente desde el dashboard se limpia.
        // Aquí solo borramos el perfil público.
        return true;
    },

    // Delete user account and all associated data (GDPR compliance)
    async deleteAccount(userId) {
        try {
            // 1. Delete user's gallery images from storage
            const { data: files } = await supabaseClient.storage
                .from('gallery')
                .list(userId);

            if (files && files.length > 0) {
                const filesToDelete = files.map(file => `${userId}/${file.name}`);
                await supabaseClient.storage
                    .from('gallery')
                    .remove(filesToDelete);
            }

            // 2. Delete user's events (cascade will delete applications)
            await supabaseClient
                .from('events')
                .delete()
                .eq('organizer_id', userId);

            // 3. Delete user's applications
            await supabaseClient
                .from('applications')
                .delete()
                .eq('user_id', userId);

            // 4. Delete user's notifications
            await supabaseClient
                .from('notifications')
                .delete()
                .eq('user_id', userId);

            // 5. Delete user's blog posts
            await supabaseClient
                .from('blog_posts')
                .delete()
                .eq('author_id', userId);

            // 6. Delete user profile
            await supabaseClient
                .from('users')
                .delete()
                .eq('id', userId);

            // 7. Sign out user
            await supabaseClient.auth.signOut();

            return { success: true };
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    },

    // ===== BLOG =====
    // Blog: Get all published posts
    async getAllBlogPosts() {
        const { data, error } = await supabaseClient
            .from('blog_posts')
            .select('*, author:users(username, avatar_url)')
            .eq('published', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Blog: Get single post by ID
    async getBlogPostById(id) {
        const { data, error } = await supabaseClient
            .from('blog_posts')
            .select('*, author:users(username, avatar_url)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Blog: Get all posts for admin (published and drafts)
    async getAdminBlogPosts() {
        const { data, error } = await supabaseClient
            .from('blog_posts')
            .select('*, author:users(username, avatar_url)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Blog: Create new post (admin)
    async createBlogPost(postData) {
        if (!postData.slug && postData.title) {
            postData.slug = postData.title
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }

        const { data, error } = await supabaseClient
            .from('blog_posts')
            .insert([postData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Blog: Update post (admin)
    async updateBlogPost(postId, updates) {
        const { data, error } = await supabaseClient
            .from('blog_posts')
            .update(updates)
            .eq('id', postId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Blog: Delete post (admin)
    async deleteBlogPost(postId) {
        const { error } = await supabaseClient
            .from('blog_posts')
            .delete()
            .eq('id', postId);

        if (error) throw error;
        return true;
    },

    // Blog: Toggle publish status (admin)
    async toggleBlogPostPublish(postId) {
        const { data: post, error: fetchError } = await supabaseClient
            .from('blog_posts')
            .select('published')
            .eq('id', postId)
            .single();

        if (fetchError) throw fetchError;

        const { data, error } = await supabaseClient
            .from('blog_posts')
            .update({ published: !post.published })
            .eq('id', postId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

window.SupabaseService = SupabaseService;
