// Account Management - Separate file to avoid breaking app object
// Functions for account deletion with GDPR compliance

// Confirm account deletion with double confirmation
window.confirmDeleteAccount = function () {
    const confirmation1 = confirm(
        '⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n' +
        'Estás a punto de ELIMINAR PERMANENTEMENTE tu cuenta.\n\n' +
        'Esto eliminará:\n' +
        '• Tu perfil y toda tu información personal\n' +
        '• Todos tus eventos creados\n' +
        '• Todas tus aplicaciones a eventos\n' +
        '• Todas tus fotos y galería\n' +
        '• Todas tus notificaciones\n' +
        '• Todo tu contenido del blog\n\n' +
        'ESTA ACCIÓN NO SE PUEDE DESHACER.\n\n' +
        '¿Estás ABSOLUTAMENTE SEGURO de que quieres continuar?'
    );

    if (!confirmation1) return;

    const confirmation2 = prompt(
        'Para confirmar la eliminación de tu cuenta, escribe exactamente:\n\n' +
        'ELIMINAR MI CUENTA\n\n' +
        '(en mayúsculas)'
    );

    if (confirmation2 === 'ELIMINAR MI CUENTA') {
        deleteUserAccount();
    } else if (confirmation2 !== null) {
        alert('Texto incorrecto. Eliminación cancelada.');
    }
};

// Delete user account
async function deleteUserAccount() {
    const userId = window.AppState ? window.AppState.currentUser.id : null;

    if (!userId) {
        alert('Error: No se pudo identificar el usuario.');
        return;
    }

    try {
        if (window.app && window.app.showToast) {
            window.app.showToast('Eliminando cuenta...', 'info');
        }

        await SupabaseService.deleteAccount(userId);

        alert(
            '✅ Tu cuenta ha sido eliminada permanentemente.\n\n' +
            'Todos tus datos han sido borrados de nuestros sistemas.\n\n' +
            'Gracias por haber sido parte de Encuentros Reales.'
        );

        // Redirect to home
        window.location.href = '/';
    } catch (error) {
        console.error('Error eliminando cuenta:', error);
        if (window.app && window.app.showToast) {
            window.app.showToast('Error al eliminar la cuenta. Por favor contacta soporte.', 'error');
        } else {
            alert('Error al eliminar la cuenta. Por favor contacta soporte.');
        }
    }
}

console.log('✅ Account-management.js loaded successfully');
