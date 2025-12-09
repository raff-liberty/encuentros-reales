// ===== APPLICATION STATE =====
const AppState = {
    currentUser: null,
    currentView: 'feed',
    authMode: 'login', // 'login' or 'register'
    filters: {
        gangbangLevel: '',
        zone: ''
    }
};

// ===== MAIN APPLICATION =====
const app = {
    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadInitialData();
    },

    checkAuth() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            AppState.currentUser = JSON.parse(savedUser);
            this.showApp();
            this.updateUI();
        } else {
            this.showAuthModal();
        }
    },

    setupEventListeners() {
        // Auth form
        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuth();
        });

        // Create event form
        document.getElementById('create-event-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateEvent();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                this.switchView(view);
            });
        });

        // Filters
        document.getElementById('filter-gangbang-level').addEventListener('change', (e) => {
            AppState.filters.gangbangLevel = e.target.value;
            this.loadEvents();
        });

        document.getElementById('filter-zone').addEventListener('change', (e) => {
            AppState.filters.zone = e.target.value;
            this.loadEvents();
        });

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    },

    // ===== AUTH =====
    showAuthModal() {
        document.getElementById('auth-modal').classList.add('active');
    },

    hideAuthModal() {
        document.getElementById('auth-modal').classList.remove('active');
    },

    toggleAuthMode() {
        AppState.authMode = AppState.authMode === 'login' ? 'register' : 'login';

        if (AppState.authMode === 'register') {
            document.getElementById('auth-title').textContent = 'Crear Cuenta';
            document.getElementById('auth-toggle-text').textContent = '¿Ya tienes cuenta?';
            document.getElementById('auth-toggle-link').textContent = 'Inicia sesión';
            document.body.classList.add('auth-register');
        } else {
            document.getElementById('auth-title').textContent = 'Iniciar Sesión';
            document.getElementById('auth-toggle-text').textContent = '¿No tienes cuenta?';
            document.getElementById('auth-toggle-link').textContent = 'Regístrate';
            document.body.classList.remove('auth-register');
        }
    },

    handleAuth() {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        if (AppState.authMode === 'login') {
            const user = DataService.getUserByEmail(email);
            if (user && user.password === password) {
                AppState.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.hideAuthModal();
                this.showApp();
                this.updateUI();
                this.showToast('Bienvenido/a ' + user.username, 'success');
            } else {
                this.showToast('Email o contraseña incorrectos', 'error');
            }
        } else {
            const username = document.getElementById('auth-username').value;
            const age = document.getElementById('auth-age').value;
            const bio = document.getElementById('auth-bio').value;
            const role = document.querySelector('input[name="role"]:checked')?.value;

            if (!username || !role) {
                this.showToast('Por favor completa todos los campos obligatorios', 'error');
                return;
            }

            if (age && (parseInt(age) < 18 || parseInt(age) > 99)) {
                this.showToast('Debes ser mayor de 18 años', 'error');
                return;
            }

            const existingUser = DataService.getUserByEmail(email);
            if (existingUser) {
                this.showToast('Este email ya está registrado', 'error');
                return;
            }

            let newUser;
            try {
                newUser = DataService.createUser({
                    email,
                    password,
                    username,
                    age: age ? parseInt(age) : null,
                    bio: bio || '',
                    role,
                    zone: 'centro',
                    searchZones: []
                });
            } catch (error) {
                this.showToast(error.message, 'error');
                return;
            }

            AppState.currentUser = newUser;
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            this.hideAuthModal();
            this.showApp();
            this.updateUI();
            this.showToast('Cuenta creada exitosamente. Tu perfil está pendiente de verificación.', 'success');
        }
    },

    logout() {
        AppState.currentUser = null;
        localStorage.removeItem('currentUser');
        document.getElementById('app-container').classList.remove('active');
        document.getElementById('splash-screen').classList.add('active');
        this.showToast('Sesión cerrada', 'info');
    },

    // ===== UI MANAGEMENT =====
    closeSplash() {
        document.getElementById('splash-screen').classList.remove('active');
        setTimeout(() => {
            if (!AppState.currentUser) {
                this.showAuthModal();
            }
        }, 300);
    },

    showApp() {
        document.getElementById('app-container').classList.add('active');
        document.getElementById('splash-screen').classList.remove('active');
    },

    updateUI() {
        if (!AppState.currentUser) return;

        // Update user avatar and info
        document.getElementById('user-avatar-img').src = AppState.currentUser.avatar;
        document.getElementById('user-name-display').textContent = AppState.currentUser.username;
        document.getElementById('user-role-display').textContent = AppState.currentUser.role;

        // Update body class for role-specific visibility
        document.body.className = '';
        document.body.classList.add('role-' + AppState.currentUser.role);

        // Show/hide admin menu
        if (AppState.currentUser.role === 'ADMIN') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        }
    },

    toggleUserMenu() {
        document.getElementById('user-dropdown').classList.toggle('active');
    },

    switchView(viewName) {
        AppState.currentView = viewName;

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById('view-' + viewName).classList.add('active');

        // Load view data
        this.loadViewData(viewName);
    },

    loadInitialData() {
        this.loadEvents();
    },

    loadViewData(viewName) {
        switch (viewName) {
            case 'feed':
                this.loadEvents();
                break;
            case 'events':
                this.loadMyEvents();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'admin':
                this.loadAdmin();
                break;
        }
    },

    // ===== EVENTS =====
    loadEvents() {
        const eventsGrid = document.getElementById('events-grid');
        let events = DataService.getAllEvents();

        // Apply filters
        if (AppState.filters.gangbangLevel) {
            events = events.filter(e => e.gangbangLevel === AppState.filters.gangbangLevel);
        }
        if (AppState.filters.zone) {
            events = events.filter(e => e.zone === AppState.filters.zone);
        }

        if (events.length === 0) {
            eventsGrid.innerHTML = '<p style="color: var(--color-text-tertiary); text-align: center; grid-column: 1/-1;">No hay eventos disponibles con los filtros seleccionados.</p>';
            return;
        }

        eventsGrid.innerHTML = events.map(event => this.renderEventCard(event)).join('');
    },

    renderEventCard(event) {
        const creator = DataService.getUserById(event.creatorId);
        const levelClass = event.gangbangLevel.toLowerCase();
        const levelNames = {
            'TRADICIONAL': 'Tradicional',
            'SUMISO': 'Sumiso',
            'ESTRUCTURADO': 'Estructurado'
        };

        const statusClass = event.status === 'ABIERTO' ? 'open' : event.status === 'POSTULACIONES_CERRADAS' ? 'closed' : 'finished';
        const statusText = event.status === 'ABIERTO' ? 'Abierto' : event.status === 'POSTULACIONES_CERRADAS' ? 'Cerrado' : 'Finalizado';

        return `
            <div class="event-card" onclick="app.showEventDetail('${event.id}')">
                <div class="event-header">
                    <div>
                        <h3 class="event-title">${event.title}</h3>
                    </div>
                    <span class="event-level-badge ${levelClass}">${levelNames[event.gangbangLevel]}</span>
                </div>
                <p class="event-description">${event.description}</p>
                <div class="event-meta">
                    <div class="event-meta-item">
                        <span class="event-meta-icon">📅</span>
                        <span>${this.formatDate(event.date)} a las ${event.time}</span>
                    </div>
                    <div class="event-meta-item">
                        <span class="event-meta-icon">📍</span>
                        <span>${this.capitalizeZone(event.zone)}</span>
                    </div>
                    <div class="event-meta-item">
                        <span class="event-meta-icon">👤</span>
                        <span>Organizado por ${creator.alias} (⭐ ${creator.rating.toFixed(1)})</span>
                    </div>
                </div>
                <div class="event-footer">
                    <span class="event-capacity">${event.accepted.length}/${event.capacity} confirmados</span>
                    <span class="event-status ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    },

    showEventDetail(eventId) {
        const event = DataService.getEventById(eventId);
        if (!event) return;

        const modal = document.getElementById('event-detail-modal');
        const content = document.getElementById('event-detail-content');

        if (AppState.currentUser.role === 'OFERENTE' && event.creatorId === AppState.currentUser.id) {
            content.innerHTML = this.renderEventDetailOferente(event);
        } else if (AppState.currentUser.role === 'BUSCADOR') {
            content.innerHTML = this.renderEventDetailBuscador(event);
        } else {
            content.innerHTML = this.renderEventDetailGeneral(event);
        }

        modal.classList.add('active');
    },

    renderEventDetailGeneral(event) {
        const creator = DataService.getUserById(event.creatorId);
        const levelIcons = { 'TRADICIONAL': '🌊', 'SUMISO': '⚡', 'ESTRUCTURADO': '📋' };
        const levelDescriptions = {
            'TRADICIONAL': 'Fluido, espontáneo, sin turnos fijos',
            'SUMISO': 'Rol sumiso, iniciativa de participantes',
            'ESTRUCTURADO': 'Orden, turnos y tiempos definidos'
        };

        return `
            <div style="margin-bottom: var(--spacing-lg);">
                <h3 style="font-size: var(--font-size-xl); margin-bottom: var(--spacing-md);">${event.title}</h3>
                <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                    <span style="font-size: 32px;">${levelIcons[event.gangbangLevel]}</span>
                    <div>
                        <div style="font-weight: 600; color: var(--color-text-primary);">Gangbang ${event.gangbangLevel}</div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-tertiary);">${levelDescriptions[event.gangbangLevel]}</div>
                    </div>
                </div>
            </div>
            
            <div style="background: var(--color-bg-elevated); padding: var(--spacing-lg); border-radius: var(--border-radius-md); margin-bottom: var(--spacing-lg);">
                <h4 style="margin-bottom: var(--spacing-md);">Descripción</h4>
                <p style="color: var(--color-text-secondary); line-height: 1.6;">${event.description}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                <div style="background: var(--color-bg-elevated); padding: var(--spacing-md); border-radius: var(--border-radius-md);">
                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-xs);">Fecha y Hora</div>
                    <div style="font-weight: 600;">${this.formatDate(event.date)} - ${event.time}</div>
                </div>
                <div style="background: var(--color-bg-elevated); padding: var(--spacing-md); border-radius: var(--border-radius-md);">
                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-xs);">Zona</div>
                    <div style="font-weight: 600;">${this.capitalizeZone(event.zone)}</div>
                </div>
                <div style="background: var(--color-bg-elevated); padding: var(--spacing-md); border-radius: var(--border-radius-md);">
                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-xs);">Capacidad</div>
                    <div style="font-weight: 600;">${event.accepted.length}/${event.capacity} confirmados</div>
                </div>
                <div style="background: var(--color-bg-elevated); padding: var(--spacing-md); border-radius: var(--border-radius-md);">
                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-xs);">Organizadora</div>
                    <div style="font-weight: 600;">${creator.alias} ⭐ ${creator.rating.toFixed(1)}</div>
                </div>
            </div>
            
            ${event.rules ? `
                <div style="background: var(--color-bg-elevated); padding: var(--spacing-lg); border-radius: var(--border-radius-md); margin-bottom: var(--spacing-lg);">
                    <h4 style="margin-bottom: var(--spacing-md);">Reglas del Encuentro</h4>
                    <p style="color: var(--color-text-secondary); line-height: 1.6;">${event.rules}</p>
                </div>
            ` : ''}
        `;
    },

    renderEventDetailBuscador(event) {
        const userApplication = event.applicants.find(a => a.userId === AppState.currentUser.id);
        const isApplied = !!userApplication;
        const isAccepted = userApplication?.status === 'ACEPTADO';
        const isRejected = userApplication?.status === 'RECHAZADO';
        const canApply = event.status === 'ABIERTO' && !isApplied;

        let actionButton = '';
        if (canApply) {
            actionButton = `<button class="btn btn-primary btn-block" onclick="app.applyToEvent('${event.id}')">Postularme a este Evento</button>`;
        } else if (isAccepted) {
            actionButton = `
                <div style="background: rgba(0, 255, 136, 0.1); border: 2px solid var(--color-success); padding: var(--spacing-lg); border-radius: var(--border-radius-md); text-align: center;">
                    <div style="font-size: 32px; margin-bottom: var(--spacing-sm);">✅</div>
                    <div style="font-weight: 700; color: var(--color-success); margin-bottom: var(--spacing-sm);">¡Has sido aceptado!</div>
                    <div style="color: var(--color-text-secondary); margin-bottom: var(--spacing-md);">Ubicación exacta: ${event.location}</div>
                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">Contacta con la organizadora para más detalles</div>
                </div>
            `;
        } else if (isRejected) {
            actionButton = `
                <div style="background: rgba(255, 68, 68, 0.1); border: 2px solid var(--color-error); padding: var(--spacing-lg); border-radius: var(--border-radius-md); text-align: center;">
                    <div style="font-size: 32px; margin-bottom: var(--spacing-sm);">❌</div>
                    <div style="font-weight: 700; color: var(--color-error);">Postulación rechazada</div>
                </div>
            `;
        } else {
            actionButton = `
                <div style="background: rgba(255, 170, 0, 0.1); border: 2px solid var(--color-warning); padding: var(--spacing-lg); border-radius: var(--border-radius-md); text-align: center;">
                    <div style="font-size: 32px; margin-bottom: var(--spacing-sm);">⏳</div>
                    <div style="font-weight: 700; color: var(--color-warning);">Postulación pendiente</div>
                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: var(--spacing-sm);">La organizadora revisará tu perfil pronto</div>
                </div>
            `;
        }

        return this.renderEventDetailGeneral(event) + actionButton;
    },

    renderEventDetailOferente(event) {
        const pendingApplicants = event.applicants.filter(a => a.status === 'PENDIENTE');
        const acceptedApplicants = event.applicants.filter(a => a.status === 'ACEPTADO');

        let applicantsSection = '';
        if (pendingApplicants.length > 0) {
            applicantsSection = `
                <div style="margin-top: var(--spacing-xl);">
                    <h4 style="margin-bottom: var(--spacing-md);">Postulaciones Pendientes (${pendingApplicants.length})</h4>
                    ${pendingApplicants.map(app => {
                const user = DataService.getUserById(app.userId);
                return `
                            <div style="background: var(--color-bg-elevated); padding: var(--spacing-lg); border-radius: var(--border-radius-md); margin-bottom: var(--spacing-md);">
                                <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                                    <img src="${user.avatar}" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid var(--color-accent-primary);">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 700; font-size: var(--font-size-lg);">${user.username}</div>
                                        <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">⭐ ${user.rating.toFixed(1)} (${user.reviewsCount} valoraciones)</div>
                                        ${user.age ? `<div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">📅 ${user.age} años</div>` : ''}
                                    </div>
                                </div>
                                ${user.bio ? `
                                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--border-radius-sm); margin-bottom: var(--spacing-md);">
                                        <div style="font-weight: 600; margin-bottom: var(--spacing-xs); font-size: var(--font-size-sm); color: var(--color-text-secondary);">Presentación:</div>
                                        <div style="color: var(--color-text-primary); font-size: var(--font-size-sm); line-height: 1.5;">${user.bio}</div>
                                    </div>
                                ` : ''}
                                ${user.searchZones && user.searchZones.length > 0 ? `
                                    <div style="margin-bottom: var(--spacing-md);">
                                        <div style="font-weight: 600; margin-bottom: var(--spacing-xs); font-size: var(--font-size-sm); color: var(--color-text-secondary);">Zonas de búsqueda:</div>
                                        <div style="display: flex; gap: var(--spacing-xs); flex-wrap: wrap;">
                                            ${user.searchZones.map(z => `<span style="background: rgba(255, 51, 102, 0.2); color: var(--color-accent-primary); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${this.capitalizeZone(z)}</span>`).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                ${user.reviews.length > 0 ? `
                                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--border-radius-sm); margin-bottom: var(--spacing-md);">
                                        <div style="font-weight: 600; margin-bottom: var(--spacing-sm); font-size: var(--font-size-sm);">Última valoración:</div>
                                        <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">"${user.reviews[user.reviews.length - 1].comment}"</div>
                                        ${user.reviews[user.reviews.length - 1].reviewerUsername ? `<div style="color: var(--color-text-tertiary); font-size: 11px; margin-top: 4px; font-style: italic;">- ${user.reviews[user.reviews.length - 1].reviewerUsername}</div>` : ''}
                                    </div>
                                ` : ''}
                                ${user.gallery && user.gallery.length > 0 ? `
                                    <div style="margin-bottom: var(--spacing-md);">
                                        <div style="font-weight: 600; margin-bottom: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary);">Galería de imágenes:</div>
                                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm);">
                                            ${user.gallery.map(img => `
                                                <img src="${img}" onclick="app.showImageModal('${img}')" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--border-radius-sm); cursor: pointer; transition: transform var(--transition-fast);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                <div style="display: flex; gap: var(--spacing-sm);">
                                    <button class="btn btn-success" style="flex: 1;" onclick="app.acceptApplicant('${event.id}', '${user.id}')">Aceptar</button>
                                    <button class="btn btn-danger" style="flex: 1;" onclick="app.rejectApplicant('${event.id}', '${user.id}')">Rechazar</button>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        let acceptedSection = '';
        if (acceptedApplicants.length > 0) {
            acceptedSection = `
                <div style="margin-top: var(--spacing-xl);">
                    <h4 style="margin-bottom: var(--spacing-md);">Asistentes Confirmados (${acceptedApplicants.length})</h4>
                    ${acceptedApplicants.map(app => {
                const user = DataService.getUserById(app.userId);
                return `
                            <div style="background: rgba(0, 255, 136, 0.05); padding: var(--spacing-md); border-radius: var(--border-radius-md); margin-bottom: var(--spacing-sm); display: flex; align-items: center; gap: var(--spacing-md);">
                                <img src="${user.avatar}" style="width: 40px; height: 40px; border-radius: 50%;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600;">${user.alias}</div>
                                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">⭐ ${user.rating.toFixed(1)}</div>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        let actionButtons = '';
        if (event.status === 'ABIERTO') {
            actionButtons = `
                <div style="margin-top: var(--spacing-xl); display: flex; gap: var(--spacing-md);">
                    <button class="btn btn-secondary" style="flex: 1;" onclick="app.closeApplications('${event.id}')">Cerrar Postulaciones</button>
                    <button class="btn btn-danger" onclick="app.deleteEvent('${event.id}')">Cancelar Evento</button>
                </div>
            `;
        } else if (event.status === 'POSTULACIONES_CERRADAS') {
            actionButtons = `
                <div style="margin-top: var(--spacing-xl);">
                    <button class="btn btn-primary btn-block" onclick="app.showFinishEvent('${event.id}')">Marcar como Finalizado y Valorar</button>
                </div>
            `;
        }

        return this.renderEventDetailGeneral(event) + applicantsSection + acceptedSection + actionButtons;
    },

    closeEventDetail() {
        document.getElementById('event-detail-modal').classList.remove('active');
        this.loadViewData(AppState.currentView);
    },

    // ===== EVENT ACTIONS =====
    showCreateEvent() {
        document.getElementById('create-event-modal').classList.add('active');
    },

    closeCreateEvent() {
        document.getElementById('create-event-modal').classList.remove('active');
        document.getElementById('create-event-form').reset();
    },

    handleCreateEvent() {
        const eventData = {
            title: document.getElementById('event-title').value,
            description: document.getElementById('event-description').value,
            date: document.getElementById('event-date').value,
            time: document.getElementById('event-time').value,
            gangbangLevel: document.querySelector('input[name="gangbang-level"]:checked').value,
            capacity: parseInt(document.getElementById('event-capacity').value),
            zone: document.getElementById('event-zone').value,
            location: document.getElementById('event-location').value,
            rules: document.getElementById('event-rules').value
        };

        DataService.createEvent(eventData, AppState.currentUser.id);
        this.closeCreateEvent();
        this.showToast('Evento creado exitosamente', 'success');
        this.loadEvents();
    },

    applyToEvent(eventId) {
        const success = DataService.applyToEvent(eventId, AppState.currentUser.id);
        if (success) {
            this.showToast('Postulación enviada correctamente', 'success');
            this.closeEventDetail();
            this.loadEvents();
        } else {
            this.showToast('No se pudo enviar la postulación', 'error');
        }
    },

    acceptApplicant(eventId, userId) {
        DataService.acceptApplicant(eventId, userId);
        this.showToast('Candidato aceptado', 'success');
        this.showEventDetail(eventId);
    },

    rejectApplicant(eventId, userId) {
        DataService.rejectApplicant(eventId, userId);
        this.showToast('Candidato rechazado', 'info');
        this.showEventDetail(eventId);
    },

    closeApplications(eventId) {
        if (confirm('¿Estás segura de cerrar las postulaciones? Todos los candidatos pendientes serán rechazados automáticamente.')) {
            DataService.closeApplications(eventId);
            this.showToast('Postulaciones cerradas', 'info');
            this.showEventDetail(eventId);
        }
    },

    showFinishEvent(eventId) {
        const event = DataService.getEventById(eventId);
        const acceptedUsers = event.accepted.map(userId => DataService.getUserById(userId));

        const modal = document.getElementById('event-detail-modal');
        const content = document.getElementById('event-detail-content');

        content.innerHTML = `
            <h3 style="margin-bottom: var(--spacing-lg);">Valorar Asistentes</h3>
            <form id="finish-event-form">
                ${acceptedUsers.map(user => `
                    <div style="background: var(--color-bg-elevated); padding: var(--spacing-lg); border-radius: var(--border-radius-md); margin-bottom: var(--spacing-md);">
                        <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                            <img src="${user.avatar}" style="width: 50px; height: 50px; border-radius: 50%;">
                            <div style="font-weight: 700; font-size: var(--font-size-lg);">${user.alias}</div>
                        </div>
                        <div style="margin-bottom: var(--spacing-md);">
                            <label style="display: block; margin-bottom: var(--spacing-sm); color: var(--color-text-secondary);">Valoración</label>
                            <div style="display: flex; gap: var(--spacing-sm);">
                                ${[1, 2, 3, 4, 5].map(star => `
                                    <label style="cursor: pointer;">
                                        <input type="radio" name="rating-${user.id}" value="${star}" required style="display: none;">
                                        <span class="star-rating" data-user="${user.id}" data-value="${star}" style="font-size: 32px; opacity: 0.3; transition: all 0.2s;">⭐</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: var(--spacing-sm); color: var(--color-text-secondary);">Comentario</label>
                            <textarea id="comment-${user.id}" rows="3" style="width: 100%; padding: var(--spacing-md); background: var(--color-bg-secondary); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--border-radius-md); color: var(--color-text-primary); font-family: var(--font-family);" required></textarea>
                        </div>
                    </div>
                `).join('')}
                <button type="submit" class="btn btn-primary btn-block">Finalizar Evento y Guardar Valoraciones</button>
            </form>
        `;

        // Star rating interaction
        document.querySelectorAll('.star-rating').forEach(star => {
            star.addEventListener('click', function () {
                const userId = this.dataset.user;
                const value = parseInt(this.dataset.value);
                const radio = document.querySelector(`input[name="rating-${userId}"][value="${value}"]`);
                radio.checked = true;

                // Update visual stars
                document.querySelectorAll(`.star-rating[data-user="${userId}"]`).forEach(s => {
                    const starValue = parseInt(s.dataset.value);
                    s.style.opacity = starValue <= value ? '1' : '0.3';
                });
            });
        });

        document.getElementById('finish-event-form').addEventListener('submit', (e) => {
            e.preventDefault();

            const ratings = acceptedUsers.map(user => ({
                userId: user.id,
                stars: parseInt(document.querySelector(`input[name="rating-${user.id}"]:checked`).value),
                comment: document.getElementById(`comment-${user.id}`).value
            }));

            DataService.finishEvent(eventId, ratings);
            this.showToast('Evento finalizado y valoraciones guardadas', 'success');
            this.closeEventDetail();
            this.loadEvents();
        });
    },

    deleteEvent(eventId) {
        if (confirm('¿Estás segura de cancelar este evento?')) {
            DataService.deleteEvent(eventId);
            this.showToast('Evento cancelado', 'info');
            this.closeEventDetail();
            this.loadEvents();
        }
    },

    // ===== MY EVENTS =====
    loadMyEvents() {
        const container = document.getElementById('my-events-container');

        if (AppState.currentUser.role === 'OFERENTE') {
            const myEvents = DataService.getEventsByCreator(AppState.currentUser.id);
            if (myEvents.length === 0) {
                container.innerHTML = '<p style="color: var(--color-text-tertiary); text-align: center;">No has creado ningún evento aún.</p>';
            } else {
                container.innerHTML = `<div class="events-grid">${myEvents.map(e => this.renderEventCard(e)).join('')}</div>`;
            }
        } else {
            const allEvents = DataService.getAllEvents();
            const myApplications = allEvents.filter(e => e.applicants.some(a => a.userId === AppState.currentUser.id));

            if (myApplications.length === 0) {
                container.innerHTML = '<p style="color: var(--color-text-tertiary); text-align: center;">No te has postulado a ningún evento aún.</p>';
            } else {
                container.innerHTML = `<div class="events-grid">${myApplications.map(e => this.renderEventCard(e)).join('')}</div>`;
            }
        }
    },

    // ===== PROFILE =====
    loadProfile() {
        const container = document.getElementById('profile-container');
        const user = AppState.currentUser;

        const verificationBadge = user.verified === 'VERIFICADO'
            ? '<span style="color: var(--color-success);">✓ Verificado</span>'
            : '<span style="color: var(--color-warning);">⏳ Pendiente de verificación</span>';

        const zoneOptions = ['norte', 'sur', 'este', 'oeste', 'centro'];

        container.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: var(--spacing-2xl);">
                    <img src="${user.avatar}" style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid var(--color-accent-primary); margin-bottom: var(--spacing-md);">
                    <h2 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-sm);">${user.username}</h2>
                    <div style="color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">${user.role}</div>
                    <div>${verificationBadge}</div>
                    ${user.role === 'BUSCADOR' ? '<button class="btn btn-secondary btn-small" onclick="app.toggleProfileEdit()" style="margin-top: var(--spacing-md);">✏️ Editar Perfil</button>' : ''}
                </div>
                
                <div id="profile-edit-form" style="display: none; background: var(--color-bg-secondary); padding: var(--spacing-xl); border-radius: var(--border-radius-lg); margin-bottom: var(--spacing-2xl);">
                    <h3 style="margin-bottom: var(--spacing-lg);">Editar Perfil</h3>
                    <form id="edit-profile-form">
                        <div class="form-group">
                            <label>Foto de Perfil</label>
                            <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-sm);">
                                <img id="avatar-preview" src="${user.avatar}" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid var(--color-accent-primary);">
                                <div style="flex: 1;">
                                    <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
                                    <button type="button" class="btn btn-secondary btn-small" onclick="document.getElementById('avatar-upload').click()">📷 Cambiar Foto</button>
                                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: var(--spacing-xs);">Selecciona una imagen de tu ordenador</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Galería de Imágenes (Máximo 3 - Solo visible para oferentes)</label>
                            <div id="gallery-preview" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
                                ${(user.gallery || []).map((img, idx) => `
                                    <div style="position: relative;">
                                        <img src="${img}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--border-radius-md); border: 2px solid var(--color-accent-primary);">
                                        <button type="button" onclick="app.removeGalleryImage(${idx})" style="position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; background: var(--color-error); color: white; border: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">✕</button>
                                    </div>
                                `).join('')}
                                ${(user.gallery || []).length < 3 ? `
                                    <div onclick="document.getElementById('gallery-upload').click()" style="aspect-ratio: 1; border: 2px dashed var(--color-accent-primary); border-radius: var(--border-radius-md); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; background: var(--color-bg-elevated); transition: all var(--transition-fast);" onmouseover="this.style.background='var(--color-bg-hover)'" onmouseout="this.style.background='var(--color-bg-elevated)'">
                                        <span style="font-size: 32px; color: var(--color-accent-primary);">+</span>
                                        <span style="font-size: 12px; color: var(--color-text-tertiary); margin-top: 4px;">Agregar imagen</span>
                                    </div>
                                ` : ''}
                            </div>
                            <input type="file" id="gallery-upload" accept="image/*" style="display: none;">
                        </div>
                        
                        <div class="form-group">
                            <label>Edad</label>
                            <input type="number" id="edit-age" value="${user.age || ''}" min="18" max="99">
                        </div>
                        <div class="form-group">
                            <label>Presentación</label>
                            <textarea id="edit-bio" rows="4">${user.bio || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Zonas de Búsqueda</label>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm);">
                                ${zoneOptions.map(zone => `
                                    <label style="display: flex; align-items: center; gap: var(--spacing-xs); cursor: pointer;">
                                        <input type="checkbox" name="searchZones" value="${zone}" ${user.searchZones && user.searchZones.includes(zone) ? 'checked' : ''}>
                                        <span>${this.capitalizeZone(zone)}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div style="display: flex; gap: var(--spacing-md);">
                            <button type="submit" class="btn btn-primary" style="flex: 1;">Guardar Cambios</button>
                            <button type="button" class="btn btn-secondary" onclick="app.toggleProfileEdit()">Cancelar</button>
                        </div>
                    </form>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--spacing-md); margin-bottom: var(--spacing-2xl);">
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-lg); border-radius: var(--border-radius-md); text-align: center;">
                        <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent-primary);">⭐ ${user.rating.toFixed(1)}</div>
                        <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">Valoración</div>
                    </div>
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-lg); border-radius: var(--border-radius-md); text-align: center;">
                        <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent-primary);">${user.reviewsCount}</div>
                        <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">Valoraciones</div>
                    </div>
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-lg); border-radius: var(--border-radius-md); text-align: center;">
                        <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent-primary);">${user.age || '-'}</div>
                        <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">Años</div>
                    </div>
                </div>
                
                ${user.bio ? `
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-xl); border-radius: var(--border-radius-lg); margin-bottom: var(--spacing-lg);">
                        <h3 style="margin-bottom: var(--spacing-md);">Sobre mí</h3>
                        <p style="color: var(--color-text-secondary); line-height: 1.6;">${user.bio}</p>
                    </div>
                ` : ''}
                
                ${user.searchZones && user.searchZones.length > 0 ? `
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-xl); border-radius: var(--border-radius-lg); margin-bottom: var(--spacing-lg);">
                        <h3 style="margin-bottom: var(--spacing-md);">Zonas de Búsqueda</h3>
                        <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                            ${user.searchZones.map(z => `<span style="background: rgba(255, 51, 102, 0.2); color: var(--color-accent-primary); padding: 8px 16px; border-radius: 8px; font-weight: 600;">${this.capitalizeZone(z)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${user.reviews.length > 0 ? `
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-xl); border-radius: var(--border-radius-lg);">
                        <h3 style="margin-bottom: var(--spacing-lg);">Valoraciones Recibidas</h3>
                        ${user.reviews.map(review => `
                            <div style="background: var(--color-bg-elevated); padding: var(--spacing-lg); border-radius: var(--border-radius-md); margin-bottom: var(--spacing-md);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                                    <div style="color: var(--color-accent-primary); font-weight: 700;">${'⭐'.repeat(review.rating)}</div>
                                    <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">${this.formatDate(review.date)}</div>
                                </div>
                                <p style="color: var(--color-text-secondary); line-height: 1.6; margin-bottom: var(--spacing-xs);">"${review.comment}"</p>
                                ${review.reviewerUsername ? `<div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm); font-style: italic;">- ${review.reviewerUsername}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-xl); border-radius: var(--border-radius-lg); text-align: center;">
                        <p style="color: var(--color-text-tertiary);">Aún no tienes valoraciones</p>
                    </div>
                `}
            </div>
        `;

        // Add event listener for profile edit form
        const editForm = document.getElementById('edit-profile-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileEdit();
            });
        }

        // Avatar upload handler
        const avatarUpload = document.getElementById('avatar-upload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        document.getElementById('avatar-preview').src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Gallery upload handler
        const galleryUpload = document.getElementById('gallery-upload');
        if (galleryUpload) {
            galleryUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.addImageToGallery(event.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    },

    toggleProfileEdit() {
        const form = document.getElementById('profile-edit-form');
        if (form.style.display === 'none') {
            form.style.display = 'block';
        } else {
            form.style.display = 'none';
        }
    },

    handleProfileEdit() {
        const age = document.getElementById('edit-age').value;
        const bio = document.getElementById('edit-bio').value;
        const searchZones = Array.from(document.querySelectorAll('input[name="searchZones"]:checked')).map(cb => cb.value);
        const avatar = document.getElementById('avatar-preview').src;

        const updates = {
            age: age ? parseInt(age) : null,
            bio: bio,
            searchZones: searchZones,
            avatar: avatar,
            gallery: AppState.currentUser.gallery || []
        };

        const updatedUser = DataService.updateUser(AppState.currentUser.id, updates);
        if (updatedUser) {
            AppState.currentUser = updatedUser;
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            this.showToast('Perfil actualizado correctamente', 'success');
            this.toggleProfileEdit();
            this.loadProfile();
        } else {
            this.showToast('Error al actualizar el perfil', 'error');
        }
    },


    addImageToGallery(imageUrl) {
        if (!AppState.currentUser.gallery) {
            AppState.currentUser.gallery = [];
        }

        if (AppState.currentUser.gallery.length >= 3) {
            this.showToast('Máximo 3 imágenes en la galería', 'warning');
            return;
        }

        AppState.currentUser.gallery.push(imageUrl);
        this.loadProfile();
        this.toggleProfileEdit(); // Open edit form to show the new image
    },

    removeGalleryImage(index) {
        if (confirm('¿Eliminar esta imagen de la galería?')) {
            AppState.currentUser.gallery.splice(index, 1);
            this.loadProfile();
            this.toggleProfileEdit(); // Open edit form to show the change
        }
    },

    // ===== ADMIN PANEL =====
    loadAdmin() {
        if (AppState.currentUser.role !== 'ADMIN') return;

        const container = document.getElementById('admin-container');
        const stats = DataService.getStats();
        const users = DataService.getAllUsers();
        const events = DB.events;
        const auditLog = DataService.getAuditLog().slice(0, 50);

        container.innerHTML = `
            <h2 style="margin-bottom: var(--spacing-xl);">Panel de Administración</h2>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-md); margin-bottom: var(--spacing-2xl);">
                <div style="background: var(--color-bg-secondary); padding: var(--spacing-lg); border-radius: var(--border-radius-md);">
                    <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent-primary);">${stats.totalUsers}</div>
                    <div style="color: var(--color-text-tertiary);">Total Usuarios</div>
                </div>
                <div style="background: var(--color-bg-secondary); padding: var(--spacing-lg); border-radius: var(--border-radius-md);">
                    <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-success);">${stats.verifiedUsers}</div>
                    <div style="color: var(--color-text-tertiary);">Verificados</div>
                </div>
                <div style="background: var(--color-bg-secondary); padding: var(--spacing-lg); border-radius: var(--border-radius-md);">
                    <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-info);">${stats.totalEvents}</div>
                    <div style="color: var(--color-text-tertiary);">Total Eventos</div>
                </div>
                <div style="background: var(--color-bg-secondary); padding: var(--spacing-lg); border-radius: var(--border-radius-md);">
                    <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-warning);">${stats.acceptanceRate}%</div>
                    <div style="color: var(--color-text-tertiary);">Tasa Aceptación</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-xl);">
                <div>
                    <h3 style="margin-bottom: var(--spacing-md);">Usuarios (${users.length})</h3>
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-lg); border-radius: var(--border-radius-lg); max-height: 500px; overflow-y: auto;">
                        ${users.map(user => `
                            <div style="display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-md); background: var(--color-bg-elevated); border-radius: var(--border-radius-md); margin-bottom: var(--spacing-sm);">
                                <img src="${user.avatar}" style="width: 40px; height: 40px; border-radius: 50%;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600;">${user.alias}</div>
                                    <div style="font-size: var(--font-size-sm); color: var(--color-text-tertiary);">${user.role} - ${user.verified}</div>
                                </div>
                                ${user.role !== 'ADMIN' ? `<button class="btn btn-danger btn-small" onclick="app.adminDeleteUser('${user.id}')">Eliminar</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <h3 style="margin-bottom: var(--spacing-md);">Eventos (${events.length})</h3>
                    <div style="background: var(--color-bg-secondary); padding: var(--spacing-lg); border-radius: var(--border-radius-lg); max-height: 500px; overflow-y: auto;">
                        ${events.map(event => `
                            <div style="padding: var(--spacing-md); background: var(--color-bg-elevated); border-radius: var(--border-radius-md); margin-bottom: var(--spacing-sm);">
                                <div style="font-weight: 600; margin-bottom: var(--spacing-xs);">${event.title}</div>
                                <div style="font-size: var(--font-size-sm); color: var(--color-text-tertiary); margin-bottom: var(--spacing-sm);">
                                    ${event.gangbangLevel} - ${event.status}
                                </div>
                                <button class="btn btn-danger btn-small" onclick="app.adminDeleteEvent('${event.id}')">Eliminar</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div style="margin-top: var(--spacing-2xl);">
                <h3 style="margin-bottom: var(--spacing-md);">Registro de Auditoría (últimas 50 acciones)</h3>
                <div style="background: var(--color-bg-secondary); padding: var(--spacing-lg); border-radius: var(--border-radius-lg); max-height: 400px; overflow-y: auto;">
                    ${auditLog.map(log => `
                        <div style="padding: var(--spacing-sm); border-bottom: 1px solid rgba(255,255,255,0.05); font-size: var(--font-size-sm);">
                            <span style="color: var(--color-accent-primary); font-weight: 600;">${log.action}</span>
                            <span style="color: var(--color-text-tertiary);"> - ${log.userId} - ${this.formatDate(log.timestamp)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    adminDeleteUser(userId) {
        if (confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
            DataService.deleteUser(userId);
            this.showToast('Usuario eliminado', 'info');
            this.loadAdmin();
        }
    },

    adminDeleteEvent(eventId) {
        if (confirm('¿Estás seguro de eliminar este evento?')) {
            DataService.deleteEvent(eventId);
            this.showToast('Evento eliminado', 'info');
            this.loadAdmin();
        }
    },

    // ===== UTILITIES =====
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    formatDate(date) {
        if (typeof date === 'string') {
            const d = new Date(date);
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
