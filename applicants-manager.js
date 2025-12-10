
// ===== FUNCIÓN GLOBAL PARA GESTIONAR CANDIDATOS =====
window.showApplicants = async function (button) {
    const eventId = button.getAttribute('data-event-id');
    console.log('📋 Abriendo gestión de candidatos para evento:', eventId);

    try {
        // 1. Obtener detalles del evento (para el estado) Y las aplicaciones
        const [event, applications] = await Promise.all([
            SupabaseService.getEventById(eventId),
            SupabaseService.getEventApplications(eventId)
        ]);

        console.log('Evento:', event);
        console.log('Aplicaciones:', applications);

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'applicants-modal';
        modal.style.display = 'flex';

        const pending = applications.filter(app => app.status === 'PENDIENTE');
        const accepted = applications.filter(app => app.status === 'ACEPTADO');
        const rejected = applications.filter(app => app.status === 'RECHAZADO');

        const isClosed = event.status === 'CERRADO';
        const isFinished = event.status === 'FINALIZADO';
        const isActive = !isClosed && !isFinished; // Por defecto o explícito 'ACTIVO'

        let actionButtons = '';
        if (isActive) {
            actionButtons = `
                <button class="btn btn-warning" onclick="closeSelection('${eventId}')" style="background: #ffaa00; color: #000;">
                    🔒 Cerrar Selección
                </button>
            `;
        } else if (isClosed) {
            actionButtons = `
                <button class="btn btn-success" onclick="finalizeEventManager('${eventId}')">
                    🏁 Finalizar Evento
                </button>
            `;
        }

        let bodyContent = '';

        if (isActive) {
            // VISTA ACTIVA: Gestionar todo
            bodyContent = `
                ${applications.length === 0 ? `
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 48px;">📋</div>
                        <h3>No hay candidaturas</h3>
                    </div>
                ` : `
                    ${pending.length > 0 ? `
                        <h3 style="color: #ffd700; margin-bottom: 16px;">⏳ Pendientes (${pending.length})</h3>
                        ${pending.map(app => renderApplicantCard(app, eventId, true)).join('')}
                    ` : ''}
                    
                    ${accepted.length > 0 ? `
                        <h3 style="color: #00ff88; margin: 24px 0 16px;">✅ Aceptados (${accepted.length})</h3>
                        ${accepted.map(app => renderApplicantCard(app, eventId, true)).join('')}
                    ` : ''}
                    
                    ${rejected.length > 0 ? `
                        <h3 style="color: #ff4444; margin: 24px 0 16px;">❌ Rechazados (${rejected.length})</h3>
                        ${rejected.map(app => renderApplicantCard(app, eventId, true)).join('')}
                    ` : ''}
                `}
            `;
        } else {
            // VISTA CERRADA O FINALIZADA: Solo mostrar aceptados (Resumen)
            bodyContent = `
                <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                    <h3 style="margin-top:0;">
                        ${isClosed ? '🔒 Selección Cerrada' : '🏁 Evento Finalizado'}
                    </h3>
                    <p>
                        ${isClosed
                    ? 'Ya no se pueden aceptar ni rechazar candidatos. Aquí tienes el resumen de participantes.'
                    : 'El evento ha concluido. Gracias por organizar.'}
                    </p>
                </div>

                <h3 style="color: #00ff88; margin-bottom: 16px;">👥 Participantes (${accepted.length})</h3>
                ${accepted.length > 0
                    ? accepted.map(app => renderApplicantCard(app, eventId, false)).join('')
                    : '<p>No hubo participantes aceptados.</p>'
                }
            `;
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header" style="justify-content: space-between; align-items: center;">
                    <h2 style="margin:0;">Gestionar Candidatos</h2>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${actionButtons}
                        <button class="close-modal" onclick="document.getElementById('applicants-modal').remove()">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    ${bodyContent}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error cargando candidatos:', error);
        alert('Error: ' + error.message);
    }
};

function renderApplicantCard(application, eventId, allowActions) {
    const user = application.applicant || {};
    const status = application.status;
    const borderColor = status === 'ACEPTADO' ? '#00ff88' : status === 'RECHAZADO' ? '#ff4444' : '#ffd700';

    return `
        <div class="card" style="margin-bottom: 16px; border-left: 4px solid ${borderColor};">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${user.avatar || user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username}" 
                             style="width: 50px; height: 50px; border-radius: 50%;">
                        <div>
                            <strong>${user.username || 'Usuario'}</strong>
                            <div style="color: #999; font-size: 14px; display: flex; gap: 8px;">
                                ${user.age ? `<span>${user.age} años</span>` : ''}
                                ${user.rating ? `<span>⭐ ${Number(user.rating).toFixed(1)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    ${user.bio ? `<p style="color: #999; font-size: 14px; margin-top: 8px;">${user.bio}</p>` : ''}
                    <button class="btn btn-secondary btn-small" style="margin-top: 8px;" onclick="app.viewUserProfile('${user.id}')">
                        👤 Ver perfil completo
                    </button>
                </div>
                ${allowActions && status === 'PENDIENTE' ? `
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-success btn-small" onclick="acceptApplicant('${application.id}', '${eventId}')">✅</button>
                        <button class="btn btn-error btn-small" onclick="rejectApplicant('${application.id}', '${eventId}')">❌</button>
                    </div>
                ` : `<span class="badge badge-${status === 'ACEPTADO' ? 'success' : status === 'RECHAZADO' ? 'error' : 'warning'}">${status}</span>`}
            </div>
        </div>
    `;
}

// FUNCIONES DE CONTROL
window.closeSelection = async function (eventId) {
    if (!confirm('🛑 ¿CERRAR SELECCIÓN?\n\nEsto avisará a los participantes aceptados y bloqueará nuevas solicitudes.\nEsta acción no se puede deshacer.')) return;

    try {
        await SupabaseService.closeEventSelection(eventId);
        document.getElementById('applicants-modal').remove();
        app.showToast('Selección cerrada correctamente', 'success');
        // Reabrir modal para ver nuevo estado o recargar vista
        app.loadMyEventsView();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

window.finalizeEventManager = async function (eventId) {
    if (!confirm('🏁 ¿FINALIZAR EVENTO?\n\nAntes de terminar, puntúa a los participantes.')) return;

    // Obtener participantes aceptados
    try {
        const applications = await SupabaseService.getEventApplications(eventId);
        const accepted = applications.filter(app => app.status === 'ACEPTADO');

        if (accepted.length === 0) {
            // Si no hay nadie, finalizar directo
            await SupabaseService.finalizeEvent(eventId);
            document.getElementById('applicants-modal').remove();
            app.showToast('Evento finalizado', 'success');
            app.loadMyEventsView();
        } else {
            // Cerrar modal actual y abrir el de valoración
            document.getElementById('applicants-modal').remove();
            showRatingModal(eventId, accepted);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

// ===== MODAL DE VALORACIÓN =====
window.showRatingModal = function (eventId, participants) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'rating-modal';
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; background: #2a1b3d;">
            <div class="modal-header">
                <h2>Valorar participantes</h2>
            </div>
            <div class="modal-body">
                ${participants.map(app => renderRatingCard(app)).join('')}
            </div>
            <div class="modal-footer" style="padding: 20px; display: flex; justify-content: space-between;">
                <button class="btn btn-secondary" onclick="document.getElementById('rating-modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="submitRatings('${eventId}')" style="background: #bd00ff;">Guardar valoraciones</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

window.renderRatingCard = function (application) {
    const user = application.applicant || {};
    return `
        <div class="rating-card" data-user-id="${user.id}" style="background: #3b2a55; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <img src="${user.avatar || user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username}" 
                     style="width: 40px; height: 40px; border-radius: 50%;">
                <strong>${user.username || 'Usuario'}</strong>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label style="display: block; font-size: 12px; margin-bottom: 5px;">Calificación</label>
                <div class="star-rating" data-user-id="${user.id}" style="font-size: 24px; cursor: pointer;">
                    ${[1, 2, 3, 4, 5].map(star => `
                        <span onclick="setRating('${user.id}', ${star})" id="star-${user.id}-${star}" style="color: #555;">★</span>
                    `).join('')}
                </div>
                <input type="hidden" id="rating-${user.id}" value="0">
            </div>
            
            <textarea id="comment-${user.id}" placeholder="Comentario sobre su comportamiento..." 
                style="width: 100%; background: rgba(255,255,255,0.1); border: none; padding: 10px; color: white; border-radius: 5px; min-height: 60px;"></textarea>
        </div>
    `;
};

window.setRating = function (userId, rating) {
    document.getElementById(`rating-${userId}`).value = rating;
    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`star-${userId}-${i}`);
        star.style.color = i <= rating ? '#ffd700' : '#555';
    }
};

window.submitRatings = async function (eventId) {
    const cards = document.querySelectorAll('.rating-card');
    const ratings = [];

    // INTENTO 1: Obtener de app global
    let reviewerId = window.app && window.app.user ? window.app.user.id : null;

    // INTENTO 2: Obtener directamente de Supabase (si app.user falló)
    if (!reviewerId && window.supabaseClient) {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (user) reviewerId = user.id;
        } catch (e) {
            console.error('Error recuperando usuario:', e);
        }
    }

    if (!reviewerId) {
        alert('Error: No se pudo identificar tu sesión. Por favor, recarga la página.');
        return;
    }

    cards.forEach(card => {
        const reviewedId = card.getAttribute('data-user-id');
        const rating = document.getElementById(`rating-${reviewedId}`).value;
        const comment = document.getElementById(`comment-${reviewedId}`).value;

        if (rating > 0) {
            ratings.push({
                reviewer_id: reviewerId,
                reviewed_id: reviewedId,
                event_id: eventId,
                rating: parseInt(rating),
                comment: comment
            });
        }
    });

    try {
        if (ratings.length > 0) {
            await SupabaseService.submitEventRatings(ratings);
        }

        await SupabaseService.finalizeEvent(eventId);
        document.getElementById('rating-modal').remove();
        app.showToast('¡Evento finalizado y valoraciones guardadas!', 'success');
        app.loadMyEventsView();

    } catch (error) {
        console.error(error);
        alert('Error guardando: ' + error.message);
    }
};

window.acceptApplicant = async function (applicationId, eventId) {
    if (!confirm('¿Aceptar candidatura?')) return;
    try {
        await SupabaseService.updateApplicationStatus(applicationId, 'ACEPTADO', eventId);
        document.getElementById('applicants-modal').remove();
        app.showToast('Aceptado', 'success');
        // Simulamos click para reabrir y refrescar
        const btn = document.querySelector(`button[data-event-id="${eventId}"]`);
        if (btn) window.showApplicants(btn);
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
        const btn = document.querySelector(`button[data-event-id="${eventId}"]`);
        if (btn) window.showApplicants(btn);
    } catch (error) {
        alert('Error: ' + error.message);
    }
};
