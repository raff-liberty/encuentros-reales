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
    init() {
        console.log('🚀 Inicializando Encuentros Reales...');

        // Cargar usuario guardado
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            AppState.currentUser = JSON.parse(savedUser);
            this.showApp();
        }

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
        const isLogin = document.getElementById('auth-title').textContent === 'Iniciar Sesión';

        if (isLogin) {
            // Cambiar a registro
            document.getElementById('auth-title').textContent = 'Crear Cuenta';
            document.querySelector('.register-fields').classList.remove('hidden');
            document.getElementById('auth-toggle-text').textContent = '¿Ya tienes cuenta?';
            document.getElementById('auth-toggle-link').textContent = 'Inicia sesión';
        } else {
            // Cambiar a login
            document.getElementById('auth-title').textContent = 'Iniciar Sesión';
            document.querySelector('.register-fields').classList.add('hidden');
            document.getElementById('auth-toggle-text').textContent = '¿No tienes cuenta?';
            document.getElementById('auth-toggle-link').textContent = 'Regístrate';
        }
    },

    handleAuth() {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const isLogin = document.getElementById('auth-title').textContent === 'Iniciar Sesión';

        if (isLogin) {
            // Login
            const user = DataService.authenticate(email, password);
            if (user) {
                AppState.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.showApp();
                this.showToast('¡Bienvenido/a de nuevo!', 'success');
            } else {
                this.showToast('Email o contraseña incorrectos', 'error');
            }
        } else {
            // Registro
            const username = document.getElementById('auth-username').value;
            const age = document.getElementById('auth-age').value;
            const bio = document.getElementById('auth-bio').value;
            const role = document.querySelector('input[name="role"]:checked')?.value;

            if (!username || !age || !role) {
                this.showToast('Por favor completa todos los campos', 'error');
                return;
            }

            // Verificar username único
            if (DataService.getUserByUsername(username)) {
                this.showToast('Este nombre de usuario ya está en uso', 'error');
                return;
            }

            const newUser = DataService.createUser({
                email,
                password,
                username,
                age: parseInt(age),
                bio,
                role
            });

            if (newUser) {
                AppState.currentUser = newUser;
                localStorage.setItem('currentUser', JSON.stringify(newUser));
                this.showApp();
                this.showToast('¡Cuenta creada exitosamente!', 'success');
            } else {
                this.showToast('Error al crear la cuenta', 'error');
            }
        }
    },

    logout() {
        AppState.currentUser = null;
        localStorage.removeItem('currentUser');
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('auth-modal').classList.add('active');
        this.showToast('Sesión cerrada', 'info');
    },

    showApp() {
        document.getElementById('auth-modal').classList.remove('active');
        document.getElementById('app-container').classList.remove('hidden');
        this.updateHeader();
        this.showView('explore');
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

        // Mostrar/ocultar tabs según rol
        if (user.role === 'ADMIN') {
            document.querySelector('[data-view="admin"]').classList.remove('hidden');
        }
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

    // ===== VISTA: EXPLORAR EVENTOS =====
    loadExploreView() {
        const user = AppState.currentUser;

        // Cargar estadísticas
        this.renderUserStats();

        // Cargar eventos
        let events = DataService.getAllEvents();

        // Aplicar filtros
        if (AppState.filters.type) {
            events = events.filter(e => e.gangbangLevel === AppState.filters.type);
        }
        if (AppState.filters.zone) {
            events = events.filter(e => e.zone === AppState.filters.zone);
        }

        // Filtrar eventos según rol
        if (user.role === 'BUSCADOR') {
            // Mostrar solo eventos activos y no creados por el usuario
            events = events.filter(e => e.status === 'ACTIVO');
        } else if (user.role === 'OFERENTE') {
            // Mostrar eventos de otros oferentes
            events = events.filter(e => e.organizerId !== user.id);
        }

        this.renderEvents(events);

        // Actualizar contador
        document.getElementById('explore-count').textContent = events.length;
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
            const organizer = DataService.getUserById(event.organizerId);
            const isFavorite = AppState.favorites.includes(event.id);
            const badgeColor = event.gangbangLevel === 'TRADICIONAL' ? 'var(--color-success)' :
                event.gangbangLevel === 'SUMISO' ? 'var(--color-warning)' :
                    'var(--color-info)';

            return `
                <div class="event-card">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="app.toggleFavorite('${event.id}')">
                        ${isFavorite ? '❤️' : '♡'}
                    </button>
                    <span class="event-badge" style="background: ${badgeColor};">${event.gangbangLevel}</span>
                    
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
    applyToEvent(eventId) {
        const user = AppState.currentUser;

        if (user.role !== 'BUSCADOR') {
            this.showToast('Solo los buscadores pueden postularse', 'error');
            return;
        }

        // Verificar si ya está postulado
        const existingApp = DataService.getApplicationsByUser(user.id)
            .find(app => app.eventId === eventId);

        if (existingApp) {
            this.showToast('Ya te has postulado a este evento', 'warning');
            return;
        }

        const application = DataService.createApplication({
            userId: user.id,
            eventId: eventId
        });

        if (application) {
            this.showToast('¡Postulación enviada! Espera la respuesta de la organizadora', 'success');
            this.loadExploreView();
        } else {
            this.showToast('Error al enviar la postulación', 'error');
        }
    },

    // Continuará en la siguiente parte...
};
