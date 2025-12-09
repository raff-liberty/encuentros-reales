
// ===== VISTA: MIS POSTULACIONES =====
loadApplicationsView() {
    const user = AppState.currentUser;
    const container = document.getElementById('applications-list');
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
            ` : ''}
            
            ${pending.length > 0 ? `
                <h3 style="margin-bottom: var(--spacing-md); margin-top: var(--spacing-xl); color: var(--color-warning);">
                    ⏳ Pendientes (${pending.length})
                </h3>
                ${pending.map(app => this.renderApplicationCard(app, 'PENDIENTE')).join('')}
            ` : ''}
            
            ${rejected.length > 0 ? `
                <h3 style="margin-bottom: var(--spacing-md); margin-top: var(--spacing-xl); color: var(--color-error);">
                    ❌ Rechazadas (${rejected.length})
                </h3>
                ${rejected.map(app => this.renderApplicationCard(app, 'RECHAZADO')).join('')}
            ` : ''}
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
                        
                        ${user.role === 'BUSCADOR' ? `
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
                    
                    ${user.role === 'OFERENTE' ? `
                        <div class="card">
                            <button class="btn btn-primary btn-block" onclick="app.showCreateEvent()">
                                ➕ Crear Evento
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
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
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
