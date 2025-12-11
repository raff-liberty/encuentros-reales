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
                        // Normalizar avatar_url a avatar para compatibilidad con UI
                        profile.avatar = profile.avatar_url || profile.avatar;
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

        // Cargar postulaciones del usuario al iniciar
        if (AppState.currentUser && AppState.currentUser.role === 'BUSCADOR') {
            await this.refreshUserApplications();
        }

        // Cargar estadísticas de navegación
        this.updateNavCounts();

        // Iniciar polling de notificaciones
        this.initNotificationPolling();

        // Event listeners
        this.setupEventListeners();

        console.log('✅ Aplicación inicializada');
    },

    setupEventListeners() {
        // Formulario de autenticación
        // Formulario de autenticación
        // El listener se maneja vía onsubmit en HTML para evitar duplicidad
        /*
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuth(e);
            });
        }
        */

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

    // ===== WIZARD REGISTRATION =====
    registrationState: {
        step: 1,
        data: {
            role: '',
            email: '',
            password: '',
            fullName: '',
            username: '',
            birthDate: '',
            province: '',
            photos: { face: null, id: null }
        }
    },

    startRegistration() {
        document.getElementById('view-login').classList.remove('active');
        document.getElementById('auth-title').textContent = 'Crear Cuenta';
        document.getElementById('wizard-progress').classList.remove('hidden');
        this.showWizardStep(1);
    },

    cancelRegistration() {
        document.getElementById('wizard-progress').classList.add('hidden');
        this.showWizardStep('login'); // 'login' is a special key here or we handle it manually
        document.getElementById('auth-title').textContent = 'Bienvenido';
        document.getElementById('view-login').classList.add('active');

        // Reset steps visibility
        document.querySelectorAll('.wizard-step').forEach(s => {
            if (s.id !== 'view-login') s.classList.remove('active');
        });
    },

    showWizardStep(step) {
        // Hide all steps/views except auth header
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));

        if (step === 'login') {
            document.getElementById('view-login').classList.add('active');
            return;
        }

        const stepEl = document.getElementById(`reg-step-${step}`);
        if (stepEl) stepEl.classList.add('active');

        // Update dots
        document.querySelectorAll('.step-dot').forEach(dot => {
            const dotStep = parseInt(dot.dataset.step);
            dot.classList.toggle('active', dotStep <= step);
        });

        this.registrationState.step = step;
    },

    // Textos de Normas
    roleRules: {
        OFERENTE: `
            <h4>Responsabilidades de la Organizadora</h4>
            <ul>
                <li><strong>Crear eventos reales</strong>, con intención de realizarlos.</li>
                <li><strong>Definir el nivel del evento</strong> (Tradicional, Sumiso, Estructurado).</li>
                <li><strong>Describir el evento con claridad</strong>, incluyendo reglas básicas.</li>
                <li><strong>Aceptar únicamente a participantes</strong> con los que realmente desee coincidir.</li>
                <li><strong>Respetar el compromiso adquirido</strong> al aceptar postulaciones.</li>
                <li><strong>Ser objetiva y honesta</strong> en sus valoraciones posteriores.</li>
                <li><strong>Reportar comportamientos inapropiados</strong> o perfiles dudosos.</li>
                <li><strong>Respetar límites</strong> y consentimientos definidos.</li>
            </ul>

            <h4>Derechos de la Organizadora</h4>
            <ul>
                <li>Ver perfiles verificados y reputación real de los buscadores.</li>
                <li>Elegir libremente a quién aceptar o rechazar.</li>
                <li>Recibir protección frente a perfiles falsos o usuarios fantasma.</li>
                <li>Acceder a medios de contacto solo de usuarios aceptados.</li>
                <li>Cerrar postulaciones cuando considere oportuno.</li>
                <li>Bloquear o reportar a quien incumpla normas o expectativas mínimas.</li>
            </ul>

            <h4>Expectativas que debe conocer</h4>
            <ul>
                <li>Aceptar a un candidato implica revelación de datos y compromiso real.</li>
                <li>Sus valoraciones afectan directamente al ecosistema.</li>
                <li>La plataforma la apoya con control, trazabilidad y admin detrás.</li>
            </ul>
        `,
        BUSCADOR: `
            <h4>Responsabilidades del Buscador</h4>
            <ul>
                <li><strong>Postularse únicamente con intención real</strong> de asistir.</li>
                <li><strong>Presentar un perfil auténtico</strong>, con fotos reales y verificables.</li>
                <li><strong>Mantener buen comportamiento</strong> antes, durante y después del encuentro.</li>
                <li><strong>Cumplir con la dinámica del evento</strong> según el nivel elegido por la organizadora.</li>
                <li><strong>Avisar si no puede asistir</strong> (evitar reputación negativa).</li>
                <li><strong>Respetar todas las reglas</strong> del evento y los límites de la organizadora.</li>
                <li><strong>No compartir datos sensibles</strong> fuera del contexto autorizado.</li>
            </ul>

            <h4>Derechos del Buscador</h4>
            <ul>
                <li>Ser evaluado de forma justa y pública.</li>
                <li>Ser seleccionado o rechazado sin discriminación abusiva.</li>
                <li>Tener control sobre su información personal (solo visible tras aceptación).</li>
                <li>Reportar comportamientos inapropiados.</li>
                <li>Acceder a eventos reales y organizadoras verificadas.</li>
            </ul>

            <h4>Expectativas que debe conocer</h4>
            <ul>
                <li>Su reputación es visible y acumulativa.</li>
                <li>Comportarse como “fantasma” afecta duramente a su perfil.</li>
                <li>Fotos irreales o engaños → rechazo inmediato + riesgo de expulsión.</li>
                <li>La plataforma es seria: no hay roleplay ni simulación.</li>
            </ul>
        `
    },

    selectRole(role) {
        this.registrationState.data.role = role;
        document.getElementById('reg-role').value = role;

        // Visual selection
        document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
        // Find the card clicked - simple DOM traversal or query
        const cards = document.querySelectorAll('.role-card');
        if (role === 'OFERENTE') cards[0].classList.add('selected');
        else cards[1].classList.add('selected');

        // Show Rules Step instead of going directly to step 2
        this.showRulesStep(role);
    },

    showRulesStep(role) {
        const content = this.roleRules[role];
        document.getElementById('rules-content').innerHTML = content;
        document.getElementById('rules-title').textContent = role === 'OFERENTE' ? 'Normas para Organizadoras' : 'Normas para Buscadores';

        // Hide Step 1, Show Rules
        document.getElementById('reg-step-1').classList.remove('active');
        document.getElementById('reg-step-rules').classList.add('active');
    },

    acceptRules() {
        // Move to Step 2
        document.getElementById('reg-step-rules').classList.remove('active');
        this.showWizardStep(2);
    },

    prevStep() {
        if (this.registrationState.step > 1) {
            this.showWizardStep(this.registrationState.step - 1);
        }
    },

    submitStep2(event) {
        event.preventDefault();
        // Collect data
        this.registrationState.data.email = document.getElementById('reg-email').value;
        this.registrationState.data.password = document.getElementById('reg-password').value;
        this.registrationState.data.fullName = document.getElementById('reg-fullname').value;
        this.registrationState.data.username = document.getElementById('reg-username').value;
        this.registrationState.data.birthDate = document.getElementById('reg-birthdate').value;
        this.registrationState.data.province = document.getElementById('reg-province').value;

        this.showWizardStep(3);
    },

    handleRegPhoto(type, input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Store base64 preview
                this.registrationState.data.photos[type] = e.target.result;
                // Show preview
                const previewEl = document.getElementById(`preview-${type}`);
                previewEl.innerHTML = `<img src="${e.target.result}">`;
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    async finishRegistration() {
        const { photos } = this.registrationState.data;
        if (!photos.face || !photos.id) {
            this.showToast('Debes subir ambas fotos para continuar', 'error');
            return;
        }

        this.showToast('Enviando registro...', 'info');

        try {
            // Send to Backend
            // NOTE: In a real app we'd upload photos to Storage and get URLs first.
            // For this demo, we might store them as base64 or mock URLs.
            // Let's assume SupabaseService handles the user creation.

            await SupabaseService.signUp(
                this.registrationState.data.email,
                this.registrationState.data.password,
                {
                    username: this.registrationState.data.username,
                    full_name: this.registrationState.data.fullName,
                    role: this.registrationState.data.role,
                    birth_date: this.registrationState.data.birthDate,
                    province: this.registrationState.data.province,
                    verified: 'PENDIENTE',
                    // Save photo previews strictly for demo/admin view (normally too heavy for metadata)
                    verification_photos: this.registrationState.data.photos
                }
            );

            // Show Success Step
            this.showWizardStep(4);

        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    // ===== LOGIN UPDATED =====
    async handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        this.showToast('Iniciando sesión...', 'info');

        try {
            const user = await SupabaseService.signIn(email, password);

            // CHECK VERIFICATION STATUS
            if (user.verified === 'PENDIENTE') {
                this.showToast('Tu cuenta aún está pendiente de verificación.', 'warning');
                // Force logout to clear session context locally if any
                await SupabaseService.signOut();
                return;
            }

            if (user.verified === 'RECHAZADO' || user.verified === 'BLOQUEADO') {
                this.showToast('Tu cuenta ha sido rechazada o bloqueada.', 'error');
                await SupabaseService.signOut();
                return;
            }

            // Normalizar avatar_url a avatar para compatibilidad con UI
            user.avatar = user.avatar_url || user.avatar;
            AppState.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));

            this.showToast('¡Bienvenido de nuevo!', 'success');
            this.showApp();

        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Error:Credenciales inválidas o error de conexión', 'error');
        }
    },

    async logout() {
        await SupabaseService.signOut();
        AppState.currentUser = null;
        localStorage.removeItem('currentUser');
        location.reload();
    },

    async showApp() {
        document.getElementById('auth-modal').classList.remove('active');
        document.getElementById('app-container').classList.remove('hidden');
        this.updateHeader();

        // Cargar postulaciones PRIMERO pero SIN BLOQUEAR la UI (setTimeout 500ms para asegurar carga)
        if (AppState.currentUser.role === 'BUSCADOR') {
            setTimeout(() => this.refreshUserApplications(), 500);
        }

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

        // Iniciar polling
        this.initNotificationPolling();
    },

    updateHeader() {
        const user = AppState.currentUser;
        console.log('🔄 updateHeader called with user:', user?.username, 'avatar:', user?.avatar, 'avatar_url:', user?.avatar_url);

        document.getElementById('header-username').textContent = `¡Hola, ${user.username}!`;
        document.getElementById('header-role').textContent = `Panel de ${user.role === 'OFERENTE' ? 'Oferente' : 'Buscador'}`;

        // Avatar - Verificar AMBOS campos: avatar y avatar_url
        const avatarContainer = document.getElementById('header-avatar');
        const avatarUrl = user.avatar || user.avatar_url;

        if (avatarUrl) {
            console.log('✅ Mostrando avatar:', avatarUrl);
            avatarContainer.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            console.log('❌ No hay avatar, mostrando icono');
            const icon = user.role === 'OFERENTE' ? '👑' : '🔍';
            avatarContainer.innerHTML = `<span id="header-avatar-icon">${icon}</span>`;
        }
    },

    initNotificationPolling() {
        // Iniciar polling de notificaciones
        if (this.notificationPoller) clearInterval(this.notificationPoller);
        this.notificationPoller = setInterval(() => {
            if (AppState.currentUser) {
                this.updateNotificationsBadge();
                // Sincronizar también las postulaciones para mantener contadores al día
                if (AppState.currentUser.role === 'BUSCADOR') {
                    this.refreshUserApplications();
                }
                // Si el panel de notificaciones está abierto, recargarlo
                const panel = document.getElementById('notifications-panel');
                if (panel && !panel.classList.contains('hidden')) {
                    this.loadNotifications();
                }
            }
        }, 30000); // 30 segundos
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
                applicationsTab.querySelector('span:nth-child(2)').textContent = 'Mis Eventos (Creados)';
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
    },

    async refreshUserApplications() {
        if (!AppState.currentUser) return;
        try {
            const apps = await SupabaseService.getApplicationsByUser(AppState.currentUser.id);

            // AUTO-CORRECCIÓN DE DATOS (Frontend Patch):
            // Si el evento finalizó pero la postulación quedó atrapada en ACEPTADO por RLS,
            // la corregimos en memoria para que toda la UI (contadores, tarjetas, botones) sea consistente.
            const patchedApps = apps.map(app => {
                if (app.status === 'ACEPTADO' && app.event && app.event.status === 'FINALIZADO') {
                    return { ...app, status: 'FINALIZADO' };
                }
                return app;
            });

            AppState.myApplications = patchedApps; // Guardamos los datos corregidos

            this.updateNavCounts();

            // MODIFICACIÓN: Desactivado para evitar recargas automáticas molestas.
            /*
            // Si estamos en la vista de explorar o postulaciones, refrescar para mostrar cambios
            if (AppState.currentView === 'explore') {
                this.loadExploreView();
            } else if (AppState.currentView === 'applications') {
                this.loadApplicationsView();
            }
            */
        } catch (error) {
            console.error('Error refreshing applications:', error);
        }
    },

    updateNavCounts() {
        try {
            // Mis Postulaciones
            const appsCount = document.getElementById('applications-count');
            if (appsCount && AppState.myApplications) {
                appsCount.textContent = AppState.myApplications.length;
                appsCount.classList.remove('hidden');
            }

            // Actualizar contador de notificaciones
            this.updateNotificationsBadge();
        } catch (e) { console.warn(e); }
    },

    // ===== NOTIFICACIONES =====
    // ===== NOTIFICACIONES =====
    async updateNotificationsBadge() {
        const user = AppState.currentUser;
        if (!user) return;

        try {
            const notifications = await SupabaseService.getNotificationsByUser(user.id);
            const unreadCount = notifications.filter(n => !n.read).length;

            const badge = document.getElementById('notifications-badge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } catch (e) {
            console.warn('Error updating badge:', e);
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

    closeRateModal() {
        const modal = document.getElementById('rate-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    async loadNotifications() {
        const user = AppState.currentUser;
        if (!user) return; // Guard clause

        try {
            const notifications = await SupabaseService.getNotificationsByUser(user.id);
            const container = document.getElementById('notifications-list');

            if (!container) return; // Guard clause if panel not in DOM

            if (notifications.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: var(--spacing-xl); text-align: center;">
                        <div style="font-size: 48px; margin-bottom: var(--spacing-md);">🔔</div>
                        <p style="color: var(--color-text-secondary);">No tienes notificaciones</p>
                    </div>
                `;
                return;
            }

            // Supabase returns dates as strings, sort works if ISO, but safer to new Date
            // Supabase order() already handles this usually, but let's be safe
            // notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            container.innerHTML = notifications.map(notif => `
                <div class="notification-item ${notif.read ? 'read' : 'unread'}" onclick="app.handleNotificationClick('${notif.id}')">
                    <div class="notification-content">
                        <h4 class="notification-title">${notif.title}</h4>
                        <p class="notification-message">${notif.message}</p>
                        <span class="notification-time">${this.getTimeAgo(notif.created_at)}</span>
                    </div>
                    ${!notif.read ? '<span class="notification-dot"></span>' : ''}
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    },

    async handleNotificationClick(notificationId) {
        try {
            // Marcar como leída
            await SupabaseService.markNotificationAsRead(notificationId);

            // Actualizar vista
            this.loadNotifications();
            this.updateNotificationsBadge();

            // Obtener notificación para ver si tiene relatedId
            // Como ya la marcamos, podríamos optimizar pasando la notif por argumento, pero fetch es seguro
            const notifications = await SupabaseService.getNotificationsByUser(AppState.currentUser.id);
            const notification = notifications.find(n => n.id === notificationId);

            if (notification && notification.related_id) { // related_id en DB vs relatedId en DataService
                // Cerrar panel
                document.getElementById('notifications-panel').classList.add('hidden');

                const eventId = notification.related_id;

                // Navegar según el tipo
                if (notification.type === 'NEW_APPLICATION') {
                    // Ir a gestionar candidatos
                    this.showView('applications');
                    // Necesitamos esperar que cargue la vista
                    setTimeout(() => {
                        this.manageEventApplicants(eventId);
                    }, 500);
                } else if (notification.type === 'APPLICATION_ACCEPTED' || notification.type === 'APPLICATION_REJECTED' || notification.type === 'EVENT_FINISHED') {
                    // Ir a mis postulaciones
                    this.showView('applications');
                } else if (notification.type === 'EVENT_SELECTION_CLOSED') {
                    this.showEventDetail(eventId);
                }
            }
        } catch (e) {
            console.error('Error click notification:', e);
        }
    },

    async markAllNotificationsAsRead() {
        const user = AppState.currentUser;
        try {
            await SupabaseService.markAllNotificationsAsRead(user.id);
            this.loadNotifications();
            this.updateNotificationsBadge();
            this.showToast('Todas las notificaciones marcadas como leídas', 'success');
        } catch (e) {
            console.error(e);
        }
    },

    getTimeAgo(date) {
        if (!date) return '';
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
        return past.toLocaleDateString();
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
        if (!container) return;

        container.innerHTML = '<div class="loader">Cargando eventos...</div>';

        try {
            // USAR SUPABASE
            let events = await SupabaseService.getAllEvents();

            // Aplicar filtros locales (opcional: se podría filtrar en backend también)
            if (AppState.filters.zone) {
                events = events.filter(e => e.zone === AppState.filters.zone);
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

    async loadAdminView() {
        const container = document.getElementById('verification-list');
        container.innerHTML = '<tr><td colspan="6" class="text-center">Cargando solicitudes...</td></tr>';

        try {
            const pendingUsers = await SupabaseService.getUsersByStatus('PENDIENTE');

            if (pendingUsers.length === 0) {
                container.innerHTML = '<tr><td colspan="6" class="text-center">No hay solicitudes pendientes 🎉</td></tr>';
                return;
            }

            container.innerHTML = pendingUsers.map(user => `
                <tr>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <strong>${user.username}</strong>
                            <br><small>${user.email}</small>
                        </div>
                    </td>
                    <td><span class="badge">${user.role}</span></td>
                    <td>
                        ${user.age || this.calculateAge(user.birth_date)} años
                        <br>${user.province || 'N/A'}
                    </td>
                    <td>
                        <button class="btn btn-secondary btn-small" onclick="app.openVerifyModal('${user.id}')">Ver Fotos</button>
                    </td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-success btn-small" onclick="app.approveUser('${user.id}')">✅</button>
                            <button class="btn btn-error btn-small" onclick="app.rejectUser('${user.id}')">❌</button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Store pending users in state for modal access
            this.pendingUsersCache = pendingUsers;

        } catch (error) {
            console.error('Error loading admin view:', error);
            container.innerHTML = '<tr><td colspan="6" class="text-center error">Error cargando datos</td></tr>';
            this.showToast('Error cargando solicitudes: ' + error.message, 'error');
        }
    },

    calculateAge(birthDate) {
        if (!birthDate) return '??';
        const diff = Date.now() - new Date(birthDate).getTime();
        const age = new Date(diff).getUTCFullYear() - 1970;
        return age;
    },

    openVerifyModal(userId) {
        const user = this.pendingUsersCache.find(u => u.id === userId);
        if (!user) return;

        const details = document.getElementById('verify-user-details');

        // Render photos (assuming verification_photos is stored as JSONB with base64 or URLs)
        const photos = user.verification_photos || {};
        const faceSrc = photos.face || 'placeholder.png'; // Fallback
        const idSrc = photos.id || 'placeholder.png';

        details.innerHTML = `
            <div>
                <h4>Foto de Rostro</h4>
                <div style="background: black; height: 300px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 8px;">
                    <img src="${faceSrc}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
            </div>
            <div>
                <h4>Selfie con DNI</h4>
                <div style="background: black; height: 300px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 8px;">
                    <img src="${idSrc}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
            </div>
            <div style="grid-column: span 2;">
                <h4>Datos del Usuario</h4>
                <p><strong>Nombre Real:</strong> ${user.full_name || 'No especificado'}</p>
                <p><strong>Fecha Nacimiento:</strong> ${user.birth_date} (Edad: ${this.calculateAge(user.birth_date)})</p>
                <p><strong>Provincia:</strong> ${user.province}</p>
                <p><strong>Bio:</strong> ${user.bio || 'Sin bio'}</p>
            </div>
        `;

        // Bind actions
        document.getElementById('btn-approve-user').onclick = () => this.approveUser(userId);
        document.getElementById('btn-reject-user').onclick = () => this.rejectUser(userId);

        document.getElementById('verify-modal').classList.add('active');
    },

    async approveUser(userId) {
        if (!confirm('¿Aprobar y verificar a este usuario?')) return;

        try {
            await SupabaseService.verifyUser(userId, 'VERIFICADO');
            // TODO: Send email
            this.showToast('Usuario verificado correctamente', 'success');
            document.getElementById('verify-modal').classList.remove('active');
            this.loadAdminView(); // Refresh list
        } catch (error) {
            console.error(error);
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    async rejectUser(userId) {
        if (!confirm('¿RECHAZAR a este usuario? Esta acción bloqueará el acceso.')) return;

        try {
            await SupabaseService.verifyUser(userId, 'RECHAZADO');
            // TODO: Send email
            this.showToast('Usuario rechazado', 'info');
            document.getElementById('verify-modal').classList.remove('active');
            this.loadAdminView(); // Refresh list
        } catch (error) {
            console.error(error);
            this.showToast('Error: ' + error.message, 'error');
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
                    <h3>${(user.rating || 0).toFixed(1)}</h3>
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
                        ${this.renderApplyButton(event)}
                    </div>
                </div>
    `;
        }).join('');
    },

    renderApplyButton(event) {
        if (!AppState.currentUser || AppState.currentUser.role !== 'BUSCADOR') return ''; // Solo buscadores

        const myApp = (AppState.myApplications || []).find(a => a.event_id === event.id);

        if (myApp) {
            let label = 'Pendiente';
            let style = 'background: var(--color-warning); color: black; opacity: 0.8; cursor: default;';

            if (myApp.status === 'ACEPTADO') {
                label = '¡Aceptado!';
                style = 'background: var(--color-success); color: white; cursor: default;';
            } else if (myApp.status === 'RECHAZADO') {
                label = 'Rechazado';
                style = 'background: var(--color-error); color: white; cursor: default;';
            }

            return `<button class="btn" style="${style}" disabled>${label}</button>`;
        }

        return `<button class="btn btn-primary" onclick="app.applyToEvent('${event.id}')">Apuntarme ❤️</button>`;
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
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });

            if (error.code === '23505') { // Unique violation en Postgres/Supabase
                this.showToast('Ya te has postulado a este evento', 'warning');
            } else {
                // Mostrar error específico al usuario
                const errorMsg = error.message || error.hint || 'Error desconocido';
                this.showToast(`Error: ${errorMsg}`, 'error');
            }
        }
    },

    // ===== VISTA: MIS POSTULACIONES / MIS EVENTOS =====
    async loadApplicationsView() {
        const user = AppState.currentUser;
        const container = document.getElementById('applications-list');

        // Si es OFERENTE, mostrar sus eventos creados
        if (user.role === 'OFERENTE' || user.role === 'ADMIN') {
            this.loadMyEventsView();
            return;
        }

        // Si es BUSCADOR, mostrar sus postulaciones desde Supabase
        try {
            container.innerHTML = '<div class="loader">Cargando postulaciones...</div>';

            const applications = await SupabaseService.getApplicationsByUser(user.id);
            this.myApplications = applications; // Guardar para filtrado

            const reviews = await SupabaseService.getReviewsByReviewer(user.id);
            // Guardar set de reviews para uso en renderizado
            this.myReviewedEventIds = new Set(reviews.map(r => r.event_id));

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

            // Renderizar estructura: Filtros + Contenedor de Lista
            container.innerHTML = `
                <div class="filters-container" style="display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 5px;">
                    <button class="btn btn-small btn-filter active" onclick="app.filterApplications('TODAS', this)" style="background: var(--color-accent); border: none;">Todas (${applications.length})</button>
                    <button class="btn btn-small btn-filter" onclick="app.filterApplications('PENDIENTE', this)">Pendientes</button>
                    <button class="btn btn-small btn-filter" onclick="app.filterApplications('ACEPTADO', this)">Aceptadas</button>
                    <button class="btn btn-small btn-filter" onclick="app.filterApplications('FINALIZADO', this)">Finalizados</button>
                    <button class="btn btn-small btn-filter" onclick="app.filterApplications('CERRADO', this)">Cerradas/Rechazadas</button>
                </div>
                <div id="applications-list-content"></div>
            `;

            // Cargar vista inicial
            // Nota: usamos setTimeout para asegurar que el DOM se pintó antes de filtrar
            setTimeout(() => this.filterApplications('TODAS'), 0);

            // Actualizar contador global
            document.getElementById('applications-count').textContent = applications.length;

        } catch (error) {
            console.error('Error cargando postulaciones:', error);
            container.innerHTML = `
                <div class="card text-center" style="padding: var(--spacing-2xl);">
                    <div style="font-size: 48px; margin-bottom: var(--spacing-md);">😢</div>
                    <h3>Error cargando postulaciones</h3>
                    <p style="color: var(--color-text-secondary); margin-top: var(--spacing-sm);">
                        ${error.message || 'Error desconocido'}
                    </p>
                </div>
            `;
        }
    },

    filterApplications(filterType, btnElement = null) {
        // Actualizar estilos de botones
        if (btnElement) {
            document.querySelectorAll('.btn-filter').forEach(btn => {
                btn.style.background = 'rgba(255, 255, 255, 0.1)';
                btn.classList.remove('active');
            });
            btnElement.style.background = 'var(--color-accent)';
            btnElement.classList.add('active');
        }

        const container = document.getElementById('applications-list-content');
        if (!container) return;

        let filtered = [];
        const apps = this.myApplications || [];

        switch (filterType) {
            case 'PENDIENTE':
                filtered = apps.filter(app => app.status === 'PENDIENTE');
                break;
            case 'ACEPTADO':
                // Aceptados activos (no finalizados)
                filtered = apps.filter(app => app.status === 'ACEPTADO' && app.event.status !== 'FINALIZADO');
                break;
            case 'FINALIZADO':
                // Eventos finalizados (se muestran si la postulación fue aceptada, o incluso si fue pendiente/rechazada si así se desea, 
                // pero lo lógico es mostrar en qué eventos participaste. 
                // El usuario dijo "filtar por los 4 eventos disponible", asumo que quiere ver 'FINALIZADOS' como categoría.
                // Mostraré todos los finalizados donde haya interacción.)
                filtered = apps.filter(app => app.event.status === 'FINALIZADO');
                break;
            case 'CERRADO':
                // Rechazados o Cancelados
                filtered = apps.filter(app => app.status === 'RECHAZADO' || app.status === 'CANCELADO');
                break;
            case 'TODAS':
            default:
                filtered = apps;
                break;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--color-text-tertiary);">
                    <p>No hay postulaciones en esta categoría</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(app =>
            this.renderApplicationCard(app, app.status, this.myReviewedEventIds ? this.myReviewedEventIds.has(app.event.id) : false)
        ).join('');
    },

    renderApplicationCard(application, status, hasVoted = false) {
        // En Supabase, el evento viene como application.event gracias al JOIN
        const event = application.event;
        if (!event) {
            console.error('Event not found for application:', application);
            return '';
        }

        // AUTO-CORRECCIÓN: Si el evento ya finalizó pero la postulación sigue en ACEPTADO (por el error de permisos anterior),
        // tratamos la postulación como FINALIZADO visualmente.
        if (status === 'ACEPTADO' && event.status === 'FINALIZADO') {
            status = 'FINALIZADO';
        }

        // Obtener organizador
        let organizer = event.organizer;
        if (Array.isArray(organizer)) organizer = organizer[0];
        if (!organizer) organizer = { username: 'Desconocido' };

        const statusColors = {
            'ACEPTADO': 'var(--color-success)',
            'FINALIZADO': 'var(--color-success)', // Mismo color éxito
            'PENDIENTE': 'var(--color-warning)',
            'RECHAZADO': 'var(--color-error)'
        };

        return `
            <div class="card mb-md" style="border-left: 4px solid ${statusColors[status] || 'var(--color-text-secondary)'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--spacing-md);">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <h3 style="margin: 0;">${event.title}</h3>
                            ${event.gangbang_level ? `<span class="badge badge-info" style="font-size: 0.75em;">${event.gangbang_level}</span>` : ''}
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; margin-bottom: 8px; padding: 4px 8px; background: rgba(255,255,255,0.05); border-radius: 20px; width: fit-content; cursor: pointer;" onclick="${organizer.id ? `app.viewUserProfile('${organizer.id}')` : ''}">
                            <img src="${organizer.avatar || organizer.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg'}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
                            <span style="font-size: 0.85em; color: var(--color-text-secondary);">Organiza: <strong style="color: var(--color-text-primary);">${organizer.username}</strong></span>
                        </div>

                        <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-top: 5px;">
                            ${event.description}
                        </p>
                    </div>
                    <span class="badge badge-${(status === 'ACEPTADO' || status === 'FINALIZADO') ? 'success' : status === 'PENDIENTE' ? 'warning' : 'error'}">
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
                        ${(status === 'ACEPTADO' || status === 'FINALIZADO') ? event.location : this.capitalizeZone(event.zone)}
                    </div>
                </div>
                
                ${(status === 'ACEPTADO' || status === 'FINALIZADO') ? `
                    <div style="background: rgba(0, 255, 136, 0.1); padding: var(--spacing-md); border-radius: var(--border-radius-md); margin-top: var(--spacing-md);">
                        <strong style="color: var(--color-success);">
                            ${status === 'FINALIZADO' ? '🏁 Evento Finalizado' : '🎉 ¡Felicidades! Has sido aceptado/a'}
                        </strong>
                        <p style="margin-top: var(--spacing-sm); font-size: var(--font-size-sm);">
                            📍 <strong>Ubicación exacta:</strong> ${event.location}
                        </p>
                        ${status === 'FINALIZADO' ? `
                            ${hasVoted ? `
                                <div style="margin-top: 10px; background: rgba(0, 0, 0, 0.2); padding: 8px; border-radius: 4px; text-align: center; color: var(--color-text-secondary);">
                                    ✅ Valoración realizada
                                </div>
                            ` : `
                                <button class="btn btn-primary" style="margin-top: 10px; width: 100%;" 
                                    onclick="app.rateOrganizer('${event.organizer_id}', '${event.id}')">
                                    ⭐ Valorar Organizador
                                </button>
                            `}
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

    rateOrganizer(organizerId, eventId) {
        this.openRateModal(eventId, organizerId);
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
                            <button class="btn btn-primary" onclick="if(window.showApplicants) { window.showApplicants(this); } else { alert('Error: Función no cargada. Recarga la página.'); }" data-event-id="${event.id}">
                                Gestionar candidatos (${applicants.length})
                            </button>
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

    // ===== GESTIONAR CANDIDATOS DE UN EVENTO =====
    async manageEventApplicants(eventId) {
        try {
            // Obtener aplicaciones del evento
            const applications = await SupabaseService.getEventApplications(eventId);
            const event = await SupabaseService.getEventById(eventId);

            if (!event) {
                this.showToast('Error: Evento no encontrado', 'error');
                return;
            }

            // Crear modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'applicants-modal';

            const pendingApps = applications.filter(app => app.status === 'PENDIENTE');
            const acceptedApps = applications.filter(app => app.status === 'ACEPTADO');
            const rejectedApps = applications.filter(app => app.status === 'RECHAZADO');

            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2>Gestionar Candidatos - ${event.title}</h2>
                        <button class="close-modal" onclick="app.closeModal('applicants-modal')">✕</button>
                    </div>
                    <div class="modal-body">
                        ${applications.length === 0 ? `
                            <div class="text-center" style="padding: var(--spacing-2xl);">
                                <div style="font-size: 48px; margin-bottom: var(--spacing-md);">📋</div>
                                <h3>No hay candidaturas aún</h3>
                                <p style="color: var(--color-text-secondary);">
                                    Cuando alguien se postule a tu evento, aparecerá aquí
                                </p>
                            </div>
                        ` : `
                            ${pendingApps.length > 0 ? `
                                <h3 style="color: var(--color-warning); margin-bottom: var(--spacing-md);">
                                    ⏳ Pendientes (${pendingApps.length})
                                </h3>
                                ${pendingApps.map(app => this.renderApplicantCard(app, event)).join('')}
                            ` : ''}
                            
                            ${acceptedApps.length > 0 ? `
                                <h3 style="color: var(--color-success); margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md);">
                                    ✅ Aceptados (${acceptedApps.length})
                                </h3>
                                ${acceptedApps.map(app => this.renderApplicantCard(app, event)).join('')}
                            ` : ''}
                            
                            ${rejectedApps.length > 0 ? `
                                <h3 style="color: var(--color-error); margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md);">
                                    ❌ Rechazados (${rejectedApps.length})
                                </h3>
                                ${rejectedApps.map(app => this.renderApplicantCard(app, event)).join('')}
                            ` : ''}
                        `}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('active'), 10);
        } catch (error) {
            console.error('Error cargando candidatos:', error);
            this.showToast('Error cargando candidatos', 'error');
        }
    },

    renderApplicantCard(application, event) {
        const user = application.applicant || {};
        const status = application.status;

        return `
            <div class="card mb-md" style="border-left: 4px solid ${status === 'ACEPTADO' ? 'var(--color-success)' :
                status === 'RECHAZADO' ? 'var(--color-error)' :
                    'var(--color-warning)'
            };">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-sm);">
                            <img src="${user.avatar || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" 
                                 style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <strong>${user.username || 'Usuario'}</strong>
                                ${user.age ? `<div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">${user.age} años</div>` : ''}
                            </div>
                        </div>
                        ${user.bio ? `
                            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-top: var(--spacing-sm);">
                                ${user.bio}
                            </p>
                        ` : ''}
                        <button class="btn btn-secondary btn-small mt-sm" onclick="app.viewUserProfile('${user.id}')">
                            👤 Ver perfil completo
                        </button>
                    </div>
                    ${status === 'PENDIENTE' ? `
                        <div style="display: flex; gap: var(--spacing-sm);">
                            <button class="btn btn-success btn-small" onclick="app.acceptApplicant('${application.id}', '${event.id}')">
                                ✅ Aceptar
                            </button>
                            <button class="btn btn-error btn-small" onclick="app.rejectApplicant('${application.id}', '${event.id}')">
                                ❌ Rechazar
                            </button>
                        </div>
                    ` : `
                        <span class="badge badge-${status === 'ACEPTADO' ? 'success' : 'error'}">
                            ${status}
                        </span>
                    `}
                </div>
            </div>
        `;
    },

    async acceptApplicant(applicationId, eventId) {
        if (!confirm('¿Aceptar esta candidatura?')) return;

        try {
            await SupabaseService.updateApplicationStatus(applicationId, 'ACEPTADO', eventId);
            this.showToast('Candidatura aceptada', 'success');
            // Recargar modal
            this.closeModal('applicants-modal');
            this.manageEventApplicants(eventId);
        } catch (error) {
            console.error('Error aceptando candidatura:', error);
            this.showToast('Error aceptando candidatura', 'error');
        }
    },

    async rejectApplicant(applicationId, eventId) {
        if (!confirm('¿Rechazar esta candidatura?')) return;

        try {
            await SupabaseService.updateApplicationStatus(applicationId, 'RECHAZADO', eventId);
            this.showToast('Candidatura rechazada', 'success');
            // Recargar modal
            this.closeModal('applicants-modal');
            this.manageEventApplicants(eventId);
        } catch (error) {
            console.error('Error rechazando candidatura:', error);
            this.showToast('Error rechazando candidatura', 'error');
        }
    },

    async viewUserProfile(userId) {
        try {
            // Limpiar modal previo si existe para evitar duplicados y conflictos de z-index
            const existingModal = document.getElementById('user-profile-modal');
            if (existingModal) existingModal.remove();

            // Obtener datos completos del usuario
            const user = await SupabaseService.getUserById(userId);

            if (!user) {
                this.showToast('Usuario no encontrado', 'error');
                return;
            }

            // Crear modal con perfil del usuario con capa superior
            const modal = document.createElement('div');
            modal.className = 'modal modal-top-layer';
            modal.id = 'user-profile-modal';

            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2>Perfil de ${user.username}</h2>
                        <button class="close-modal" onclick="app.closeModal('user-profile-modal')">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="text-align: center; margin-bottom: var(--spacing-lg);">
                            <img src="${user.avatar || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" 
                                 style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: var(--spacing-md);">
                            <h2>${user.username}</h2>
                            <p style="color: var(--color-text-secondary);">${user.role}</p>
                        </div>
                        
                        ${user.bio ? `
                            <div class="card mb-md">
                                <h3 style="margin-bottom: var(--spacing-sm);">Sobre mí</h3>
                                <p style="color: var(--color-text-secondary);">${user.bio}</p>
                            </div>
                        ` : ''}
                        
                        <div class="card mb-md">
                            <h3 style="margin-bottom: var(--spacing-sm);">Información</h3>
                            <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                                ${user.age ? `
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: var(--color-text-secondary);">Edad:</span>
                                        <strong>${user.age} años</strong>
                                    </div>
                                ` : ''}
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: var(--color-text-secondary);">Valoración:</span>
                                    <strong>⭐ ${(user.rating || 0).toFixed(1)}</strong>
                                </div>
                            </div>
                        </div>
                        
                        ${user.search_zones && user.search_zones.length > 0 ? `
                            <div class="card mb-md">
                                <h3 style="margin-bottom: var(--spacing-sm);">Zonas de búsqueda</h3>
                                <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                                    ${user.search_zones.map(zone => `
                                        <span class="badge badge-info">${this.capitalizeZone(zone)}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${user.gallery && user.gallery.length > 0 ? `
                            <div class="card">
                                <h3 style="margin-bottom: var(--spacing-sm);">Galería</h3>
                                <div class="gallery-grid">
                                    ${user.gallery.map(img => `
                                        <div class="gallery-item" onclick="app.showImageModal('${img}')">
                                            <img src="${img}" alt="Galería">
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('active'), 10);
        } catch (error) {
            console.error('Error cargando perfil:', error);
            this.showToast('Error cargando perfil del usuario', 'error');
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
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
    async loadProfileView() {
        const user = AppState.currentUser;
        const container = document.getElementById('profile-container');

        // Fetch reviews to ensure fresh display for the user's own profile
        let reviews = [];
        let avgRating = (user.rating || 0).toFixed(1);
        let reviewsCount = user.reviewsCount || 0;

        try {
            reviews = await SupabaseService.getReviewsByReviewed(user.id);
            // Live calculation
            const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
            if (reviews.length > 0) {
                avgRating = (ratingSum / reviews.length).toFixed(1);
            }
            reviewsCount = reviews.length;
        } catch (error) {
            console.error('Error fetching own reviews:', error);
        }

        const verificationBadge = user.verified === 'VERIFICADO'
            ? '<span class="verification-badge">✓ Verificado</span>'
            : user.verified === 'PENDIENTE'
                ? '<span class="badge badge-warning">⏳ Verificación pendiente</span>'
                : '<span class="badge" style="background: var(--color-error);">❌ No verificado</span>';

        container.innerHTML = `
            <div class="profile-grid">
                <div class="profile-main">
                    <div class="card profile-header">
                        <img src="${user.avatar || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}" 
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
                    
                    ${user.search_zones && user.search_zones.length > 0 ? `
                        <div class="card">
                            <h3 style="margin-bottom: var(--spacing-md);">Zonas de Búsqueda</h3>
                            <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
                                ${(user.search_zones || []).map(z => `
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
                    
                    <!-- REVIEWS SECTION -->
                    <div class="card">
                        <h3 style="margin-bottom: var(--spacing-md);">Opiniones Recibidas (${reviewsCount})</h3>
                        ${reviews.length > 0 ? `
                             <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                                ${reviews.map(review => `
                                    <div style="padding-bottom: var(--spacing-md); border-bottom: 1px solid var(--color-border); padding-left: 10px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <div style="color: gold; letter-spacing: 2px;">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                                            <span style="font-size: 0.8em; color: var(--color-text-secondary);">${new Date(review.created_at).toLocaleDateString()}</span>
                                        </div>
                                        
                                        <div style="margin-bottom: 8px;">
                                            ${review.reviewer ? `<div style="font-weight: 600; font-size: 0.95em; color: var(--color-text-primary); margin-bottom: 2px;">${review.reviewer.username}</div>` : '<div style="font-style: italic; color: var(--color-text-tertiary);">Usuario anónimo</div>'}
                                            ${review.event ? `
                                                <div style="font-size: 0.85em; color: var(--color-text-secondary);">
                                                    <span>${review.event.title}</span>
                                                    <span style="font-size: 0.75em; background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 4px; margin-left: 6px; border: 1px solid rgba(255,255,255,0.2);">
                                                        ${review.event.gangbang_level || 'General'}
                                                    </span>
                                                </div>
                                            ` : ''}
                                        </div>

                                        ${review.comment ? `<p style="font-size: 0.95em; color: var(--color-text); font-style: italic; opacity: 0.9;">"${review.comment}"</p>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p style="color: var(--color-text-secondary); font-style: italic;">Aún no tienes valoraciones.</p>
                        `}
                    </div>
                </div>
                
                <div class="profile-sidebar">
                    <div class="card">
                        <h3 style="margin-bottom: var(--spacing-md);">Estadísticas</h3>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                            <div>
                                <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent);">
                                    ⭐ ${avgRating}
                                </div>
                                <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                                    Valoración
                                </div>
                            </div>
                            <div>
                                <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent);">
                                    ${reviewsCount}
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
                    <div style="display: flex; align-items: center; gap: var(--spacing-md); cursor: pointer;" 
                         onclick="app.viewUserProfile('${organizer.id}')">
                        <img src="${organizer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${organizer.username}`}" 
                             style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <strong>${organizer.username}</strong>
                            <small style="display:block; color:var(--color-text-secondary)">Ver perfil</small>
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
                    <div style="margin-top: var(--spacing-lg); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border); display: grid; gap: var(--spacing-md);">
                        
                        ${event.status === 'ACTIVO' ? `
                            <button class="btn btn-primary btn-block" onclick="app.manageEventApplicants('${event.id}')">
                                👥 Gestionar Candidatos
                            </button>
                            <button class="btn btn-warning btn-block" onclick="app.finalizeEvent('${event.id}')" style="background-color: var(--color-warning); color: black;">
                                🏁 Finalizar Evento
                            </button>
                        ` : event.status === 'FINALIZADO' ? `
                            <div class="alert alert-success">✅ Este evento ha finalizado</div>
                        ` : ''}

                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button class="btn btn-secondary flex-1" onclick="app.editEvent('${event.id}')">✏️ Editar</button>
                            <button class="btn btn-danger flex-1" onclick="app.confirmDeleteEvent('${event.id}')">🗑️ Borrar</button>
                        </div>
                    </div>
                ` : isBuscador ? `
                    <div style="margin-top: var(--spacing-lg);">
                        ${this.renderDetailActionButtons(event)}
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

    async finalizeEvent(eventId) {
        if (!confirm('¿Estás segura de finalizar el evento?\n\nEsto habilitará las votaciones para los participantes.')) return;

        try {
            await SupabaseService.finalizeEvent(eventId);
            this.showToast('¡Evento finalizado! Ahora pueden valorarte.', 'success');
            this.showEventDetail(eventId); // Recargar ver cambios
        } catch (e) {
            console.error(e);
            this.showToast('Error finalizando evento', 'error');
        }
    },

    renderDetailActionButtons(event) {
        const myApp = (AppState.myApplications || []).find(a => a.event_id === event.id);

        if (!myApp) {
            return `<button class="btn btn-primary btn-block" onclick="app.applyToEvent('${event.id}')">Me interesa ❤️</button>`;
        }

        if (event.status === 'FINALIZADO' && (myApp.status === 'ACEPTADO' || myApp.status === 'FINALIZADO')) {
            return `<button class="btn btn-primary btn-block" style="background: gold; color: black;" onclick="app.openRateModal('${event.id}', '${event.organizer_id}')">⭐ Valorar Organizadora</button>`;
        }

        if (myApp.status === 'PENDIENTE') {
            return `<div class="p-md text-center bg-gray rounded">⏳ Tu solicitud está pendiente de respuesta</div>`;
        }

        if (myApp.status === 'ACEPTADO') {
            return `
                <div class="p-md bg-success-light rounded mb-md">
                    <h3>¡Felicidades! 🎉</h3>
                    <p>Has sido aceptado en este evento.</p>
                    <div style="margin-top: 10px; font-weight: bold;">📍 Ubicación: ${event.location || 'Se revelará pronto'}</div>
                </div>
            `;
        }

        return '';
    },

    async openRateModal(eventId, targetUserId) {
        let modal = document.getElementById('rate-modal');

        // Si no existe (caso raro), lo creamos
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="rate-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Valorar</h2>
                            <button class="modal-close" onclick="app.closeRateModal()">✕</button>
                        </div>
                        <div id="rate-content"></div>
                    </div>
                </div>
            `);
            modal = document.getElementById('rate-modal');
        }

        const contentDiv = document.getElementById('rate-content');
        if (!contentDiv) {
            console.error('Error: rate-content div not found inside rate-modal');
            return;
        }

        // Renderizar la estructura del formulario de valoración
        contentDiv.innerHTML = `
            <div id="rate-target-info" style="text-align: center; margin-bottom: 20px;">
                <!-- Se llenará con datos del usuario -->
                 <div class="loader">Cargando...</div>
            </div>

            <div class="rating-stars" style="text-align: center; margin-bottom: 20px;">
                <input type="hidden" id="rate-value" value="0">
                <div class="star-rating" style="font-size: 40px; color: #ddd;">
                    <span onclick="app.setRating(1)">★</span>
                    <span onclick="app.setRating(2)">★</span>
                    <span onclick="app.setRating(3)">★</span>
                    <span onclick="app.setRating(4)">★</span>
                    <span onclick="app.setRating(5)">★</span>
                </div>
                <p style="font-size: 0.9em; color: #888; margin-top: 5px;">Toca las estrellas para calificar</p>
            </div>

            <div class="form-group">
                <label>Tu opinión (pública)</label>
                <textarea id="rate-comment" class="form-input" rows="3" placeholder="¿Qué fue lo mejor? ¿Hubo algún problema?"></textarea>
            </div>

            <button class="btn btn-primary btn-block" onclick="app.submitRating('${eventId}', '${targetUserId}')">Enviar Valoración</button>
        `;

        // Abrir modal
        modal.classList.add('active');

        // Cargar datos del usuario a valorar
        try {
            const targetUser = await SupabaseService.getUserById(targetUserId);
            const infoDiv = document.getElementById('rate-target-info');
            if (infoDiv) {
                infoDiv.innerHTML = `
                    <div style="position: relative; display: inline-block;">
                        <img src="${targetUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.username}`}" 
                            style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 3px solid var(--color-primary);">
                        <span style="position: absolute; bottom: 10px; right: 0; background: var(--color-background); border-radius: 50%; padding: 2px;">
                            ${targetUser.role === 'OFERENTE' ? '👑' : '👤'}
                        </span>
                    </div>
                    <h3 style="margin: 0;">${targetUser.username}</h3>
                    <p style="color: var(--color-text-secondary); font-size: 0.9em;">
                        ${targetUser.role === 'OFERENTE' ? 'Organizadora del evento' : 'Participante'}
                    </p>
                `;
            }
        } catch (error) {
            console.error('Error cargando usuario a valorar:', error);
            document.getElementById('rate-target-info').innerHTML = '<p class="error">Error cargando perfil</p>';
        }
    },

    setRating(value) {
        const input = document.getElementById('rate-value');
        if (input) input.value = value;

        const stars = document.querySelectorAll('.star-rating span');
        stars.forEach((star, index) => {
            star.style.color = index < value ? 'gold' : '#ddd';
            star.style.transform = index < value ? 'scale(1.1)' : 'scale(1)';
            star.style.transition = 'all 0.2s ease';
        });
    },

    async submitRating(eventId, reviewedId) {
        const rating = parseInt(document.getElementById('rate-value').value);
        const comment = document.getElementById('rate-comment').value;

        if (rating === 0) {
            this.showToast('Por favor selecciona una puntuación', 'warning');
            return;
        }

        try {
            await SupabaseService.submitEventRatings([{
                reviewer_id: AppState.currentUser.id,
                reviewed_id: reviewedId,
                event_id: eventId,
                rating: rating,
                comment: comment
            }]);

            this.showToast('¡Gracias por tu valoración!', 'success');
            document.getElementById('rate-modal').classList.remove('active');
        } catch (error) {
            console.error('Error enviando valoración:', error);
            this.showToast('Error al enviar valoración', 'error');
        }
    },

    editEvent(eventId) {
        alert('🚧 Funcionalidad de modificación en desarrollo.');
    },

    closeEventDetail() {
        const modal = document.getElementById('event-detail-modal');
        modal.classList.remove('active');

        // Si estamos en la vista de mis eventos, recargar para actualizar contadores
        if (AppState.currentView === 'applications' && AppState.currentUser.role === 'OFERENTE') {
            this.loadMyEventsView();
        }
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
    async manageEventApplicants(eventId) {
        const content = document.getElementById('event-detail-content');

        // Mostrar estado de carga
        content.innerHTML = '<div class="loading-spinner"></div>';

        try {
            // 1. Obtener evento y postulaciones REALES de Supabase
            const [event, applications] = await Promise.all([
                SupabaseService.getEventById(eventId),
                SupabaseService.getEventApplications(eventId)
            ]);

            if (!event) throw new Error('Evento no encontrado');

            if (!applications || applications.length === 0) {
                this.showToast('No hay candidaturas para este evento aún', 'info');
                // Volver a mostrar el detalle normal
                this.showEventDetail(eventId);
                return;
            }

            content.innerHTML = `
                <div class="event-detail">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-md);">
                        <h3>Gestionar Candidatos: ${event.title}</h3>
                        <button class="btn btn-text btn-small" onclick="app.showEventDetail('${eventId}')">⬅ Volver al detalle</button>
                    </div>
                    
                    <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-lg);">
                        ${applications.length} candidatos postulados
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                        ${applications.map(app => {
                // Extraer el usuario de la relación 'applicant' (que viene del join en SupabaseService)
                const user = app.applicant;
                if (!user) return ''; // Skip si no hay usuario

                // Calcular validación visual
                const borderColor = app.status === 'ACEPTADO' ? 'var(--color-success)' :
                    app.status === 'RECHAZADO' ? 'var(--color-error)' :
                        app.status === 'FINALIZADO' ? 'var(--color-accent)' :
                            'var(--color-warning)'; // Pendiente

                // Normalizar avatar
                const avatarUrl = user.avatar || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;

                return `
                                <div class="card" style="border-left: 4px solid ${borderColor}; padding: var(--spacing-md);">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--spacing-sm);">
                                        
                                        <!-- Info Usuario -->
                                        <div style="display: flex; gap: var(--spacing-md); align-items: center; cursor: pointer;" 
                                             onclick="app.viewUserProfile('${user.id}')">
                                            <img src="${avatarUrl}" 
                                                 style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                                            <div>
                                                <strong>${user.username}</strong>
                                                <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                                                    ⭐ ${(user.rating || 0).toFixed(1)} <span style="font-size: 0.8em;">(${user.reviewsCount || 0} reviews)</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Estado y Acciones -->
                                        <div style="text-align: right;">
                                            <div style="margin-bottom: 5px; font-weight: bold; font-size: 0.9em; color:${borderColor}">
                                                ${app.status}
                                            </div>

                                            ${app.status === 'PENDIENTE' ? `
                                                <div style="display: flex; gap: 5px;">
                                                    <button class="btn btn-success btn-small" 
                                                            onclick="app.acceptCandidate('${app.id}', '${eventId}', '${user.id}')"
                                                            title="Aceptar Candidato">
                                                        ✅ Aceptar
                                                    </button>
                                                    <button class="btn btn-danger btn-small" 
                                                            onclick="app.rejectCandidate('${app.id}', '${eventId}')"
                                                            title="Rechazar Candidato">
                                                        ❌ Rechazar
                                                    </button>
                                                </div>
                                            ` : app.status === 'ACEPTADO' ? `
                                                <small style="color: var(--color-success);">¡Seleccionado!</small>
                                            ` : ''}
                                        </div>
                                    </div>
                                    
                                    <!-- Bio / Mensaje -->
                                    ${user.bio ? `
                                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--color-border); font-size: 0.9em; color: var(--color-text-secondary);">
                                            "${user.bio}"
                                        </div>
                                    ` : ''}
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error gestionando candidatos:', error);
            content.innerHTML = `<div class="error-msg">Error cargando candidatos: ${error.message}</div>`;
        }
    },

    async acceptCandidate(applicationId, eventId, userId) {
        if (!confirm('¿Aceptar a este usuario para el evento? Se le enviará una notificación.')) return;

        try {
            await SupabaseService.acceptApplicant(eventId, userId);

            this.showToast('Candidato aceptado exitosamente', 'success');

            // Verificar si se alcanzó la capacidad para cerrar evento
            const [event, applications] = await Promise.all([
                SupabaseService.getEventById(eventId),
                SupabaseService.getEventApplications(eventId)
            ]);

            const acceptedCount = applications.filter(a => a.status === 'ACEPTADO').length;

            if (event && acceptedCount >= event.capacity) {
                // Cerrar evento automáticamente
                // Asumimos que existe updateEventStatus o usamos updateEvent
                await SupabaseService.updateEvent(eventId, { status: 'CERRADO' }); // O FINALIZADO? CERRADO parece mejor para "no más gente"
                this.showToast('🔒 ¡Evento cerrado por completarse el aforo!', 'info');
            }

            // Recargar la lista
            this.manageEventApplicants(eventId);
        } catch (error) {
            console.error('Error aceptando:', error);
            this.showToast('Error aceptando candidato', 'error');
        }
    },

    async rejectCandidate(applicationId, eventId) {
        if (!confirm('¿Rechazar esta solicitud?')) return;

        try {
            await SupabaseService.updateApplicationStatus(applicationId, 'RECHAZADO', eventId);
            this.showToast('Solicitud rechazada', 'success');
            this.manageEventApplicants(eventId);
        } catch (error) {
            console.error('Error rechazando:', error);
            this.showToast('Error rechazando candidato', 'error');
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

    async viewUserProfile(userId) {
        try {
            const user = await SupabaseService.getUserById(userId);
            if (!user) {
                this.showToast('Error: Usuario no encontrado', 'error');
                return;
            }
            // Fetch reviews to ensure fresh rating display
            const reviews = await SupabaseService.getReviewsByReviewed(userId);
            this._renderProfileModal(user, reviews);
        } catch (error) {
            console.error('Error viewing profile:', error);
            this.showToast('Error cargando perfil del usuario', 'error');
        }
    },

    async viewApplicantProfile(userId) {
        try {
            const user = await SupabaseService.getUserById(userId);
            if (!user) return;
            this._renderProfileModal(user);
        } catch (error) {
            console.error('Error viewing applicant:', error);
        }
    },

    _renderProfileModal(user, reviews = []) {
        const modal = document.getElementById('event-detail-modal');
        const content = document.getElementById('event-detail-content');
        document.getElementById('event-detail-title').textContent = 'Perfil de Usuario';
        document.getElementById('event-detail-actions').innerHTML = ''; // Limpiar acciones

        // Calcular valoración media en tiempo real en el frontend (para respuesta inmediata)
        const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = reviews.length > 0 ? (ratingSum / reviews.length).toFixed(1) : (user.rating || 0).toFixed(1);

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
                            <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm);">
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

                    <!-- LISTA DE RESEÑAS -->
                    <div class="card">
                        <h3 style="margin-bottom: var(--spacing-md);">Opiniones (${reviews.length})</h3>
                        ${reviews.length > 0 ? `
                            <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                                ${reviews.map(review => `
                                    <div style="padding-bottom: var(--spacing-md); border-bottom: 1px solid var(--color-border);">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <div style="color: gold; letter-spacing: 2px;">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                                            <span style="font-size: 0.8em; color: var(--color-text-secondary);">${new Date(review.created_at).toLocaleDateString()}</span>
                                        </div>
                                        ${review.comment ? `<p style="font-size: 0.95em; color: var(--color-text); font-style: italic;">"${review.comment}"</p>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p style="color: var(--color-text-secondary); font-style: italic;">Aún no tiene valoraciones.</p>
                        `}
                    </div>
                </div>
                
                <div class="profile-sidebar">
                    <div class="card">
                        <h3 style="margin-bottom: var(--spacing-md);">Estadísticas</h3>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                            <div>
                                <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent);">
                                    ⭐ ${avgRating}
                                </div>
                                <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                                    Valoración Media
                                </div>
                            </div>
                            <div>
                                <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-accent);">
                                    ${reviews.length}
                                </div>
                                <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                                    Total Valoraciones
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

// ===== PROFILE FIX V3 (Gallery Preview) =====

// Sobrescribimos toggleProfileEdit para añadir el contenedor de preview y el evento onchange
app.toggleProfileEdit = function () {
    const user = AppState.currentUser;
    const currentAvatar = user.avatar || user.avatar_url;
    const container = document.getElementById('profile-container');
    const zones = ['norte', 'sur', 'este', 'oeste', 'centro'];

    container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
            <h2 style="margin-bottom: 20px;">✏️ Editar Perfil</h2>
            <form id="profile-edit-form" onsubmit="app.saveProfile(event)">
                
                <!-- AVATAR -->
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
                            ${currentAvatar ? `<button type="button" class="btn" style="background: var(--color-error); color: white;" onclick="app.deleteAvatar()">🗑️ Borrar</button>` : ''}
                        </div>
                    </div>
                </div>

                <!-- INFO -->
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Bio (Sobre ti)</label>
                    <textarea name="bio" rows="4" class="input-field" style="width: 100%; padding: 10px;">${user.bio || ''}</textarea>
                </div>

                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Edad</label>
                    <input type="number" name="age" value="${(user.age !== null && user.age !== undefined) ? user.age : ''}" 
                           class="input-field" style="width: 100%; padding: 10px;">
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
                
                <!-- GALERÍA -->
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Galería de Fotos</label>
                    
                    <!-- Fotos Existentes -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 15px;">
                         ${(user.gallery || []).map(img => `
                            <div style="position: relative; aspect-ratio: 1;">
                                <img src="${img}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 1px solid var(--color-border);">
                                <button type="button" onclick="app.deleteGalleryImage('${img}')" 
                                        class="btn-icon-danger"
                                        style="position: absolute; top: 5px; right: 5px; background: rgba(255, 0, 0, 0.8); color: white; border-radius: 50%; width: 24px; height: 24px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;">×</button>
                            </div>
                         `).join('')}
                    </div>

                    <!-- Contenedor para Previsualización de NUEVAS fotos -->
                    <div id="new-gallery-preview" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 15px;"></div>

                    <label class="btn btn-secondary" style="cursor: pointer; display: inline-flex; align-items: center; gap: 5px; width: 100%; justify-content: center; padding: 15px; border: 2px dashed var(--color-border);">
                        ➕ Seleccionar nuevas fotos...
                        <input type="file" name="galleryFiles" accept="image/*" multiple style="display: none;" 
                               onchange="app.previewGallery(this)">
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

// Nueva función para previsualizar galería
app.previewGallery = function (input) {
    const previewContainer = document.getElementById('new-gallery-preview');
    previewContainer.innerHTML = ''; // Limpiar anteriores previews de esta selección

    if (input.files && input.files.length > 0) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const div = document.createElement('div');
                div.style.position = 'relative';
                div.style.aspectRatio = '1';

                div.innerHTML = `
                    <div style="position: absolute; top: 0; left: 0; background: #4CAF50; color: white; padding: 2px 6px; font-size: 10px; border-radius: 0 0 4px 0; z-index: 2;">NUEVA</div>
                    <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 2px solid #4CAF50; opacity: 0.8;">
                `;
                previewContainer.appendChild(div);
            }
            reader.readAsDataURL(file);
        });
    }
};

// ===== PROFILE FIX V4 (Header Refresh) =====

app.saveProfile = async function (event) {
    event.preventDefault();
    const form = event.target;
    const user = AppState.currentUser;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
        console.log('🏁 Iniciando guardado de perfil (V4)...');

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
            try {
                const avatarUrl = await SupabaseService.uploadFile('avatars', path, avatarFile);
                updates.avatar_url = avatarUrl;
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
                } catch (galleryErr) {
                    console.error('Error subida galería:', galleryErr);
                    alert('Error subiendo foto: ' + galleryErr.message);
                    throw galleryErr;
                }
            }
            updates.gallery = currentGallery;
        }

        // 4. Actualizar usuario
        await SupabaseService.updateUser(user.id, updates);

        // 5. Refrescar datos locales
        const updatedProfile = await SupabaseService.getCurrentUser();
        if (updatedProfile) {
            updatedProfile.avatar = updatedProfile.avatar_url || updatedProfile.avatar;
        }
        AppState.currentUser = updatedProfile;

        // 6. ACTUALIZAR UI GLOBAL (Sidebar/Header)
        if (typeof app.updateHeader === 'function') {
            app.updateHeader();
        } else {
            // Fallback manual si updateHeader no existe o falla scope
            const headerAvatar = document.getElementById('header-avatar');
            if (headerAvatar && updatedProfile.avatar) {
                headerAvatar.innerHTML = `<img src="${updatedProfile.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }
        }

        this.loadProfileView();
        this.showToast('Perfil actualizado correctamente', 'success');

    } catch (error) {
        console.error('Error FATAL guardando perfil:', error);
        alert('ERROR: ' + (error.message || error));
        this.showToast('Error: ' + (error.message || 'No se pudo guardar'), 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Cambios';
    }
};

// ===== INICIALIZACIÓN DE LA APP =====
document.addEventListener('DOMContentLoaded', () => {
    // Exponer app globalmente
    window.app = app;
    console.log('🏁 DOMContentLoaded: Inicializando app...');
    if (app && app.init) {
        app.init();
    } else {
        console.error('Fatal: app no está definido o no tiene método init');
    }
});
