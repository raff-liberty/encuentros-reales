// Configuración del cliente Supabase
// REEMPLAZAR CON TUS CREDENCIALES REALES
const SUPABASE_URL = 'https://saqmbaanltvvidenvhow.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1jDDbu4bsfv9IihHc7fd5w_008ETkIV';

// Verificar si la librería de Supabase está cargada
let supabase = null;
if (window.supabase) {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Cliente Supabase inicializado');
    } catch (e) {
        console.error('❌ Error inicializando Supabase:', e);
    }
} else {
    console.warn('⚠️ Librería @supabase/supabase-js no encontrada');
}

// Export para uso global
window.supabaseClient = supabase;
