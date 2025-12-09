// ===== ESTADO DE LA APLICACIÓN =====
const AppState = {
    currentUser: null,
    currentView: 'explore',
    favorites: [],
    filters: {
        type: '',
        zone: ''
    }
};

// ===== APLICACIÓN PRINCIPAL =====
const app = {
    // ===== INICIALIZACIÓN =====
    async init() {
        console.log('🚀 Inicializando Encuentros Reales (versión Supabase)...');

        // Verificar sesión de Supabase
        if (window.supabaseClient) {
            const { data: { session } } = await supabaseClient.auth.getSession();

            if (session) {
                console.log('✅ Sesión recuperada:', session.user.email);
                try {
                    // Obtener perfil completo
                    const { data: profile } = await supabaseClient
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profile) {
                        AppState.currentUser = profile;
                        console.log('👤 Perfil cargado:', profile.username);
                        this.showApp();
                        return;
                    }
                } catch (e) {
                    console.error('Error cargando perfil:', e);
                }
            }
        }

        // Inicializar DataService legacy como fallback (opcional)
        // DataService.init();

        // Verificar sesión guardada (Legacy localStorage fallback)
        /*
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            AppState.currentUser = JSON.parse(savedUser);
            this.showApp();
            return;
        }
        */

        // Cargar favoritos
        const savedFavorites = localStorage.getItem('favorites');
        if (savedFavorites) {
            AppState.favorites = JSON.parse(savedFavorites);
        }

        // Event listeners
        this.setupEventListeners();

        console.log('✅ Aplicación inicializada');
    },

    setupEventListeners() {
        // Formulario de autenticación
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuth();
            });
        }

        // Formulario de crear evento
        const createEventForm = document.getElementById('create-event-form');
        if (createEventForm) {
            createEventForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateEvent();
            });
        }

        // Prevenir navegación por defecto en tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
            });
        });
    },

    // ===== SPLASH SCREEN =====
    closeSplash() {
        document.getElementById('splash-screen').classList.remove('active');
        document.getElementById('auth-modal').classList.add('active');
    },

    // ===== AUTENTICACIÓN =====
    toggleAuthMode() {
        const title = document.getElementById('auth-title');
        const submitBtn = document.getElementById('auth-submit');
        const toggleText = document.getElementById('auth-toggle-text');
        const toggleLink = document.getElementById('auth-toggle-link');
        const nameGroup = document.getElementById('name-group');
        const roleGroup = document.getElementById('role-group');

        const isLogin = title.textContent === 'Iniciar Sesión';

        if (isLogin) {
            title.textContent = 'Crear Cuenta';
            submitBtn.textContent = 'Registrarse';
            toggleText.textContent = '¿Ya tienes cuenta?';
            toggleLink.textContent = 'Inicia sesión';
            nameGroup.classList.remove('hidden');
            roleGroup.classList.remove('hidden');
            // Reset form
            document.getElementById('auth-form').reset();
        } else {
            title.textContent = 'Iniciar Sesión';
            submitBtn.textContent = 'Entrar';
            toggleText.textContent = '¿No tienes cuenta?';
            toggleLink.textContent = 'Regístrate';
            nameGroup.classList.add('hidden');
            roleGroup.classList.add('hidden');
            // Reset form
            document.getElementById('auth-form').reset();
        }
    },

    async handleAuth(event) {
        event.preventDefault();

        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const isLogin = document.getElementById('auth-title').textContent === 'Iniciar Sesión';

        try {
            if (isLogin) {
                // LOGIN CON SUPABASE
                this.showToast('Iniciando sesión...', 'info');
                const user = await SupabaseService.signIn(email, password);

                AppState.currentUser = user;
                // Guardar en localStorage solo como backup/cache si se desea
                localStorage.setItem('currentUser', JSON.stringify(user));

                this.showToast('¡Bienvenido de nuevo!', 'success');
                this.showApp();
            } else {
                // REGISTRO CON SUPABASE
                const username = document.getElementById('auth-username').value;
                const role = document.getElementById('auth-role').value;

                if (!username || !role) {
                    this.showToast('Por favor completa todos los campos', 'error');
                    return;
                }

                this.showToast('Creando cuenta...', 'info');
                await SupabaseService.signUp(email, password, {
                    username,
                    role,
                    verified: 'NO_VERIFICADO'
                });

                this.showToast('Cuenta creada exitosamente. Por favor verifica tu email o inicia sesión.', 'success');
                // Cambiar a modo login
                this.toggleAuthMode();
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.showToast('Error: ' + (error.message || 'Error de autenticación'), 'error');
        }
    },

    async logout() {
        await SupabaseService.signOut();
        AppState.currentUser = null;
        localStorage.removeItem('currentUser');
        location.reload();
    },

    showApp() {
        document.getElementById('auth-modal').classList.remove('active');
        document.getElementById('app-container').classList.remove('hidden');
        this.updateHeader();

        // Renderizar navegación según rol
        this.renderNavigation();

        // Cargar vista inicial
        if (AppState.currentUser.role === 'ADMIN') {
            this.showView('admin');
        } else if (AppState.currentUser.role === 'OFERENTE') {
            this.showView('applications'); // Oferentes van directo a sus eventos
        } else {
            this.showView('explore'); // Buscadores van a explorar
        }

        // Forzar actualización del badge de notificaciones
        this.updateNotificationsBadge();
    },

    updateHeader() {
        const user = AppState.currentUser;
        document.getElementById('header-username').textContent = `¡Hola, ${user.username}!`;
        document.getElementById('header-role').textContent = `Panel de ${user.role === 'OFERENTE' ? 'Oferente' : 'Buscador'}`;

        // Avatar
        const avatarContainer = document.getElementById('header-avatar');
        if (user.avatar) {
            avatarContainer.innerHTML = `<img src="${user.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            const icon = user.role === 'OFERENTE' ? '👑' : '🔍';
            document.getElementById('header-avatar-icon').textContent = icon;
        }
    },

    renderNavigation() {
        const user = AppState.currentUser;
        if (!user) return;

        // Referencias a tabs
        const exploreTab = document.querySelector('[data-view="explore"]');
        const favoritesTab = document.querySelector('[data-view="favorites"]');
        const applicationsTab = document.querySelector('[data-view="applications"]');
        const adminTab = document.querySelector('[data-view="admin"]');

        // Lógica de visualización por ROL
        if (user.role === 'OFERENTE') {
            // Oferentes no exploran ni tienen favoritos (por ahora)
            if (exploreTab) exploreTab.style.display = 'none';
            if (favoritesTab) favoritesTab.style.display = 'none';

            // Renombrar "Mis Postulaciones" a "Mis Eventos"
            if (applicationsTab) {
                const label = applicationsTab.querySelector('span:nth-child(2)');
                if (label) label.textContent = 'Mis Eventos';
            }
        } else {
            // Buscadores ven todo
            if (exploreTab) exploreTab.style.display = 'flex';
            if (favoritesTab) favoritesTab.style.display = 'flex';

            if (applicationsTab) {
                const label = applicationsTab.querySelector('span:nth-child(2)');
                if (label) label.textContent = 'Mis Postulaciones';
            }
        }

        // Mostrar tabs específicos ADMIN
        if (adminTab) {
            if (user.role === 'ADMIN') {
                adminTab.classList.remove('hidden');
                adminTab.style.display = 'flex';
            } else {
                adminTab.classList.add('hidden');
                adminTab.style.display = 'none';
            }
        }

        // Mostrar botón de Crear Evento si es permitido
        const createBtn = document.getElementById('header-create-event');
        if (createBtn) {
            if (user.role === 'OFERENTE' || user.role === 'ADMIN') {
                createBtn.classList.remove('hidden');
            } else {
                createBtn.classList.add('hidden');
            }
        }

        // Actualizar contador de notificaciones
        this.updateNotificationsBadge();
    },

    // ===== NOTIFICACIONES =====
    updateNotificationsBadge() {
        const user = AppState.currentUser;
        const notifications = DataService.getNotificationsByUser(user.id);
        const unreadCount = notifications.filter(n => !n.read).length;

        const badge = document.getElementById('notifications-badge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    },

    toggleNotifications() {
        const panel = document.getElementById('notifications-panel');
        const isHidden = panel.classList.contains('hidden');

        if (isHidden) {
            this.loadNotifications();
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    },

    loadNotifications() {
        const user = AppState.currentUser;
        const notifications = DataService.getNotificationsByUser(user.id);
        const container = document.getElementById('notifications-list');

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: var(--spacing-xl); text-align: center;">
                    <div style="font-size: 48px; margin-bottom: var(--spacing-md);">🔔</div>
                    <p style="color: var(--color-text-secondary);">No tienes notificaciones</p>
                </div>
            `;
            return;
        }

        // Ordenar por fecha (más recientes primero)
        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        container.innerHTML = notifications.map(notif => `
            <div class="notification-item ${notif.read ? 'read' : 'unread'}" onclick="app.handleNotificationClick('${notif.id}')">
                <div class="notification-content">
                    <h4 class="notification-title">${notif.title}</h4>
                    <p class="notification-message">${notif.message}</p>
                    <span class="notification-time">${this.getTimeAgo(notif.createdAt)}</span>
                </div>
                ${!notif.read ? '<span class="notification-dot"></span>' : ''}
            </div>
        `).join('');
    },

    handleNotificationClick(notificationId) {
        // Marcar como leída
        DataService.markNotificationAsRead(notificationId);

        // Actualizar vista
        this.loadNotifications();
        this.updateNotificationsBadge();

        // Obtener notificación para ver si tiene relatedId
        const notifications = DataService.getNotificationsByUser(AppState.currentUser.id);
        const notification = notifications.find(n => n.id === notificationId);

        if (notification && notification.relatedId) {
            // Cerrar panel
            document.getElementById('notifications-panel').classList.add('hidden');

            // Navegar según el tipo
            if (notification.type === 'NEW_APPLICATION') {
                // Ir a gestionar candidatos
                this.showView('applications');
                setTimeout(() => {
                    this.manageEventApplicants(notification.relatedId);
                }, 300);
            } else if (notification.type === 'APPLICATION_ACCEPTED' || notification.type === 'APPLICATION_REJECTED') {
                // Ir a mis postulaciones
                this.showView('applications');
            }
        }
    },

    markAllNotificationsAsRead() {
        const user = AppState.currentUser;
        const notifications = DataService.getNotificationsByUser(user.id);

        notifications.forEach(notif => {
            if (!notif.read) {
                DataService.markNotificationAsRead(notif.id);
            }
        });

        this.loadNotifications();
        this.updateNotificationsBadge();
        this.showToast('Todas las notificaciones marcadas como leídas', 'success');
    },

    getTimeAgo(date) {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora mismo';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        return this.formatDate(date);
    },

    // ===== NAVEGACIÓN =====
    showView(viewName) {
        // Ocultar todas las vistas
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });

        // Desactivar todos los tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Mostrar vista seleccionada
        const viewElement = document.getElementById(`view-${viewName}`);
        if (viewElement) {
            viewElement.classList.remove('hidden');
        }

        // Activar tab correspondiente
        const tabElement = document.querySelector(`[data-view="${viewName}"]`);
        if (tabElement) {
            tabElement.classList.add('active');
        }

        AppState.currentView = viewName;

        // Cargar contenido de la vista
        switch (viewName) {
            case 'explore':
                this.loadExploreView();
                break;
            case 'applications':
                this.loadApplicationsView();
                break;
            case 'favorites':
                this.loadFavoritesView();
                break;
            case 'profile':
                this.loadProfileView();
                break;
            case 'admin':
                this.loadAdminView();
                break;
        }
    },

    // ===== VISTAS PRINCIPALES =====
    async loadExploreView() {
        const container = document.getElementById('events-list');
        container.innerHTML = '<div class="loader">Cargando eventos...</div>';

        try {
            // USAR SUPABASE
            let events = await SupabaseService.getAllEvents();

            // Aplicar filtros locales (opcional: se podría filtrar en backend también)
            if (AppState.filters.zone) {
                events = events.filter(e => e.zone === AppState.filters.zone);
            }
            if (AppState.filters.type) {
                // Mapear filtros de UI a valores de BD si es necesario
                // Por ahora asumimos coincidencia directa
                // events = events.filter(e => e.gangbang_level === AppState.filters.type);
            }

            this.renderEvents(events);
        } catch (error) {
            console.error('Error cargando eventos:', error);
            container.innerHTML = `<div class="error-msg" style="color: red; padding: 20px; text-align: center;">
                <h3>Error cargando eventos 😢</h3>
                <p>${error.message || 'Error desconocido'}</p>
                <small>Código: ${error.code || 'N/A'}</small>
            </div>`;
        }
    },

    renderUserStats() {
        const user = AppState.currentUser;
        const statsContainer = document.getElementById('user-stats');

        // Calcular próximo evento
        const myApplications = DataService.getApplicationsByUser(user.id);
        const acceptedApps = myApplications.filter(app => app.status === 'ACEPTADO');
        let nextEventText = 'Ninguno';

        if (acceptedApps.length > 0) {
            const nextEvent = DataService.getEventById(acceptedApps[0].eventId);
            if (nextEvent) {
                const daysUntil = Math.ceil((new Date(nextEvent.date) - new Date()) / (1000 * 60 * 60 * 24));
                nextEventText = daysUntil > 0 ? `En ${daysUntil} días` : 'Hoy';
            }
        }

        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">⭐</div>
                <div class="stat-info">
                    <h3>${user.rating.toFixed(1)}</h3>
                    <p>Tu reputación</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-info">
                    <h3>${user.reviewsCount || 0}</h3>
                    <p>Valoraciones</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📅</div>
                <div class="stat-info">
                    <h3>${nextEventText}</h3>
                    <p>Próximo evento</p>
                </div>
            </div>
        `;
    },

    renderEvents(events) {
        const container = document.getElementById('events-list');

        if (events.length === 0) {
            container.innerHTML = `
                <div class="card text-center" style="padding: var(--spacing-2xl);">
                    <div style="font-size: 48px; margin-bottom: var(--spacing-md);">🔍</div>
                    <h3>No hay eventos disponibles</h3>
                    <p style="color: var(--color-text-secondary); margin-top: var(--spacing-sm);">
                        Intenta ajustar los filtros o vuelve más tarde
                    </p>
                </div>
    `;
            return;
        }

        container.innerHTML = events.map(event => {
            // El organizador viene populado por Supabase gracias al select con join
            const organizer = event.organizer || { username: 'Desconocido' };
            const isFavorite = AppState.favorites.includes(event.id);
            const level = event.gangbang_level || event.gangbangLevel || 'TRADICIONAL';
            const badgeColor = level === 'TRADICIONAL' ? 'var(--color-success)' :
                level === 'SUMISO' ? 'var(--color-warning)' :
                    'var(--color-info)';

            return `
                <div class="event-card">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="app.toggleFavorite('${event.id}')">
                        ${isFavorite ? '❤️' : '♡'}
                    </button>
                    <span class="event-badge" style="background: ${badgeColor};">${level}</span>
                    
                    <div class="event-header">
                        <h2 class="event-title">${event.title}</h2>
                        <p class="event-description">${event.description}</p>
                        <p class="event-organizer">Organizadora: ${organizer.username}</p>
                    </div>

                    <div class="event-meta">
                        <div class="meta-item">
                            <span>📅</span>
                            ${this.formatDate(event.date)}
                        </div>
                        <div class="meta-item">
                            <span>🕐</span>
                            ${event.time}
                        </div>
                        <div class="meta-item">
                            <span>📍</span>
                            ${this.capitalizeZone(event.zone)}
                        </div>
                        <div class="meta-item">
                            <span>👥</span>
                            ${event.applicants?.length || 0} postulados
                        </div>
                    </div>

                    <div class="event-actions">
                        <button class="btn btn-secondary" onclick="app.showEventDetail('${event.id}')">Ver detalles</button>
                        <button class="btn btn-primary" onclick="app.applyToEvent('${event.id}')">Apuntarme</button>
                    </div>
                </div>
    `;
        }).join('');
    },

    // ===== FAVORITOS =====
    toggleFavorite(eventId) {
        const index = AppState.favorites.indexOf(eventId);
        if (index > -1) {
            AppState.favorites.splice(index, 1);
            this.showToast('Eliminado de favoritos', 'info');
        } else {
            AppState.favorites.push(eventId);
            this.showToast('Agregado a favoritos', 'success');
        }

        localStorage.setItem('favorites', JSON.stringify(AppState.favorites));

        // Recargar vista actual
        if (AppState.currentView === 'explore') {
            this.loadExploreView();
        } else if (AppState.currentView === 'favorites') {
            this.loadFavoritesView();
        }
    },

    // ===== FILTROS =====
    toggleFilters() {
        const panel = document.getElementById('filters-panel');
        panel.classList.toggle('hidden');
    },

    applyFilters() {
        AppState.filters.type = document.getElementById('filter-type').value;
        AppState.filters.zone = document.getElementById('filter-zone').value;
        this.toggleFilters();
        this.loadExploreView();
        this.showToast('Filtros aplicados', 'success');
    },

    // ===== POSTULARSE A EVENTO =====
    async applyToEvent(eventId) {
        if (!AppState.currentUser) return;

        // Confirmar acción
        if (!confirm('¿Estás seguro/a de que quieres postularte a este evento?')) {
            return;
        }

        try {
            this.showToast('Enviando postulación...', 'info');
            await SupabaseService.createApplication(AppState.currentUser.id, eventId);

            this.showToast('¡Postulación enviada con éxito!', 'success');
            // Recargar vista para actualizar UI
            this.loadExploreView();
        } catch (error) {
            console.error('Error al postularse:', error);
            if (error.code === '23505') { // Unique violation en Postgres/Supabase
                this.showToast('Ya te has postulado a este evento', 'warning');
            } else {
                this.showToast('Error al enviar postulación', 'error');
            }
        }
    },

    // ===== VISTA: MIS POSTULACIONES / MIS EVENTOS =====
    loadApplicationsView() {
        const user = AppState.currentUser;
        const container = document.getElementById('applications-list');

        // Si es OFERENTE, mostrar sus eventos creados
        if (user.role === 'OFERENTE' || user.role === 'ADMIN') {
            this.loadMyEventsView();
            return;
        }

        // Si es BUSCADOR, mostrar sus postulaciones
        const applications = DataService.getApplicationsByUser(user.id);

        if (applications.length === 0) {
            container.innerHTML = `
                <div class="card text-center" style="padding: var(--spacing-2xl);">
                    <div style="font-size: 48px; margin-bottom: var(--spacing-md);">📋</div>
                    <h3>No tienes postulaciones</h3>
                    <p style="color: var(--color-text-secondary); margin-top: var(--spacing-sm);">
                        Explora eventos y postúlate para participar
                    </p>
                    <button class="btn btn-primary mt-md" onclick="app.showView('explore')">Explorar eventos</button>
                </div>
    `;
            return;
        }

        // Agrupar por estado
        const pending = applications.filter(app => app.status === 'PENDIENTE');
        const accepted = applications.filter(app => app.status === 'ACEPTADO');
        const rejected = applications.filter(app => app.status === 'RECHAZADO');

        container.innerHTML = `
            ${accepted.length > 0 ? `
                <h3 style="margin-bottom: var(--spacing-md); color: var(--color-success);">
                    ✅ Aceptadas (${accepted.length})
                </h3>
                ${accepted.map(app => this.renderApplicationCard(app, 'ACEPTADO')).join('')}
            ` : ''
            }
            
            ${pending.length > 0 ? `
                <h3 style="margin-bottom: var(--spacing-md); margin-top: var(--spacing-xl); color: var(--color-warning);">
                    ⏳ Pendientes (${pending.length})
                </h3>
                ${pending.map(app => this.renderApplicationCard(app, 'PENDIENTE')).join('')}
            ` : ''
            }
            
            ${rejected.length > 0 ? `
                <h3 style="margin-bottom: var(--spacing-md); margin-top: var(--spacing-xl); color: var(--color-error);">
                    ❌ Rechazadas (${rejected.length})
                </h3>
                ${rejected.map(app => this.renderApplicationCard(app, 'RECHAZADO')).join('')}
            ` : ''
            }
`;

        // Actualizar contador
        document.getElementById('applications-count').textContent = applications.length;
    },

    renderApplicationCard(application, status) {
        const event = DataService.getEventById(application.eventId);
        if (!event) return '';

        const organizer = DataService.getUserById(event.organizerId);
        const statusColors = {
            'ACEPTADO': 'var(--color-success)',
            'PENDIENTE': 'var(--color-warning)',
            'RECHAZADO': 'var(--color-error)'
        };

        return `
            <div class="card mb-md" style="border-left: 4px solid ${statusColors[status]};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--spacing-md);">
                    <div>
                        <h3>${event.title}</h3>
                        <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                            ${event.description}
                        </p>
                        <p style="color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: 4px;">
                            Organizadora: ${organizer.username}
                        </p>
                    </div>
                    <span class="badge badge-${status === 'ACEPTADO' ? 'success' : status === 'PENDIENTE' ? 'warning' : 'error'}">
                        ${status}
                    </span>
                </div>
                
                <div class="event-meta">
                    <div class="meta-item">
                        <span>📅</span>
                        ${this.formatDate(event.date)}
                    </div>
                    <div class="meta-item">
                        <span>🕐</span>
                        ${event.time}
                    </div>
                    <div class="meta-item">
                        <span>📍</span>
                        ${status === 'ACEPTADO' ? event.location : this.capitalizeZone(event.zone)}
                    </div>
                </div>
                
                ${status === 'ACEPTADO' ? `
                    <div style="background: rgba(0, 255, 136, 0.1); padding: var(--spacing-md); border-radius: var(--border-radius-md); margin-top: var(--spacing-md);">
                        <strong style="color: var(--color-success);">🎉 ¡Felicidades! Has sido aceptado/a</strong>
                        <p style="margin-top: var(--spacing-sm); font-size: var(--font-size-sm);">
                            📍 <strong>Ubicación exacta:</strong> ${event.location}
                        </p>
                        ${organizer.email ? `
                            <p style="font-size: var(--font-size-sm);">
                                📧 <strong>Email:</strong> ${organizer.email}
                            </p>
                        ` : ''}
                    </div>
                ` : status === 'PENDIENTE' ? `
                    <div style="background: rgba(255, 215, 0, 0.1); padding: var(--spacing-md); border-radius: var(--border-radius-md); margin-top: var(--spacing-md);">
                        <strong style="color: var(--color-warning);">⏳ Tu postulación está siendo revisada</strong>
                        <p style="margin-top: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                            La organizadora revisará tu perfil y te notificará su decisión
                        </p>
                    </div>
                ` : ''}
            </div>
    `;
    },

    // ===== VISTA: MIS EVENTOS (OFERENTES) =====
    async loadMyEventsView() {
        const user = AppState.currentUser;
        const container = document.getElementById('applications-list');

        // Verificar que el contenedor existe
        if (!container) {
            console.error('Container applications-list not found');
            return;
        }

        // Mostrar spinner de carga
        container.innerHTML = '<div class="loading-spinner"></div>';

        console.log('Cargando eventos para organizador:', user.id);

        try {
            const myEvents = await SupabaseService.getEventsByCreator(user.id);
            console.log('Eventos recuperados:', myEvents);

            if (myEvents.length === 0) {
                container.innerHTML = `
                <div class="card text-center" style="padding: var(--spacing-2xl);">
                    <div style="font-size: 48px; margin-bottom: var(--spacing-md);">📅</div>
                    <h3>No has creado eventos</h3>
                    <p style="color: var(--color-text-secondary); margin-top: var(--spacing-sm);">
                        Crea tu primer evento para empezar a recibir candidaturas
                    </p>
                    <button class="btn btn-primary mt-md" onclick="app.showCreateEvent()">Crear Evento</button>
                </div>
            `;
                return;
            }

            container.innerHTML = myEvents.map(event => {
                const applicants = event.applicants || [];
                const pendingCount = applicants.filter(a => a.status === 'PENDIENTE').length;
                const acceptedCount = applicants.filter(a => a.status === 'ACEPTADO').length;

                return `
                <div class="card mb-md">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--spacing-md);">
                        <div>
                            <h3>${event.title}</h3>
                            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                                ${event.description}
                            </p>
                        </div>
                        <span class="badge badge-${event.status === 'ACTIVO' ? 'success' : 'secondary'}">
                            ${event.status}
                        </span>
                    </div>
                    
                    <div class="event-meta">
                        <div class="meta-item">
                            <span>📅</span>
                            ${this.formatDate(event.date)}
                        </div>
                        <div class="meta-item">
                            <span>🕐</span>
                            ${event.time}
                        </div>
                        <div class="meta-item">
                            <span>📍</span>
                            ${this.capitalizeZone(event.zone)}
                        </div>
                        <div class="meta-item">
                            <span>👥</span>
                            ${applicants.length} candidatos
                        </div>
                    </div>

                    ${applicants.length > 0 ? `
                        <div style="background: rgba(0, 123, 255, 0.1); padding: var(--spacing-md); border-radius: var(--border-radius-md); margin-top: var(--spacing-md);">
                            <strong style="color: var(--color-info);">📊 Candidaturas:</strong>
                            <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-sm);">
                                ${pendingCount > 0 ? `<span>⏳ ${pendingCount} pendientes</span>` : ''}
                                ${acceptedCount > 0 ? `<span>✅ ${acceptedCount} aceptados</span>` : ''}
                            </div>
                        </div>
                    ` : `
                        <div style="background: rgba(255, 193, 7, 0.1); padding: var(--spacing-md); border-radius: var(--border-radius-md); margin-top: var(--spacing-md);">
                            <p style="color: var(--color-warning); margin: 0;">
                                ⏳ Aún no hay candidaturas para este evento
                            </p>
                        </div>
                    `}

                    <div style="display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-md);">
                        <button class="btn btn-secondary" onclick="app.showEventDetail('${event.id}')">Ver detalles</button>
                        ${applicants.length > 0 ? `
                            <button class="btn btn-primary" onclick="app.manageEventApplicants('${event.id}')">Gestionar candidatos</button>
                        ` : ''}
                    </div>
                </div>
            `;
            }).join('');

            // Actualizar contador
            document.getElementById('applications-count').textContent = myEvents.length;
        } catch (error) {
            console.error('Error cargando eventos:', error);
            container.innerHTML = '<div class="text-center" style="padding: 20px; color: var(--color-error);">Error cargando tus eventos. Por favor recarga la página.</div>';
        }
    },

    // ===== VISTA: FAVORITOS =====
    loadFavoritesView() {
        const container = document.getElementById('favorites-list');

        if (AppState.favorites.length === 0) {
            container.innerHTML = `
                <div class="card text-center" style="padding: var(--spacing-2xl);">
                    <div style="font-size: 48px; margin-bottom: var(--spacing-md);">❤️</div>
                    <h3>No tienes favoritos</h3>
                    <p style="color: var(--color-text-secondary); margin-top: var(--spacing-sm);">
                        Guarda eventos que te interesen para verlos más tarde
                    </p>
                    <button class="btn btn-primary mt-md" onclick="app.showView('explore')">Explorar eventos</button>
                </div>
    `;
            return;
        }

        const events = AppState.favorites
            .map(id => DataService.getEventById(id))
            .filter(e => e !== null);

        this.renderEvents(events);
    },

    // ===== VISTA: PERFIL =====
    loadProfileView() {
        const user = AppState.currentUser;
        const container = document.getElementById('profile-container');

        const verificationBadge = user.verified === 'VERIFICADO'
            ? '<span class="verification-badge">✓ Verificado</span>'
            : user.verified === 'PENDIENTE'
                ? '<span class="badge badge-warning">⏳ Verificación pendiente</span>'
                : '<span class="badge" style="background: var(--color-error);">❌ No verificado</span>';

        container.innerHTML = `
            <div class="profile-grid">
                <div class="profile-main">
                    <div class="card profile-header">
                        <img src="${user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" 
                             class="profile-avatar" alt="${user.username}">
                        <h1 class="profile-name">${user.username}</h1>
                        <p class="profile-role">${user.role}</p>
                        ${verificationBadge}
                        
                        ${true ? `
                            <button class="btn btn-secondary btn-small mt-md" onclick="app.toggleProfileEdit()">
                                ✏️ Editar Perfil
                            </button>
                        ` : ''}
                    </div>
                    
                    ${user.bio ? `
                        <div class="card">
                            <h3 style="margin-bottom: var(--spacing-md);">Sobre mí</h3>
                            <p style="color: var(--color-text-secondary); line-height: 1.6;">${user.bio}</p>
                        </div>
                    ` : ''}
                    
                    ${user.searchZones && user.searchZones.length > 0 ? `
                        <div class="card">
                            <h3 style="margin-bottom: var(--spacing-md);">Zonas de Búsqueda</h3>
                            <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                                ${(user.searchZones || []).map(z => `
                                    <span class="badge badge-info">${this.capitalizeZone(z)}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${user.gallery && user.gallery.length > 0 ? `
                        <div class="card">
                            <h3 style="margin-bottom: var(--spacing-md);">Galería</h3>
                            <div class="gallery-grid">
                                ${(user.gallery || []).map(img => `
                                    <div class="gallery-item" onclick="app.showImageModal('${img}')">
                                        <img src="${img}" alt="Galería">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${user.reviews && user.reviews.length > 0 ? `
                        <div class="card">
                            <h3 style="margin-bottom: var(--spacing-md);">Valoraciones Recibidas</h3>
                            ${(user.reviews || []).map(review => `
                                <div class="review-card">
                                    <div class="review-header">
                                        <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
                                        <div class="review-date">${this.formatDate(review.date)}</div>
                                    </div>
                                    <p class="review-comment">${review.comment}</p>
                                    ${review.reviewerUsername ? `
                                        <p class="review-author">- ${review.reviewerUsername}</p>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="profile-sidebar">
                    <div class="card">
                        <h3 style="margin-bottom: var(--spacing-md);">Estadísticas</h3>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                            <div>
                                <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent);">
                                    ⭐ ${(user.rating || 0).toFixed(1)}
                                </div>
                                <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                                    Valoración
                                </div>
                            </div>
                            <div>
                                <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent);">
                                    ${user.reviewsCount || 0}
                                </div>
                                <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                                    Valoraciones
                                </div>
                            </div>
                            ${user.age ? `
                                <div>
                                    <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent);">
                                        ${user.age}
                                    </div>
                                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                                        Años
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${(user.role === 'OFERENTE' || user.role === 'ADMIN') ? `
                        <div class="card">
                            <button class="btn btn-primary btn-block" onclick="app.showCreateEvent()">
                                ➕ Crear Evento
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div >
    `;
    },

    toggleProfileEdit() {
        const user = AppState.currentUser;
        // Normalizar avatar por si viene como avatar_url
        const currentAvatar = user.avatar || user.avatar_url;
        const container = document.getElementById('profile-container');
        const zones = ['norte', 'sur', 'este', 'oeste', 'centro'];

        container.innerHTML = `
            <div class="card" style="max-width: 600px; margin: 0 auto;">
                <h2 style="margin-bottom: 20px;">✏️ Editar Perfil</h2>
                <form id="profile-edit-form" onsubmit="app.saveProfile(event)">
                    
                    <div class="form-group" style="margin-bottom: 20px; text-align: center;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">Foto de Perfil</label>
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                            <img src="${currentAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" 
                                 style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-primary);">
                            <input type="file" name="avatarFile" accept="image/*" class="input-field">
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Bio (Sobre ti)</label>
                        <textarea name="bio" rows="4" class="input-field" style="width: 100%; padding: 10px;">${user.bio || ''}</textarea>
                    </div>

                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Edad</label>
                        <input type="number" name="age" value="${user.age || ''}" class="input-field" style="width: 100%; padding: 10px;">
                    </div>

                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">Zonas de Búsqueda</label>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${zones.map(zone => `
                                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; background: var(--color-bg); padding: 5px 10px; border-radius: 15px; border: 1px solid var(--color-border);">
                                    <input type="checkbox" name="searchZones" value="${zone}" 
                                        ${(user.searchZones || []).includes(zone) ? 'checked' : ''}>
                                    ${this.capitalizeZone(zone)}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">Galería de Fotos</label>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; margin-bottom: 10px;">
                             ${(user.gallery || []).map(img => `
                                <div style="position: relative;">
                                    <img src="${img}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px;">
                                    <button type="button" onclick="app.deleteGalleryImage('${img}')" 
                                            style="position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; width: 20px; height: 20px; border: none; cursor: pointer; font-size: 10px;">X</button>
                                </div>
                             `).join('')}
                        </div>

                        <input type="file" name="galleryFiles" accept="image/*" multiple class="input-field">
                        <small style="color: var(--color-text-secondary);">Puedes seleccionar varias fotos a la vez</small>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        <button type="button" class="btn btn-secondary" onclick="app.loadProfileView()">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
    },

    async saveProfile(event) {
        event.preventDefault();
        const form = event.target;
        const user = AppState.currentUser;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        try {
            // 1. Recoger datos básicos
            const selectedZones = Array.from(form.querySelectorAll('input[name="searchZones"]:checked'))
                .map(cb => cb.value);

            let updates = {
                bio: form.bio.value,
                age: form.age.value ? parseInt(form.age.value) : null,
                search_zones: selectedZones
            };

            // 2. Subir avatar si existe
            const avatarFile = form.avatarFile.files[0];
            if (avatarFile) {
                const path = `${user.id}/${Date.now()}_avatar`;
                const avatarUrl = await SupabaseService.uploadFile('avatars', path, avatarFile);
                updates.avatar_url = avatarUrl;
            }

            // 3. Subir galería si existe
            const galleryFiles = form.galleryFiles.files;
            if (galleryFiles.length > 0) {
                let currentGallery = user.gallery || [];
                for (let i = 0; i < galleryFiles.length; i++) {
                    const file = galleryFiles[i];
                    const path = `${user.id}/${Date.now()}_gallery_${i}`;
                    const url = await SupabaseService.uploadFile('gallery', path, file);
                    currentGallery.push(url);
                }
                updates.gallery = currentGallery;
            }

            // 4. Actualizar usuario
            await SupabaseService.updateUser(user.id, updates);

            // 5. Refrescar estado local
            const updatedProfile = await SupabaseService.getCurrentUser();
            if (updatedProfile) {
                // Mapear avatar_url -> avatar para compatibilidad con resto de app
                updatedProfile.avatar = updatedProfile.avatar_url || updatedProfile.avatar;
            }
            AppState.currentUser = updatedProfile;

            this.loadProfileView();
            this.showToast('Perfil actualizado correctamente', 'success');

        } catch (error) {
            console.error('Error guardando perfil:', error);
            this.showToast('Error: ' + (error.message || 'No se pudo guardar'), 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Cambios';
        }
    },

    async deleteGalleryImage(imageUrl) {
        if (!confirm('¿Borrar esta foto?')) return;

        const user = AppState.currentUser;
        try {
            // 1. Filtrar array local
            const newGallery = (user.gallery || []).filter(img => img !== imageUrl);

            // 2. Actualizar DB
            await SupabaseService.updateUser(user.id, { gallery: newGallery });

            // 3. Refrescar UI
            user.gallery = newGallery;
            this.toggleProfileEdit();

            // Intento de borrado físico en background
            try {
                await SupabaseService.deleteFile('gallery', imageUrl);
            } catch (e) { console.warn('Borrado físico falló, pero DB actualizada', e); }

        } catch (error) {
            console.error(error);
            this.showToast('Error borrando imagen', 'error');
        }
    },

    // ===== UTILIDADES =====
    formatDate(date) {
        if (typeof date === 'string') {
            const d = new Date(date);
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        }
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    },

    capitalizeZone(zone) {
        const zones = {
            'norte': 'Zona Norte',
            'sur': 'Zona Sur',
            'este': 'Zona Este',
            'oeste': 'Zona Oeste',
            'centro': 'Centro'
        };
        return zones[zone] || zone;
    },

    showImageModal(imageUrl) {
        const modal = document.getElementById('image-modal');
        const img = document.getElementById('image-modal-img');
        img.src = imageUrl;
        modal.classList.add('active');
    },

    closeImageModal() {
        const modal = document.getElementById('image-modal');
        modal.classList.remove('active');
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type} `;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    },
    // ===== GESTIÓN DE EVENTOS Y PERFIL =====

    showCreateEvent() {
        const modal = document.getElementById('create-event-modal');
        modal.classList.add('active');
    },

    closeCreateEventModal() {
        const modal = document.getElementById('create-event-modal');
        modal.classList.remove('active');
    },

    handleCreateEvent(event) {
        event.preventDefault();

        // Validar permisos
        if (AppState.currentUser.role !== 'OFERENTE' && AppState.currentUser.role !== 'ADMIN') {
            this.showToast('Solo los postulantes y administradores pueden crear eventos', 'error');
            return;
        }

        const form = event.target;
        const formData = new FormData(form);

        const eventData = {
            title: formData.get('title'),
            description: formData.get('description'),
            gangbangLevel: formData.get('gangbangLevel'),
            date: formData.get('date'),
            time: formData.get('time'),
            zone: formData.get('zone'),
            capacity: parseInt(formData.get('capacity')),
            location: formData.get('location'),
            rules: formData.get('rules')
        };

        try {
            const newEvent = DataService.createEvent(eventData, AppState.currentUser.id);
            this.showToast('Evento creado exitosamente', 'success');
            this.closeCreateEventModal();
            form.reset();
            this.loadExploreView(); // Recargar vista
        } catch (error) {
            console.error(error);
            this.showToast('Error al crear el evento', 'error');
        }
    },

    toggleProfileEdit() {
        const modal = document.getElementById('edit-profile-modal');
        const user = AppState.currentUser;

        if (!modal.classList.contains('active')) {
            // Cargar datos actuales
            const form = document.getElementById('edit-profile-form');
            form.bio.value = user.bio || '';

            // Cargar zonas
            const checkBoxes = form.querySelectorAll('input[name="zones"]');
            checkBoxes.forEach(cb => {
                cb.checked = user.searchZones && user.searchZones.includes(cb.value);
            });

            // Preview avatar
            document.getElementById('edit-avatar-preview').src = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;

            // Preview galería
            const galleryContainer = document.getElementById('gallery-preview');
            galleryContainer.innerHTML = '';
            if (user.gallery) {
                user.gallery.forEach(img => {
                    const imgEl = document.createElement('img');
                    imgEl.src = img;
                    imgEl.style.width = '50px';
                    imgEl.style.height = '50px';
                    imgEl.style.objectFit = 'cover';
                    galleryContainer.appendChild(imgEl);
                });
            }
        }

        modal.classList.toggle('active');
    },

    handleImageUpload(type, input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const result = e.target.result;

                if (type === 'avatar') {
                    document.getElementById('edit-avatar-preview').src = result;
                    AppState.tempAvatar = result;
                } else if (type === 'gallery') {
                    if (!AppState.tempGallery) AppState.tempGallery = [];
                    if (AppState.tempGallery.length >= 4) {
                        app.showToast('Máximo 4 fotos en la galería', 'warning');
                        return;
                    }
                    AppState.tempGallery.push(result);

                    // Actualizar preview
                    const galleryContainer = document.getElementById('gallery-preview');
                    const imgEl = document.createElement('img');
                    imgEl.src = result;
                    imgEl.style.width = '50px';
                    imgEl.style.height = '50px';
                    imgEl.style.objectFit = 'cover';
                    galleryContainer.appendChild(imgEl);
                }
            };

            reader.readAsDataURL(input.files[0]);
        }
    },

    handleProfileEdit(event) {
        event.preventDefault();
        const form = event.target;
        const user = AppState.currentUser;

        // Actualizar Bio
        user.bio = form.bio.value;

        // Actualizar Zonas
        const checkBoxes = form.querySelectorAll('input[name="zones"]:checked');
        user.searchZones = Array.from(checkBoxes).map(cb => cb.value);

        // Actualizar Avatar si hay cambio
        if (AppState.tempAvatar) {
            user.avatar = AppState.tempAvatar;
            delete AppState.tempAvatar;
        }

        // Actualizar Galería si hay cambios
        if (AppState.tempGallery) {
            if (!user.gallery) user.gallery = [];
            user.gallery = [...user.gallery, ...AppState.tempGallery].slice(0, 4); // Limitar a 4
            delete AppState.tempGallery;
        }

        // Guardar cambios
        const dbUser = DataService.getUserById(user.id);
        if (dbUser) {
            Object.assign(dbUser, user);
        }

        // Persistir sesión
        localStorage.setItem('currentUser', JSON.stringify(user));

        this.showToast('Perfil actualizado correctamente', 'success');
        this.toggleProfileEdit();
        this.loadProfileView();
    },

    // ===== ADMIN PANEL =====

    loadAdminView() {
        const container = document.getElementById('view-admin');
        const users = DataService.getAllUsers();
        const events = DataService.getAllEvents();
        const auditLog = DB.auditLog || [];

        container.innerHTML = `
            <div class="admin-dashboard fade-in">
                <div class="header-section">
                    <h1>🛡️ Panel de Control</h1>
                    <p>Gestión total del sistema</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${users.length}</div>
                        <div class="stat-label">Usuarios Totales</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${events.length}</div>
                        <div class="stat-label">Eventos Totales</div>
                    </div>
                </div>

                <div class="tabs">
                    <button class="tab-btn active" onclick="app.switchAdminTab('users')">Usuarios</button>
                    <button class="tab-btn" onclick="app.switchAdminTab('events')">Eventos</button>
                    <button class="tab-btn" onclick="app.switchAdminTab('audit')">Auditoría</button>
                </div>

                <div id="admin-tab-content">
                    ${this.renderAdminUsersTable(users)}
                </div>
            </div>
        `;
    },

    switchAdminTab(tabName) {
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(b => b.classList.remove('active'));
        if (event) event.target.classList.add('active');

        const content = document.getElementById('admin-tab-content');
        if (tabName === 'users') {
            content.innerHTML = this.renderAdminUsersTable(DataService.getAllUsers());
        } else if (tabName === 'events') {
            content.innerHTML = this.renderAdminEventsTable(DataService.getAllEvents());
        } else if (tabName === 'audit') {
            content.innerHTML = this.renderAdminAuditTable(DB.auditLog || []);
        }
    },

    renderAdminUsersTable(users) {
        return `
            <div class="card">
                <h3>Gestión de Usuarios</h3>
                <div class="table-responsive">
                    <table class="table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <th style="padding: 10px; text-align: left;">Usuario</th>
                                <th style="padding: 10px; text-align: left;">Email</th>
                                <th style="padding: 10px; text-align: left;">Rol</th>
                                <th style="padding: 10px; text-align: left;">Estado</th>
                                <th style="padding: 10px; text-align: left;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr style="border-bottom: 1px solid var(--color-border);">
                                    <td style="padding: 10px;">${u.username}</td>
                                    <td style="padding: 10px;">${u.email}</td>
                                    <td style="padding: 10px;">
                                        <span class="badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'}">${u.role}</span>
                                    </td>
                                    <td style="padding: 10px;">${u.verified || 'No verificado'}</td>
                                    <td style="padding: 10px;">
                                        <button class="btn btn-secondary btn-small" onclick="app.deleteUser('${u.id}')">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderAdminEventsTable(events) {
        return `
            <div class="card">
                <h3>Gestión de Eventos</h3>
                <div class="table-responsive">
                    <table class="table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <th style="padding: 10px; text-align: left;">Título</th>
                                <th style="padding: 10px; text-align: left;">Organizador</th>
                                <th style="padding: 10px; text-align: left;">Estado</th>
                                <th style="padding: 10px; text-align: left;">Fecha</th>
                                <th style="padding: 10px; text-align: left;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${events.map(e => `
                                <tr style="border-bottom: 1px solid var(--color-border);">
                                    <td style="padding: 10px;">${e.title}</td>
                                    <td style="padding: 10px;">${(DataService.getUserById(e.organizerId) || {}).username || 'N/A'}</td>
                                    <td style="padding: 10px;">${e.status}</td>
                                    <td style="padding: 10px;">${e.date}</td>
                                    <td style="padding: 10px;">
                                        <button class="btn btn-secondary btn-small" onclick="app.deleteEvent('${e.id}')">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderAdminAuditTable(logs) {
        return `
           <div class="card">
                <h3>Auditoría del Sistema</h3>
                <div class="table-responsive">
                     <table class="table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                             <tr style="border-bottom: 1px solid var(--color-border);">
                                <th style="padding: 10px; text-align: left;">Acción</th>
                                <th style="padding: 10px; text-align: left;">Usuario</th>
                                <th style="padding: 10px; text-align: left;">Detalle</th>
                                <th style="padding: 10px; text-align: left;">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                             ${logs.slice().reverse().map(l => `
                                <tr style="border-bottom: 1px solid var(--color-border);">
                                    <td style="padding: 10px;">${l.action}</td>
                                    <td style="padding: 10px;">${l.userId}</td>
                                    <td style="padding: 10px;">${JSON.stringify(l.details)}</td>
                                    <td style="padding: 10px;">${this.formatDate(l.timestamp)}</td>
                                </tr>
                             `).join('')}
                        </tbody>
                    </table>
                </div>
           </div>
        `;
    },

    // ===== MODALES Y DETALLES DE EVENTOS =====
    async showEventDetail(eventId) {
        const modal = document.getElementById('event-detail-modal');
        const content = document.getElementById('event-detail-content');

        modal.classList.add('active');
        content.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const event = await SupabaseService.getEventById(eventId);
            if (!event) throw new Error('Evento no encontrado');

            const organizer = event.organizer || { username: 'Desconocido', avatar: null };
            const isOrganizer = AppState.currentUser && AppState.currentUser.id === event.organizer_id;
            const isBuscador = AppState.currentUser && AppState.currentUser.role === 'BUSCADOR';
            const applicantsCount = 0; // TODO: Obtener conteo real si es necesario

            content.innerHTML = `
            <div class="event-detail">
                <h3>${event.title}</h3>
                <p style="color: var(--color-text-secondary); margin: var(--spacing-sm) 0;">${event.description}</p>
                
                <div class="detail-section">
                    <h4>Información del Evento</h4>
                    <div class="detail-grid">
                        <div><strong>📅 Fecha:</strong> ${this.formatDate(event.date)}</div>
                        <div><strong>🕐 Hora:</strong> ${event.time}</div>
                        <div><strong>📍 Zona:</strong> ${this.capitalizeZone(event.zone)}</div>
                        <div><strong>👥 Capacidad:</strong> ${event.capacity} personas</div>
                        <div><strong>🎭 Tipo:</strong> ${event.gangbang_level || event.gangbangLevel || 'TRADICIONAL'}</div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Organizadora</h4>
                    <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                        <img src="${organizer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${organizer.username}`}" 
                             style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <strong>${organizer.username}</strong>
                            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                                ⭐ ${(organizer.rating || 0).toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>

                ${event.rules ? `
                    <div class="detail-section">
                        <h4>Reglas del Encuentro</h4>
                        <p style="color: var(--color-text-secondary);">${event.rules}</p>
                    </div>
                ` : ''}

                ${isOrganizer ? `
                    <div style="margin-top: var(--spacing-lg); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border); display: flex; gap: var(--spacing-md);">
                        <button class="btn btn-secondary" onclick="app.editEvent('${event.id}')">✏️ Modificar</button>
                        <button class="btn btn-danger" onclick="app.confirmDeleteEvent('${event.id}')" style="background-color: var(--color-error); color: white;">🗑️ Borrar Evento</button>
                    </div>
                ` : isBuscador ? `
                    <div style="margin-top: var(--spacing-lg);">
                        <button class="btn btn-primary btn-block" onclick="app.applyToEvent('${event.id}')">
                            Me interesa ❤️
                        </button>
                    </div>
                ` : ''}
            </div>
            `;
        } catch (error) {
            console.error('Error cargando detalle:', error);
            content.innerHTML = `<div class="error-msg">Error cargando evento: ${error.message}</div>`;
        }
    },

    async confirmDeleteEvent(eventId) {
        if (!confirm('⚠️ ¿Estás segura de borrar este evento?\n\nSe eliminará permanentemente.')) {
            return;
        }

        try {
            await SupabaseService.deleteEvent(eventId);
            this.closeEventDetail();
            this.showToast('Evento eliminado correctamente', 'success');

            if (AppState.currentView === 'applications') {
                this.loadMyEventsView();
            }
        } catch (error) {
            console.error('Error borrando evento:', error);
            alert('Error al borrar el evento: ' + error.message);
        }
    },

    editEvent(eventId) {
        alert('🚧 Funcionalidad de modificación en desarrollo.');
    },

    closeEventDetail() {
        const modal = document.getElementById('event-detail-modal');
        modal.classList.remove('active');
    },

    showCreateEvent() {
        const modal = document.getElementById('create-event-modal');
        modal.classList.add('active');
    },

    closeCreateEvent() {
        const modal = document.getElementById('create-event-modal');
        modal.classList.remove('active');
    },

    // ===== GESTIÓN DE CANDIDATOS (OFERENTES) =====
    manageEventApplicants(eventId) {
        const event = DataService.getEventById(eventId);
        if (!event) return;

        const modal = document.getElementById('event-detail-modal');
        const content = document.getElementById('event-detail-content');
        const applicants = event.applicants || [];

        if (applicants.length === 0) {
            this.showToast('No hay candidaturas para este evento', 'info');
            return;
        }

        content.innerHTML = `
            <div class="event-detail">
                <h3>Gestionar Candidatos: ${event.title}</h3>
                <p style="color: var(--color-text-secondary); margin: var(--spacing-sm) 0;">
                    ${applicants.length} candidatos totales
                </p>
                
                <div style="margin-top: var(--spacing-lg);">
                    ${applicants.map(applicant => {
            const user = DataService.getUserById(applicant.userId);
            if (!user) return '';

            return `
                            <div class="card mb-md" style="border-left: 4px solid ${applicant.status === 'ACEPTADO' ? 'var(--color-success)' :
                    applicant.status === 'RECHAZADO' ? 'var(--color-error)' :
                        'var(--color-warning)'
                };">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div style="display: flex; gap: var(--spacing-md); align-items: center;">
                                        <img src="${user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" 
                                             style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                                        <div>
                                            <strong>${user.username}</strong>
                                            <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                                                ⭐ ${user.rating.toFixed(1)} (${user.reviewsCount || 0} valoraciones)
                                            </div>
                                            ${user.bio ? `
                                                <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-top: 4px;">
                                                    ${user.bio}
                                                </p>
                                            ` : ''}
                                        </div>
                                    </div>
                                    <span class="badge badge-${applicant.status === 'ACEPTADO' ? 'success' :
                    applicant.status === 'RECHAZADO' ? 'error' :
                        'warning'
                }">
                                        ${applicant.status}
                                    </span>
                                </div>
                                
                                ${applicant.status === 'PENDIENTE' ? `
                                    <div style="display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-md);">
                                        <button class="btn btn-secondary btn-small" onclick="app.viewApplicantProfile('${user.id}')">
                                            👤 Ver perfil
                                        </button>
                                        <button class="btn btn-success btn-small" onclick="app.acceptApplicant('${eventId}', '${user.id}')">
                                            ✅ Aceptar
                                        </button>
                                        <button class="btn btn-error btn-small" onclick="app.rejectApplicant('${eventId}', '${user.id}')">
                                            ❌ Rechazar
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;

        modal.classList.add('active');
    },

    acceptApplicant(eventId, userId) {
        if (DataService.acceptApplicant(eventId, userId)) {
            // Crear notificación para el buscador aceptado
            const event = DataService.getEventById(eventId);
            const user = DataService.getUserById(userId);
            DataService.createNotification({
                userId: userId,
                type: 'APPLICATION_ACCEPTED',
                title: '✅ ¡Has sido aceptado!',
                message: `Has sido aceptado en el evento "${event.title}". Fecha: ${this.formatDate(event.date)} a las ${event.time}. Ubicación: ${event.location}`,
                relatedId: eventId
            });

            this.showToast('Candidato aceptado', 'success');
            this.manageEventApplicants(eventId); // Recargar
            this.loadApplicationsView(); // Actualizar lista
        } else {
            this.showToast('Error al aceptar candidato', 'error');
        }
    },

    rejectApplicant(eventId, userId) {
        if (DataService.rejectApplicant(eventId, userId)) {
            // Crear notificación para el buscador rechazado
            const event = DataService.getEventById(eventId);
            const user = DataService.getUserById(userId);
            DataService.createNotification({
                userId: userId,
                type: 'APPLICATION_REJECTED',
                title: '❌ Candidatura no aceptada',
                message: `Tu candidatura para el evento "${event.title}" no ha sido aceptada. Sigue explorando otros eventos.`,
                relatedId: eventId
            });

            this.showToast('Candidato rechazado', 'info');
            this.manageEventApplicants(eventId); // Recargar
            this.loadApplicationsView(); // Actualizar lista
        } else {
            this.showToast('Error al rechazar candidato', 'error');
        }
    },

    viewApplicantProfile(userId) {
        const user = DataService.getUserById(userId);
        if (!user) return;

        const modal = document.getElementById('event-detail-modal');
        const content = document.getElementById('event-detail-content');

        const verificationBadge = user.verified === 'VERIFICADO'
            ? '<span class="verification-badge">✓ Verificado</span>'
            : user.verified === 'PENDIENTE'
                ? '<span class="badge badge-warning">⏳ Verificación pendiente</span>'
                : '<span class="badge" style="background: var(--color-error);">❌ No verificado</span>';

        content.innerHTML = `
            <div class="profile-grid">
                <div class="profile-main">
                    <div class="card profile-header">
                        <img src="${user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" 
                             class="profile-avatar" alt="${user.username}">
                        <h1 class="profile-name">${user.username}</h1>
                        <p class="profile-role">${user.role}</p>
                        ${verificationBadge}
                    </div>
                    
                    ${user.bio ? `
                        <div class="card">
                            <h3 style="margin-bottom: var(--spacing-md);">Sobre mí</h3>
                            <p style="color: var(--color-text-secondary); line-height: 1.6;">${user.bio}</p>
                        </div>
                    ` : ''}
                    
                    ${user.searchZones && user.searchZones.length > 0 ? `
                        <div class="card">
                            <h3 style="margin-bottom: var(--spacing-md);">Zonas de Búsqueda</h3>
                            <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                                ${user.searchZones.map(z => `
                                    <span class="badge badge-info">${this.capitalizeZone(z)}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${user.gallery && user.gallery.length > 0 ? `
                        <div class="card">
                            <h3 style="margin-bottom: var(--spacing-md);">Galería</h3>
                            <div class="gallery-grid">
                                ${user.gallery.map(img => `
                                    <div class="gallery-item" onclick="app.showImageModal('${img}')">
                                        <img src="${img}" alt="Galería">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${user.reviews && user.reviews.length > 0 ? `
                        <div class="card">
                            <h3 style="margin-bottom: var(--spacing-md);">Valoraciones Recibidas</h3>
                            ${user.reviews.map(review => `
                                <div class="review-card">
                                    <div class="review-header">
                                        <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
                                        <div class="review-date">${this.formatDate(review.date)}</div>
                                    </div>
                                    <p class="review-comment">${review.comment}</p>
                                    ${review.reviewerUsername ? `
                                        <p class="review-author">- ${review.reviewerUsername}</p>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="profile-sidebar">
                    <div class="card">
                        <h3 style="margin-bottom: var(--spacing-md);">Estadísticas</h3>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                            <div>
                                <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent);">
                                    ⭐ ${user.rating.toFixed(1)}
                                </div>
                                <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                                    Valoración
                                </div>
                            </div>
                            <div>
                                <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent);">
                                    ${user.reviewsCount || 0}
                                </div>
                                <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                                    Valoraciones
                                </div>
                            </div>
                            ${user.age ? `
                                <div>
                                    <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent);">
                                        ${user.age}
                                    </div>
                                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                                        Años
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('active');
    },

    deleteUser(userId) {
        if (!confirm('¿Seguro que quieres eliminar este usuario?')) return;
        DataService.deleteUser(userId);
        this.switchAdminTab('users');
        this.showToast('Usuario eliminado', 'success');
    },

    deleteEvent(eventId) {
        if (!confirm('¿Seguro que quieres eliminar este evento?')) return;
        DataService.deleteEvent(eventId);
        this.switchAdminTab('events');
        this.showToast('Evento eliminado', 'success');
    },

    // ===== CREAR EVENTOS =====
    showCreateEvent() {
        const modal = document.getElementById('create-event-modal');
        modal.classList.add('active');
    },

    closeCreateEvent() {
        const modal = document.getElementById('create-event-modal');
        modal.classList.remove('active');
    },

    async handleCreateEvent(event) {
        event.preventDefault();

        const title = document.getElementById('event-title').value;
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const location = document.getElementById('event-location').value;

        let type = 'TRADICIONAL'; // Valor por defecto
        const typeInput = document.querySelector('input[name="gangbang-level"]:checked');
        if (typeInput) {
            type = typeInput.value;
        }

        const capacity = document.getElementById('event-capacity').value;
        const zone = document.getElementById('event-zone').value;
        const description = document.getElementById('event-description').value;
        const rules = document.getElementById('event-rules').value;

        try {
            this.showToast('Creando evento...', 'info');

            await SupabaseService.createEvent({
                title,
                date,
                time,
                location,
                gangbang_level: type, // Mapeo al nombre de col en Supabase
                capacity: parseInt(capacity),
                zone,
                description,
                rules
            }, AppState.currentUser.id);

            this.showToast('¡Evento creado exitosamente!', 'success');
            this.closeCreateEvent();
            // Ir a mis eventos
            this.showView('applications'); // Recargará la vista automáticamente
        } catch (error) {
            console.error('Error creando evento:', error);
            this.showToast('Error al crear el evento', 'error');
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

window.app = app;

// ===== PROFILE UX IMPROVEMENTS (Overwrites previous methods) =====

app.toggleProfileEdit = function () {
    const user = AppState.currentUser;
    console.log('Editando perfil (UX Improved). Datos:', user);

    // Normalizar avatar
    const currentAvatar = user.avatar || user.avatar_url;
    const container = document.getElementById('profile-container');
    const zones = ['norte', 'sur', 'este', 'oeste', 'centro'];

    container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
            <h2 style="margin-bottom: 20px;">✏️ Editar Perfil</h2>
            <form id="profile-edit-form" onsubmit="app.saveProfile(event)">
                
                <!-- AVATAR SECTION -->
                <div class="form-group" style="margin-bottom: 20px; text-align: center;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Foto de Perfil</label>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                        <img id="avatar-preview" 
                             src="${currentAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" 
                             style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-primary); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <label class="btn btn-secondary" style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                                📷 Cambiar
                                <input type="file" name="avatarFile" accept="image/*" style="display: none;" 
                                       onchange="app.previewAvatar(this)">
                            </label>
                            
                            ${currentAvatar ? `
                                <button type="button" class="btn" style="background: var(--color-error); color: white;" 
                                        onclick="app.deleteAvatar()">🗑️ Borrar</button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Bio (Sobre ti)</label>
                    <textarea name="bio" rows="4" class="input-field" style="width: 100%; padding: 10px;" placeholder="Cuéntanos algo sobre ti...">${user.bio || ''}</textarea>
                </div>

                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Edad</label>
                    <input type="number" name="age" value="${(user.age !== null && user.age !== undefined) ? user.age : ''}" 
                           class="input-field" style="width: 100%; padding: 10px;" placeholder="Ej: 30">
                </div>

                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Zonas de Búsqueda</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${zones.map(zone => `
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; background: var(--color-bg); padding: 8px 12px; border-radius: 20px; border: 1px solid var(--color-border);">
                                <input type="checkbox" name="searchZones" value="${zone}" 
                                    ${(user.searchZones || []).includes(zone) ? 'checked' : ''}>
                                ${this.capitalizeZone(zone)}
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Galería de Fotos</label>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 15px;">
                         ${(user.gallery || []).map(img => `
                            <div style="position: relative; aspect-ratio: 1;">
                                <img src="${img}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 1px solid var(--color-border);">
                                <button type="button" onclick="app.deleteGalleryImage('${img}')" 
                                        class="btn-icon-danger"
                                        style="position: absolute; top: 5px; right: 5px; background: rgba(255, 0, 0, 0.8); color: white; border-radius: 50%; width: 24px; height: 24px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">×</button>
                            </div>
                         `).join('')}
                    </div>

                    <label class="btn btn-secondary" style="cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        ➕ Añadir fotos a la galería
                        <input type="file" name="galleryFiles" accept="image/*" multiple style="display: none;">
                    </label>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 30px; border-top: 1px solid var(--color-border); padding-top: 20px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Guardar Cambios</button>
                    <button type="button" class="btn btn-secondary" onclick="app.loadProfileView()" style="flex: 1;">Cancelar</button>
                </div>
            </form>
        </div>
    `;
};

app.previewAvatar = function (input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('avatar-preview').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
};

app.deleteAvatar = async function () {
    if (!confirm('¿Seguro que quieres borrar tu foto de perfil actual?')) return;
    try {
        await SupabaseService.updateUser(AppState.currentUser.id, { avatar_url: null });
        const updated = await SupabaseService.getCurrentUser();
        if (updated) updated.avatar = null;
        AppState.currentUser = updated;
        this.toggleProfileEdit();
        this.showToast('Foto de perfil eliminada', 'success');
    } catch (error) {
        console.error(error);
        this.showToast('Error borrando foto: ' + error.message, 'error');
    }
};

app.saveProfile = async function (event) {
    event.preventDefault();
    const form = event.target;
    const user = AppState.currentUser;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
        const selectedZones = Array.from(form.querySelectorAll('input[name="searchZones"]:checked'))
            .map(cb => cb.value);

        let updates = {
            bio: form.bio.value,
            age: form.age.value ? parseInt(form.age.value) : null,
            search_zones: selectedZones
        };

        const avatarFile = form.avatarFile.files[0];
        if (avatarFile) {
            const path = `${user.id}/${Date.now()}_avatar`;
            const avatarUrl = await SupabaseService.uploadFile('avatars', path, avatarFile);
            updates.avatar_url = avatarUrl;
        }

        const galleryFiles = form.galleryFiles.files;
        if (galleryFiles.length > 0) {
            let currentGallery = user.gallery || [];
            if (typeof currentGallery === 'string') currentGallery = JSON.parse(currentGallery);
            for (let i = 0; i < galleryFiles.length; i++) {
                const file = galleryFiles[i];
                const path = `${user.id}/${Date.now()}_gallery_${i}`;
                const url = await SupabaseService.uploadFile('gallery', path, file);
                currentGallery.push(url);
            }
            updates.gallery = currentGallery;
        }

        await SupabaseService.updateUser(user.id, updates);

        const updatedProfile = await SupabaseService.getCurrentUser();
        if (updatedProfile) {
            updatedProfile.avatar = updatedProfile.avatar_url || updatedProfile.avatar;
        }
        AppState.currentUser = updatedProfile;

        this.loadProfileView();
        this.showToast('Perfil actualizado correctamente', 'success');

    } catch (error) {
        console.error('Error guardando perfil:', error);
        this.showToast('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Cambios';
    }
};

app.deleteGalleryImage = async function (imageUrl) {
    if (!confirm('¿Borrar esta foto de la galería?')) return;

    const user = AppState.currentUser;
    try {
        const currentGallery = user.gallery || [];
        const newGallery = currentGallery.filter(img => img !== imageUrl);

        await SupabaseService.updateUser(user.id, { gallery: newGallery });
        SupabaseService.deleteFile('gallery', imageUrl).catch(console.warn);

        user.gallery = newGallery;
        this.toggleProfileEdit();
        this.showToast('Foto eliminada', 'success');

    } catch (error) {
        console.error(error);
        this.showToast('Error borrando imagen', 'error');
    }
};

// ===== PROFILE FIX V2 (Extensions & Better Debug) =====

app.saveProfile = async function (event) {
    event.preventDefault();
    const form = event.target;
    const user = AppState.currentUser;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
        console.log('🏁 Iniciando guardado de perfil...');

        // 1. Recoger datos básicos
        const selectedZones = Array.from(form.querySelectorAll('input[name="searchZones"]:checked'))
            .map(cb => cb.value);

        let updates = {
            bio: form.bio.value,
            age: form.age.value ? parseInt(form.age.value) : null,
            search_zones: selectedZones
        };

        // 2. Subir avatar (CON EXTENSIÓN)
        const avatarFile = form.avatarFile.files[0];
        if (avatarFile) {
            const ext = avatarFile.name.split('.').pop();
            const path = `${user.id}/${Date.now()}_avatar.${ext}`;
            console.log('Subiendo avatar a:', path);

            try {
                const avatarUrl = await SupabaseService.uploadFile('avatars', path, avatarFile);
                updates.avatar_url = avatarUrl;
                console.log('Avatar subido OK:', avatarUrl);
            } catch (uploadErr) {
                console.error('Error subida avatar:', uploadErr);
                alert('Error subiendo avatar: ' + uploadErr.message);
                throw uploadErr;
            }
        }

        // 3. Subir galería (CON EXTENSIÓN)
        const galleryFiles = form.galleryFiles.files;
        if (galleryFiles.length > 0) {
            let currentGallery = user.gallery || [];
            if (typeof currentGallery === 'string') currentGallery = JSON.parse(currentGallery);

            for (let i = 0; i < galleryFiles.length; i++) {
                const file = galleryFiles[i];
                const ext = file.name.split('.').pop();
                const path = `${user.id}/${Date.now()}_gallery_${i}.${ext}`;

                try {
                    const url = await SupabaseService.uploadFile('gallery', path, file);
                    currentGallery.push(url);
                    console.log('Foto galería subida:', url);
                } catch (galleryErr) {
                    console.error('Error subida galería:', galleryErr);
                    alert('Error subiendo foto de galería: ' + galleryErr.message);
                    throw galleryErr; // Stop process
                }
            }
            updates.gallery = currentGallery;
        }

        // 4. Actualizar usuario
        console.log('Actualizando usuario en DB:', updates);
        await SupabaseService.updateUser(user.id, updates);

        // 5. Refrescar
        const updatedProfile = await SupabaseService.getCurrentUser();
        if (updatedProfile) {
            updatedProfile.avatar = updatedProfile.avatar_url || updatedProfile.avatar;
        }
        AppState.currentUser = updatedProfile;

        this.loadProfileView();
        this.showToast('Perfil actualizado correctamente', 'success');

    } catch (error) {
        console.error('Error FATAL guardando perfil:', error);
        // Alerta visible para que el usuario nos diga el error exacto
        alert('ERROR: ' + (error.message || error));

        this.showToast('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Cambios';
    }
};
