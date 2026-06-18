const express = require('express');
const router = express.Router();
// Importamos la conexión a MySQL
const db = require('../DB/database'); 

// ==========================================
// 1. RUTA PARA REGISTRAR UN NUEVO USUARIO
// ==========================================
router.post('/crear', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Todos los campos son obligatorios.' 
        });
    }

    try {
        // En MySQL las consultas devuelven un array, donde la posición [0] son las filas o resultados
        const query = 'INSERT INTO usuarios (username, email, password, pvpasword) VALUES (?, ?, ?, ?)';
        const [result] = await db.execute(query, [username, email, password, '']);

        // Iniciamos la sesion del usuario recien creado para que sus datos
        // queden ligados a su cuenta desde el primer momento
        req.session.usuarioId = result.insertId;

        return res.status(201).json({
            status: 'success',
            message: '¡Usuario registrado con éxito en MySQL!',
            usuarioId: result.insertId,
            usuario: {
                id: result.insertId,
                username,
                email,
                pvpasword: ''
            }
        });
    } catch (error) {
        // Código de error de MySQL cuando se duplica una llave única (el email)
        if (error.errno === 1062) {
            return res.status(400).json({
                status: 'error',
                message: 'El correo electrónico ya está registrado.'
            });
        }
        
        console.error("Error en MySQL al registrar:", error);
        return res.status(500).json({
            status: 'error',
            message: 'Hubo un error al guardar en la base de datos.'
        });
    }
});

// ==========================================
// 2. RUTA PARA INICIAR SESIÓN (LOGIN)
// ==========================================
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Email y contraseña son requeridos.' 
        });
    }

    try {
        // Buscamos al usuario por su email
        const query = 'SELECT * FROM usuarios WHERE email = ?';
        const [rows] = await db.execute(query, [email]);

        // Si rows tiene elementos, significa que encontró al usuario
        if (rows.length > 0) {
            const usuario = rows[0];

            // Comparamos la contraseña en texto plano
            if (usuario.password === password) {
                // Guardamos el id del usuario en la sesion para que las rutas
                // protegidas filtren la informacion por cuenta
                req.session.usuarioId = usuario.id;

                return res.status(200).json({
                    status: 'success',
                    message: 'Autenticación exitosa.',
                    usuario: {
                        id: usuario.id,
                        username: usuario.username,
                        email: usuario.email,
                        pvpasword: usuario.pvpasword
                    }
                });
            }
        }

        // Si no se encuentra el usuario o la contraseña no coincide
        return res.status(401).json({
            status: 'error',
            message: 'El correo o la contraseña son incorrectos.'
        });

    } catch (error) {
        console.error("Error en MySQL al loguear:", error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor.'
        });
    }
});

// ==========================================
// 3. RUTA PARA CONSULTAR LA SESION ACTUAL
// ==========================================
router.get('/me', async (req, res) => {
    if (!req.session || !req.session.usuarioId) {
        return res.status(401).json({ status: 'error', message: 'No hay sesión activa.' });
    }

    try {
        const [rows] = await db.execute(
            'SELECT id, username, email, pvpasword FROM usuarios WHERE id = ?',
            [req.session.usuarioId]
        );
        if (rows.length === 0) {
            req.session.destroy(() => {});
            return res.status(401).json({ status: 'error', message: 'No hay sesión activa.' });
        }
        return res.json({ status: 'success', usuario: rows[0] });
    } catch (error) {
        console.error('Error al consultar la sesión:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
});

// ==========================================
// 4. RUTA PARA CERRAR SESION
// ==========================================
router.post('/logout', (req, res) => {
    if (!req.session) {
        return res.json({ status: 'success', message: 'Sesión cerrada.' });
    }
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: 'No se pudo cerrar la sesión.' });
        }
        res.clearCookie('connect.sid');
        return res.json({ status: 'success', message: 'Sesión cerrada.' });
    });
});

module.exports = router;