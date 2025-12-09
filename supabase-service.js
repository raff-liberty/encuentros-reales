const SupabaseService = {
    // ===== AUTENTICACIÓN =====
    async signUp(email, password, userData) {
        if (!supabaseClient) throw new Error('Supabase no está configurado');

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: userData // username, role, etc.
            }
        });

        if (error) throw error;

        // Crear perfil de usuario en la tabla 'users'
        // Nota: Esto también se puede manejar con Triggers en Supabase para más seguridad
        if (data.user) {
            const { error: profileError } = await supabaseClient
                .from('users')
                .insert([{
                    id: data.user.id,
                    email: email, // Usamos el email del input
                    ...userData,
                    created_at: new Date()
                }]);

            if (profileError) {
                console.error('Error creando perfil:', profileError);
                // No lanzamos error aquí para no bloquear el login, pero idealmente debería ser atómico
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

        return profile;
    },

    // ===== EVENTOS =====
    async getAllEvents() {
        const { data, error } = await supabaseClient
            .from('events')
            .select(`
                *,
                organizer:users (
                    username,
                    avatar,
                    rating
                )
            `)
            .eq('status', 'ACTIVO') // Solo eventos activos
            .order('date', { ascending: true });

        if (error) throw error;
        return data;
    },

    async getEventsByCreator(userId) {
        const { data, error } = await supabaseClient
            .from('events')
            .select('*')
            .eq('organizer_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async createEvent(eventData, organizerId) {
        const { data, error } = await supabaseClient
            .from('events')
            .insert([{
                ...eventData,
                organizer_id: organizerId,
                status: 'ACTIVO'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getEventById(eventId) {
        const { data, error } = await supabaseClient
            .from('events')
            .select(`
            *,
            organizer:users(*)
        `)
            .eq('id', eventId)
            .single();

        if (error) throw error;
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

        // 3. Crear notificación
        if (event) {
            await this.createNotification({
                user_id: event.organizer_id,
                type: 'NEW_APPLICATION',
                title: '🔔 Nueva candidatura',
                message: `Alguien se ha postulado a tu evento "${event.title}"`,
                related_id: eventId
            });
        }

        return data;
    },

    async getApplicationsByUser(userId) {
        const { data, error } = await supabaseClient
            .from('applications')
            .select(`
        *,
        event:events(*)
      `)
            .eq('user_id', userId)
            .order('applied_at', { ascending: false });

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

    async rejectApplicant(eventId, userId) {
        const { data, error } = await supabaseClient
            .from('applications')
            .update({ status: 'RECHAZADO' })
            .match({ event_id: eventId, user_id: userId })
            .select()
            .single();

        if (error) throw error;

        const { data: event } = await supabaseClient
            .from('events')
            .select('title')
            .eq('id', eventId)
            .single();

        if (event) {
            await this.createNotification({
                user_id: userId,
                type: 'APPLICATION_REJECTED',
                title: '❌ Candidatura no aceptada',
                message: `Tu candidatura para "${event.title}" no ha sido aceptada`,
                related_id: eventId
            });
        }

        return data;
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

    async createNotification(notifData) {
        const { data, error } = await supabaseClient
            .from('notifications')
            .insert([notifData])
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

    async markAllNotificationsAsRead(userId) {
        const { error } = await supabaseClient
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId);

        if (error) throw error;
    }
};

window.SupabaseService = SupabaseService;
