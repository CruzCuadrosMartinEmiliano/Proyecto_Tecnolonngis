// Esperar a que el HTML cargue por completo antes de ejecutar cualquier lógica
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. CAPTURA DE ELEMENTOS PARA LA ANIMACIÓN VISUAL (TOGGLE)
    const signIn = document.getElementById('sign-in');
    const signUp = document.getElementById('sign-up');
    const form = document.getElementById('form');
    const banner = document.getElementById('banner');

    if (signIn && signUp) {
        signIn.addEventListener('click', () => {
            form.classList.remove('toggle');
            banner.classList.remove('toggle');
            ocultarMensajeLogin('login-message');
            ocultarMensajeLogin('register-message');
        });

        signUp.addEventListener('click', () => {
            form.classList.add('toggle');
            banner.classList.add('toggle');
            ocultarMensajeLogin('login-message');
            ocultarMensajeLogin('register-message');
        });
    }

    // 2. CAPTURA DE LOS FORMULARIOS PARA ENVÍO DE DATOS
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const EXPECTED_ORIGIN = 'http://localhost:3000';
    const usingNodeServer = window.location.origin === EXPECTED_ORIGIN;
    const API_BASE_URL = usingNodeServer ? window.location.origin : EXPECTED_ORIGIN;

    function mostrarMensajeLogin(id, texto, tipo = 'error') {
        const elemento = document.getElementById(id);
        if (!elemento) return;
        elemento.innerText = texto;
        elemento.classList.remove('error', 'success', 'info');
        elemento.classList.add(tipo);
        elemento.style.display = 'block';
    }

    function ocultarMensajeLogin(id) {
        const elemento = document.getElementById(id);
        if (!elemento) return;
        elemento.innerText = '';
        elemento.style.display = 'none';
    }

    // ==========================================
    // 3. LÓGICA PARA EL INICIO DE SESIÓN (LOGIN)
    // ==========================================
    const currentSession = JSON.parse(localStorage.getItem('admintech_sesion')) || null;
    if (currentSession && (currentSession.email || currentSession.username || currentSession.id)) {
        window.location.href = '../BodyApp/Aplicacion_principal.html';
        return;
    }

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página se recargue automáticamente

            // Capturamos los valores de los inputs de Login
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // --- VALIDACIONES EN EL FRONTEND ---
            if (email === "" || password === "") {
                mostrarMensajeLogin('login-message', 'Por favor, rellena todos los campos.', 'error');
                return; 
            }

            if (!email.includes("@") || !email.includes(".")) {
                mostrarMensajeLogin('login-message', 'Por favor, introduce un correo electrónico válido.', 'error');
                return; 
            }

            ocultarMensajeLogin('login-message');

            // --- ENVÍO DE DATOS AL BACKEND ---
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                // Si el backend responde que los datos son correctos, redirige
                if (data.status === 'success') {
                    const usuario = data.usuario || { username: email, email, pvpasword: '' };
                    usuario.pvpasword = usuario.pvpasword || '';
                    localStorage.setItem('admintech_sesion', JSON.stringify(usuario));
                    mostrarMensajeLogin('login-message', '¡Inicio de sesión correcto!', 'success');
                    if (usingNodeServer) {
                        window.location.href = '../BodyApp/Aplicacion_principal.html';
                    } else {
                        const sessionParam = encodeURIComponent(JSON.stringify(usuario));
                        window.location.href = `${API_BASE_URL}/BodyApp/Aplicacion_principal.html?session=${sessionParam}`;
                    }
                } else {
                    mostrarMensajeLogin('login-message', 'Error: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Error al conectar con el servidor:', error);
                mostrarMensajeLogin('login-message', 'No se pudo conectar con el servidor.', 'error');
            }
        });
    }

    // ==========================================
    // 4. LÓGICA PARA EL REGISTRO DE CUENTA
    // ==========================================
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página se recargue automáticamente

            // Capturamos los valores de los inputs de Registro
            const username = document.getElementById('name').value.trim();
            const email = document.getElementById('emailR').value.trim();
            const password = document.getElementById('passwordR').value;

            // --- VALIDACIONES EN EL FRONTEND ---
            if (username === "" || email === "" || password === "") {
                mostrarMensajeLogin('register-message', 'Todos los campos son obligatorios para el registro.', 'error');
                return; 
            }

            if (!email.includes("@")) {
                mostrarMensajeLogin('register-message', 'Por favor, introduce un correo válido para el registro.', 'error');
                return;
            }

            if (password.length < 6) {
                mostrarMensajeLogin('register-message', 'La contraseña debe tener al menos 6 caracteres.', 'error');
                return;
            }

            if (password.length > 8) {
                mostrarMensajeLogin('register-message', 'La contraseña no puede tener más de 8 caracteres.', 'error');
                return;
            }

            ocultarMensajeLogin('register-message');

            // --- ENVÍO DE DATOS AL BACKEND ---
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/crear`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                // Si el backend registró al usuario con éxito, redirige a la app
                if (data.status === 'success') {
                    const usuario = { id: data.usuarioId || null, username, email, pvpasword: '' };
                    localStorage.setItem('admintech_sesion', JSON.stringify(usuario));
                    mostrarMensajeLogin('register-message', '¡Cuenta creada con éxito! Bienvenido.', 'success');
                    if (usingNodeServer) {
                        window.location.href = '../BodyApp/Aplicacion_principal.html';
                    } else {
                        const sessionParam = encodeURIComponent(JSON.stringify(usuario));
                        window.location.href = `${API_BASE_URL}/BodyApp/Aplicacion_principal.html?session=${sessionParam}`;
                    }
                } else {
                    mostrarMensajeLogin('register-message', 'Error al registrar: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Error al conectar con el servidor:', error);
                mostrarMensajeLogin('register-message', 'No se pudo conectar con el servidor.', 'error');
            }
        });
    }
});