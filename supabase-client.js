// Configuración del cliente Supabase
// Credenciales del proyecto Encuentros Reales
const SUPABASE_URL = 'https://saqmbaanltvvidenvhow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhcW1iYWFubHR2dmlkZW52aG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTAxNTEsImV4cCI6MjA4MDg4NjE1MX0.n6LHIyp6lIINIRzgzHYjLTWg2Sj_XeLRxc3car5XqLo';

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
