// Configuración del cliente Supabase
// Credenciales del proyecto Encuentros Reales
const SUPABASE_URL = 'https://saqmbaanltvvidenvhow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhcW1iYWFubHR2dmlkZW52aG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTAxNTEsImV4cCI6MjA4MDg4NjE1MX0.n6LHIyp6lIINIRzgzHYjLTWg2Sj_XeLRxc3car5XqLo';

// Función para inicializar Supabase cuando la librería esté disponible
function initSupabase() {
    try {
        // La librería de Supabase se carga como window.supabase desde el CDN
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.supabaseClient = client;
            console.log('✅ Cliente Supabase inicializado correctamente');
            return client;
        } else {
            console.error('❌ La librería de Supabase no está disponible');
            return null;
        }
    } catch (e) {
        console.error('❌ Error inicializando Supabase:', e);
        return null;
    }
}

// Intentar inicializar inmediatamente
let supabaseClient = initSupabase();

// Si no está disponible, intentar cuando el DOM esté listo
if (!supabaseClient) {
    console.log('⏳ Esperando a que la librería de Supabase se cargue...');
    window.addEventListener('DOMContentLoaded', () => {
        supabaseClient = initSupabase();
    });
}

// Export para uso global
window.supabaseClient = supabaseClient;
