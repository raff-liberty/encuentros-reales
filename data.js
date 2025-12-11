// ===== DATA LAYER =====
// This simulates a backend database. In production, this would be replaced with API calls.

const DB = {
    users: [
        {
            id: 'admin-1',
            email: 'admin@encuentros.com',
            password: 'admin123',
            username: 'Admin',
            role: 'ADMIN',
            verified: 'VERIFICADO', // Nuevo estado
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            age: null,
            bio: '',
            searchZones: [],
            rating: 5.0,
            reviewsCount: 0,
            reviews: [],
            zone: 'centro',
            created_at: new Date('2024-01-01').toISOString() // Date normalized
        },
        {
            id: 'user-1',
            email: 'oferente@test.com',
            password: 'test123',
            username: 'Luna_Sensual',
            role: 'OFERENTE', // Nuevo rol
            verified: 'VERIFICADO',
            fullName: 'Luna Gomez', // Nuevo campo
            province: 'Madrid', // Nuevo campo
            birthDate: '1995-05-15', // Nuevo campo
            verificationPhotos: { face: '', id: '' }, // Nuevo campo
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna',
            age: 28,
            bio: 'Organizadora de eventos exclusivos. Busco calidad sobre cantidad.',
            searchZones: ['norte', 'centro'],
            rating: 4.8,
            reviewsCount: 12,
            reviews: [],
            zone: 'norte',
            created_at: new Date('2024-06-15').toISOString()
        },
        {
            id: 'user-2',
            email: 'buscador@test.com',
            password: 'test123',
            username: 'Marco_Intenso',
            role: 'BUSCADOR',
            verified: 'VERIFICADO',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marco',
            gallery: [
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
            ],
            age: 32,
            bio: 'Participante experimentado y respetuoso. Busco experiencias auténticas y conexiones reales.',
            searchZones: ['sur', 'centro', 'este'],
            rating: 4.5,
            reviewsCount: 8,
            reviews: [
                { eventId: 'event-1', rating: 5, comment: 'Excelente participante, muy respetuoso', date: new Date('2024-11-01'), reviewerUsername: 'Luna_Sensual' },
                { eventId: 'event-2', rating: 4, comment: 'Buen comportamiento', date: new Date('2024-10-15'), reviewerUsername: 'Luna_Sensual' }
            ],
            zone: 'sur',
            createdAt: new Date('2024-08-20')
        }
    ],

    events: [
        {
            id: 'event-1',
            title: 'Encuentro Nocturno Premium',
            description: 'Evento exclusivo para personas verificadas. Ambiente relajado y respetuoso. Se valorará la puntualidad y el respeto mutuo.',
            gangbangLevel: 'TRADICIONAL',
            date: '2024-12-15',
            time: '21:00',
            capacity: 8,
            zone: 'norte',
            location: 'Calle Ejemplo 123, Madrid',
            rules: 'Uso obligatorio de protección. Respeto absoluto. Higiene impecable. Puntualidad.',
            status: 'ACTIVO',
            organizerId: 'user-1',
            createdAt: new Date('2024-12-01'),
            applicants: [
                { userId: 'user-2', status: 'PENDIENTE', appliedAt: new Date('2024-12-02') }
            ],
            accepted: [],
            ratings: []
        },
        {
            id: 'event-2',
            title: 'Experiencia Intensa',
            description: 'Para participantes experimentados. Dinámica dirigida con rol sumiso claro. Solo usuarios con buena reputación.',
            gangbangLevel: 'SUMISO',
            date: '2024-12-20',
            time: '22:30',
            capacity: 6,
            zone: 'centro',
            location: 'Avenida Principal 456, Madrid',
            rules: 'Experiencia previa requerida. Respeto a los límites. Comunicación clara.',
            status: 'ACTIVO',
            organizerId: 'user-1',
            createdAt: new Date('2024-12-03'),
            applicants: [],
            accepted: [],
            ratings: []
        },
        {
            id: 'event-3',
            title: 'Encuentro Organizado',
            description: 'Evento con estructura clara, turnos definidos y tiempos establecidos. Ideal para quienes prefieren orden y control.',
            gangbangLevel: 'ESTRUCTURADO',
            date: '2024-12-18',
            time: '20:00',
            capacity: 10,
            zone: 'este',
            location: 'Plaza Mayor 789, Madrid',
            rules: 'Seguir el orden establecido. Respetar los tiempos. Máxima higiene.',
            status: 'ACTIVO',
            organizerId: 'user-1',
            createdAt: new Date('2024-12-05'),
            applicants: [],
            accepted: [],
            ratings: []
        }
    ],

    notifications: [],

    auditLog: []
};

