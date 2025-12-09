// Profile editing functionality - Add this to app.js

// Add to loadProfile() function to include edit button and form
function loadProfileWithEdit() {
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
                                    <span>${app.capitalizeZone(zone)}</span>
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
                        ${user.searchZones.map(z => `<span style="background: rgba(255, 51, 102, 0.2); color: var(--color-accent-primary); padding: 8px 16px; border-radius: 8px; font-weight: 600;">${app.capitalizeZone(z)}</span>`).join('')}
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
                                <div style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">${app.formatDate(review.date)}</div>
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
            app.handleProfileEdit();
        });
    }
}

// Toggle profile edit form
function toggleProfileEdit() {
    const form = document.getElementById('profile-edit-form');
    if (form.style.display === 'none') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

// Handle profile edit submission
function handleProfileEdit() {
    const age = document.getElementById('edit-age').value;
    const bio = document.getElementById('edit-bio').value;
    const searchZones = Array.from(document.querySelectorAll('input[name="searchZones"]:checked')).map(cb => cb.value);

    const updates = {
        age: age ? parseInt(age) : null,
        bio: bio,
        searchZones: searchZones
    };

    const updatedUser = DataService.updateUser(AppState.currentUser.id, updates);
    if (updatedUser) {
        AppState.currentUser = updatedUser;
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        app.showToast('Perfil actualizado correctamente', 'success');
        app.toggleProfileEdit();
        app.loadProfile();
    } else {
        app.showToast('Error al actualizar el perfil', 'error');
    }
}
