// =====================================================
// MAKIK STUDIO FACT - Autenticación
// =====================================================

const auth = {
    // Verificar si el usuario está logueado
    checkSession: async () => {
        const sb = getSupabaseClient();
        if (!sb) return null;
        
        const { data: { session }, error } = await sb.auth.getSession();
        if (error) return null;
        return session?.user || null;
    },

    // Login con correo y contraseña
    login: async (email, password) => {
        const sb = getSupabaseClient();
        const { data, error } = await sb.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    // Logout
    logout: async () => {
        const sb = getSupabaseClient();
        await sb.auth.signOut();
        window.location.reload();
    },

    // Obtener email del usuario actual (Helper)
    getUserEmail: () => {
        const user = appState.user;
        return user ? user.email : 'usuario@makik.com';
    }
};

window.auth = auth;