// ===== HELPER FUNCTIONS =====
const DataService = {
    // Inicialización - Cargar datos desde localStorage
    init() {
        console.log('🔄 Inicializando DataService...');

        // Guardar eventos hardcodeados originales
        const hardcodedEvents = [...DB.events];

        // Cargar eventos guardados
        const savedEvents = localStorage.getItem('events');
        if (savedEvents) {
            try {
                const events = JSON.parse(savedEvents);
                // Convertir fechas de string a Date objects
                events.forEach(event => {
                    if (event.createdAt) event.createdAt = new Date(event.createdAt);
                    if (event.applicants) {
                        event.applicants.forEach(app => {
                            if (app.appliedAt) app.appliedAt = new Date(app.appliedAt);
                        });
                    }
                });

                // Combinar eventos: primero los guardados, luego los hardcodeados que no estén duplicados
                const savedEventIds = new Set(events.map(e => e.id));
                const uniqueHardcoded = hardcodedEvents.filter(e => !savedEventIds.has(e.id));
                DB.events = [...events, ...uniqueHardcoded];

                console.log(`✅ Cargados ${events.length} eventos desde localStorage`);
            } catch (e) {
                console.error('❌ Error loading events from localStorage:', e);
            }
        } else {
            console.log('ℹ️ No hay eventos guardados en localStorage');
        }

        // Cargar notificaciones guardadas
        const savedNotifications = localStorage.getItem('notifications');
        if (savedNotifications) {
            try {
                const notifications = JSON.parse(savedNotifications);
                // Convertir fechas de string a Date objects
                notifications.forEach(notif => {
                    if (notif.createdAt) notif.createdAt = new Date(notif.createdAt);
                });
                DB.notifications = notifications;
                console.log(`✅ Cargadas ${notifications.length} notificaciones desde localStorage`);
            } catch (e) {
                console.error('❌ Error loading notifications from localStorage:', e);
            }
        }

        console.log(`📊 Total eventos disponibles: ${DB.events.length}`);
    },

    // User Management
    getUserByEmail(email) {
        return DB.users.find(u => u.email === email);
    },

    getUserById(id) {
        return DB.users.find(u => u.id === id);
    },

    getUserByUsername(username) {
        return DB.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    },

    authenticate(email, password) {
        const user = this.getUserByEmail(email);
        if (user && user.password === password) {
            return user;
        }
        return null;
    },

    createUser(userData) {
        // Check if username already exists
        const existingUsername = DB.users.find(u => u.username.toLowerCase() === userData.username.toLowerCase());
        if (existingUsername) {
            throw new Error('Este nombre de usuario ya está en uso');
        }

        const newUser = {
            id: 'user-' + Date.now(),
            ...userData,
            verified: 'PENDIENTE',
            avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
            gallery: userData.gallery || [],
            age: userData.age || null,
            bio: userData.bio || '',
            searchZones: userData.searchZones || [],
            rating: 0,
            reviewsCount: 0,
            reviews: [],
            createdAt: new Date()
        };
        DB.users.push(newUser);
        this.addAuditLog('USER_CREATED', newUser.id, { email: newUser.email, role: newUser.role });
        return newUser;
    },

    updateUser(userId, updates) {
        const userIndex = DB.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            DB.users[userIndex] = { ...DB.users[userIndex], ...updates };
            this.addAuditLog('USER_UPDATED', userId, updates);
            return DB.users[userIndex];
        }
        return null;
    },

    // Event Management
    getAllEvents() {
        return DB.events.filter(e => e.status !== 'FINALIZADO');
    },

    getEventById(id) {
        return DB.events.find(e => e.id === id);
    },

    getEventsByCreator(userId) {
        return DB.events.filter(e => e.organizerId === userId);
    },

    createEvent(eventData, organizerId) {
        const newEvent = {
            id: 'event-' + Date.now(),
            ...eventData,
            status: 'ACTIVO',
            organizerId,
            createdAt: new Date(),
            applicants: [],
            accepted: [],
            ratings: []
        };
        DB.events.push(newEvent);

        // Guardar en localStorage
        localStorage.setItem('events', JSON.stringify(DB.events));

        this.addAuditLog('EVENT_CREATED', organizerId, { eventId: newEvent.id, title: newEvent.title });
        return newEvent;
    },

    updateEvent(eventId, updates) {
        const eventIndex = DB.events.findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
            DB.events[eventIndex] = { ...DB.events[eventIndex], ...updates };
            this.addAuditLog('EVENT_UPDATED', eventId, updates);
            return DB.events[eventIndex];
        }
        return null;
    },

    // Application Management
    applyToEvent(eventId, userId) {
        const event = this.getEventById(eventId);
        if (!event || event.status !== 'ABIERTO') return false;

        const alreadyApplied = event.applicants.some(a => a.userId === userId);
        if (alreadyApplied) return false;

        event.applicants.push({
            userId,
            status: 'PENDIENTE',
            appliedAt: new Date()
        });

        this.addAuditLog('APPLICATION_SUBMITTED', userId, { eventId });
        this.sendNotification(event.creatorId, 'Nueva postulación', `Tienes un nuevo candidato para "${event.title}"`);
        this.sendNotification(userId, 'Postulación registrada', `Tu postulación a "${event.title}" ha sido registrada`);

        return true;
    },

    createApplication(data) {
        const { userId, eventId } = data;
        const event = this.getEventById(eventId);
        if (!event || event.status !== 'ABIERTO') return null;

        const alreadyApplied = event.applicants.some(a => a.userId === userId);
        if (alreadyApplied) return null;

        const application = {
            userId,
            eventId,
            status: 'PENDIENTE',
            appliedAt: new Date()
        };

        event.applicants.push(application);

        this.addAuditLog('APPLICATION_SUBMITTED', userId, { eventId });
        this.sendNotification(event.creatorId, 'Nueva postulación', `Tienes un nuevo candidato para "${event.title}"`);
        this.sendNotification(userId, 'Postulación registrada', `Tu postulación a "${event.title}" ha sido registrada`);

        return application;
    },

    getApplicationsByUser(userId) {
        const applications = [];
        DB.events.forEach(event => {
            const applicant = event.applicants.find(a => a.userId === userId);
            if (applicant) {
                applications.push({
                    ...applicant,
                    eventId: event.id
                });
            }
        });
        return applications;
    },

    acceptApplicant(eventId, userId) {
        const event = this.getEventById(eventId);
        if (!event) return false;

        const applicant = event.applicants.find(a => a.userId === userId);
        if (!applicant) return false;

        applicant.status = 'ACEPTADO';
        event.accepted.push(userId);

        this.addAuditLog('APPLICANT_ACCEPTED', event.organizerId, { eventId, userId });
        this.addAuditLog('GRANT_CONTACT', event.organizerId, { eventId, userId });
        this.sendNotification(userId, 'Postulación aceptada', `Has sido aceptado en "${event.title}". Ubicación: ${event.location}`);

        return true;
    },

    rejectApplicant(eventId, userId) {
        const event = this.getEventById(eventId);
        if (!event) return false;

        const applicant = event.applicants.find(a => a.userId === userId);
        if (!applicant) return false;

        applicant.status = 'RECHAZADO';

        // Guardar en localStorage
        localStorage.setItem('events', JSON.stringify(DB.events));

        this.addAuditLog('APPLICANT_REJECTED', event.organizerId, { eventId, userId });
        this.sendNotification(userId, 'Postulación rechazada', `Tu postulación a "${event.title}" ha sido rechazada`);

        return true;
    },

    closeApplications(eventId) {
        const event = this.getEventById(eventId);
        if (!event) return false;

        event.status = 'POSTULACIONES_CERRADAS';

        // Reject all pending applications
        event.applicants.forEach(applicant => {
            if (applicant.status === 'PENDIENTE') {
                applicant.status = 'RECHAZADO';
                this.sendNotification(applicant.userId, 'Postulaciones cerradas', `Las postulaciones para "${event.title}" se han cerrado`);
            }
        });

        this.addAuditLog('APPLICATIONS_CLOSED', event.organizerId, { eventId });

        return true;
    },

    finishEvent(eventId, ratings) {
        const event = this.getEventById(eventId);
        if (!event) return false;

        event.status = 'FINALIZADO';
        event.ratings = ratings;

        // Update user ratings
        const reviewer = this.getUserById(event.organizerId);
        ratings.forEach(rating => {
            const user = this.getUserById(rating.userId);
            if (user) {
                user.reviews.push({
                    eventId,
                    rating: rating.stars,
                    comment: rating.comment,
                    date: new Date(),
                    reviewerUsername: reviewer ? reviewer.username : 'Anónimo'
                });

                // Recalculate average rating
                const totalStars = user.reviews.reduce((sum, r) => sum + r.rating, 0);
                user.rating = totalStars / user.reviews.length;
                user.reviewsCount = user.reviews.length;
            }
        });

        this.addAuditLog('EVENT_FINISHED', event.organizerId, { eventId, ratingsCount: ratings.length });

        return true;
    },

    // Notification Management
    sendNotification(userId, title, message) {
        DB.notifications.push({
            id: 'notif-' + Date.now(),
            userId,
            title,
            message,
            read: false,
            createdAt: new Date()
        });
    },

    getUserNotifications(userId) {
        return DB.notifications.filter(n => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
    },

    // Alias para compatibilidad
    getNotificationsByUser(userId) {
        return this.getUserNotifications(userId);
    },

    createNotification(data) {
        const notification = {
            id: 'notif-' + Date.now(),
            userId: data.userId,
            type: data.type || 'INFO',
            title: data.title,
            message: data.message,
            relatedId: data.relatedId || null,
            read: false,
            createdAt: new Date()
        };
        DB.notifications.push(notification);

        // Guardar en localStorage
        localStorage.setItem('notifications', JSON.stringify(DB.notifications));

        return notification;
    },

    markNotificationAsRead(notificationId) {
        const notification = DB.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            // Guardar en localStorage
            localStorage.setItem('notifications', JSON.stringify(DB.notifications));
            return true;
        }
        return false;
    },

    // Audit Log
    addAuditLog(action, userId, data) {
        DB.auditLog.push({
            id: 'audit-' + Date.now(),
            action,
            userId,
            data,
            timestamp: new Date()
        });
    },

    getAuditLog(filters = {}) {
        let logs = [...DB.auditLog];

        if (filters.userId) {
            logs = logs.filter(l => l.userId === filters.userId);
        }

        if (filters.action) {
            logs = logs.filter(l => l.action === filters.action);
        }

        if (filters.startDate) {
            logs = logs.filter(l => l.timestamp >= filters.startDate);
        }

        if (filters.endDate) {
            logs = logs.filter(l => l.timestamp <= filters.endDate);
        }

        return logs.sort((a, b) => b.timestamp - a.timestamp);
    },

    // Admin Functions
    getAllUsers() {
        return DB.users;
    },

    deleteUser(userId) {
        const index = DB.users.findIndex(u => u.id === userId);
        if (index !== -1) {
            const user = DB.users[index];
            DB.users.splice(index, 1);
            this.addAuditLog('USER_DELETED', 'ADMIN', { userId, email: user.email });
            return true;
        }
        return false;
    },

    deleteEvent(eventId) {
        const index = DB.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            const event = DB.events[index];
            DB.events.splice(index, 1);
            this.addAuditLog('EVENT_DELETED', 'ADMIN', { eventId, title: event.title });
            return true;
        }
        return false;
    },

    getStats() {
        return {
            totalUsers: DB.users.length,
            verifiedUsers: DB.users.filter(u => u.verified === 'VERIFICADO').length,
            pendingUsers: DB.users.filter(u => u.verified === 'PENDIENTE').length,
            totalEvents: DB.events.length,
            openEvents: DB.events.filter(e => e.status === 'ABIERTO').length,
            finishedEvents: DB.events.filter(e => e.status === 'FINALIZADO').length,
            totalApplications: DB.events.reduce((sum, e) => sum + e.applicants.length, 0),
            acceptanceRate: this.calculateAcceptanceRate()
        };
    },

    calculateAcceptanceRate() {
        const totalApplicants = DB.events.reduce((sum, e) => sum + e.applicants.length, 0);
        const acceptedApplicants = DB.events.reduce((sum, e) => sum + e.applicants.filter(a => a.status === 'ACEPTADO').length, 0);
        return totalApplicants > 0 ? ((acceptedApplicants / totalApplicants) * 100).toFixed(1) : 0;
    }
};

// Export for use in app.js
window.DB = DB;
window.DataService = DataService;
