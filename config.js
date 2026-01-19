// =====================================================
// MAKIK STUDIO FACT - Configuración de Supabase
// =====================================================

const SUPABASE_URL = 'https://lpsupabase.luispinta.com/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.bZRDLg2HoJKCXPp_B6BD5s-qcZM6-NrKO8qtxBtFGTk';

let supabaseClient = null;

function initSupabase() {
    if (supabaseClient) return supabaseClient;

    if (typeof window.supabase !== 'undefined') {
        const { createClient } = window.supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase conectado: MAKIK STUDIO FACT');
        return supabaseClient;
    } else {
        console.error('❌ Supabase SDK no encontrado');
        return null;
    }
}

function getSupabaseClient() {
    if (!supabaseClient) {
        return initSupabase();
    }
    return supabaseClient;
}

// Inicialización inmediata para asegurar que el SDK esté listo
initSupabase();
