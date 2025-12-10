
// ===== FUNCIÓN GLOBAL PARA GESTIONAR CANDIDATOS =====
window.showApplicants = async function (button) {
    const eventId = button.getAttribute('data-event-id');
    console.log('📋 Abriendo gestión de candidatos para evento:', eventId);

    try {
        const applications = await SupabaseService.getEventApplications(eventId);
        console.log('Aplicaciones obtenidas:', applications);

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'applicants-modal';
        modal.style.display = 'flex';

        const pending = applications.filter(app => app.status === 'PENDIENTE');
        const accepted = applications.filter(app => app.status === 'ACEPTADO');
        const rejected = applications.filter(app => app.status === 'RECHAZADO');

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Gestionar Candidatos</h2>
                    <button class="close-modal" onclick="document.getElementById('applicants-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    ${applications.length === 0 ? `
                        <div style="text-align: center; padding: 40px;">
                            <div style="font-size: 48px;">📋</div>
                            <h3>No hay candidaturas</h3>
                        </div>
                    ` : `
                        ${pending.length > 0 ? `
                            <h3 style="color: #ffd700; margin-bottom: 16px;">⏳ Pendientes (${pending.length})</h3>
                            ${pending.map(app => renderApplicantCard(app, eventId)).join('')}
                        ` : ''}
                        ${accepted.length > 0 ? `
                            <h3 style="color: #00ff88; margin: 24px 0 16px;">✅ Aceptados (${accepted.length})</h3>
                            ${accepted.map(app => renderApplicantCard(app, eventId)).join('')}
                        ` : ''}
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error cargando candidatos:', error);
        alert('Error: ' + error.message);
    }
};

function renderApplicantCard(application, eventId) {
    const user = application.applicant || {};
    const status = application.status;
    const borderColor = status === 'ACEPTADO' ? '#00ff88' : '#ffd700';

    return `
        <div class="card" style="margin-bottom: 16px; border-left: 4px solid ${borderColor};">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${user.avatar || user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username}" 
                             style="width: 50px; height: 50px; border-radius: 50%;">
                        <div>
                            <strong>${user.username || 'Usuario'}</strong>
                            ${user.age ? `<div style="color: #999; font-size: 14px;">${user.age} años</div>` : ''}
                        </div>
                    </div>
                    ${user.bio ? `<p style="color: #999; font-size: 14px; margin-top: 8px;">${user.bio}</p>` : ''}
                </div>
                ${status === 'PENDIENTE' ? `
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-success btn-small" onclick="acceptApplicant('${application.id}', '${eventId}')">✅</button>
                        <button class="btn btn-error btn-small" onclick="rejectApplicant('${application.id}', '${eventId}')">❌</button>
                    </div>
                ` : `<span class="badge badge-success">${status}</span>`}
            </div>
        </div>
    `;
}

window.acceptApplicant = async function (applicationId, eventId) {
    if (!confirm('¿Aceptar candidatura?')) return;
    try {
        await SupabaseService.updateApplicationStatus(applicationId, 'ACEPTADO', eventId);
        document.getElementById('applicants-modal').remove();
        app.showToast('Aceptado', 'success');
        app.loadApplicationsView();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

window.rejectApplicant = async function (applicationId, eventId) {
    if (!confirm('¿Rechazar candidatura?')) return;
    try {
        await SupabaseService.updateApplicationStatus(applicationId, 'RECHAZADO', eventId);
        document.getElementById('applicants-modal').remove();
        app.showToast('Rechazado', 'success');
        app.loadApplicationsView();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};
