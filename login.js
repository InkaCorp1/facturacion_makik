// Lógica del Módulo de Login
window.initLogin = function() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('btn-login');
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('login-password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTENTICANDO...';

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        console.log('🔑 Intentando login para:', email);
        const { data, error } = await auth.login(email, password);

        if (error) {
            console.error('❌ Error de auth:', error.message);
            errorEl.style.display = 'block';
            errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message}`;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ENTRAR';
        } else {
            console.log('✅ Login exitoso');
            // La sesión se detectará automáticamente por onAuthStateChange en app.js
        }
    };
};
