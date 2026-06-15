const express = require('express');
const router = express.Router();
const db = require('../DB/database');

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, username, email FROM usuarios');
        res.json({ status: 'success', data: rows });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al obtener usuarios.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, username, email FROM usuarios WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }
        res.json({ status: 'success', data: rows[0] });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al obtener usuario.' });
    }
});

router.post('/', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ status: 'error', message: 'Username, email y password son requeridos.' });
    }

    try {
        await db.execute('INSERT INTO usuarios (username, email, password) VALUES (?, ?, ?)', [username, email, password]);
        res.status(201).json({ status: 'success', message: 'Usuario registrado correctamente.' });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        if (error.errno === 1062) {
            return res.status(400).json({ status: 'error', message: 'El correo ya está registrado.' });
        }
        res.status(500).json({ status: 'error', message: 'Error interno al crear usuario.' });
    }
});

router.put('/:id/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ status: 'error', message: 'Contraseña actual y nueva son requeridas.' });
    }
    if (newPassword.length < 6 || newPassword.length > 8) {
        return res.status(400).json({ status: 'error', message: 'La nueva contraseña debe tener entre 6 y 8 caracteres.' });
    }

    try {
        const [rows] = await db.execute('SELECT password FROM usuarios WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }
        const usuario = rows[0];
        if (usuario.password !== currentPassword) {
            return res.status(401).json({ status: 'error', message: 'La contraseña actual no coincide.' });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ status: 'error', message: 'La nueva contraseña debe ser diferente a la actual.' });
        }

        const [result] = await db.execute('UPDATE usuarios SET password = ? WHERE id = ?', [newPassword, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }

        res.json({ status: 'success', message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar contraseña:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al actualizar contraseña.' });
    }
});

router.put('/:id/pvpasword', async (req, res) => {
    const currentPvPassword = (req.body.currentPvPassword || '').toString().trim();
    const newPvPassword = (req.body.newPvPassword || '').toString().trim();

    if (!currentPvPassword) {
        return res.status(400).json({ status: 'error', message: 'La contraseña privada actual es requerida.' });
    }
    if (!newPvPassword) {
        return res.status(400).json({ status: 'error', message: 'La nueva contraseña privada es requerida.' });
    }
    if (newPvPassword.length < 6 || newPvPassword.length > 8) {
        return res.status(400).json({ status: 'error', message: 'La contraseña privada debe tener entre 6 y 8 caracteres.' });
    }

    try {
        const [rows] = await db.execute('SELECT pvpasword FROM usuarios WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }
        const usuario = rows[0];
        const existingPvPassword = (usuario.pvpasword || '').toString().trim();

        if (existingPvPassword && existingPvPassword !== currentPvPassword) {
            return res.status(401).json({ status: 'error', message: 'La contraseña privada actual no coincide.' });
        }
        if (existingPvPassword === newPvPassword) {
            return res.status(400).json({ status: 'error', message: 'La nueva contraseña privada debe ser diferente a la actual.' });
        }

        const [result] = await db.execute('UPDATE usuarios SET pvpasword = ? WHERE id = ?', [newPvPassword, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }

        res.json({ status: 'success', message: 'Contraseña privada actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar contraseña privada:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al actualizar contraseña privada.' });
    }
});

router.put('/:id', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username && !email && !password) {
        return res.status(400).json({ status: 'error', message: 'Debe enviar al menos un campo para actualizar.' });
    }

    const updates = [];
    const params = [];
    if (username) { updates.push('username = ?'); params.push(username); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (password) { updates.push('password = ?'); params.push(password); }
    params.push(req.params.id);

    try {
        const [result] = await db.execute(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }
        res.json({ status: 'success', message: 'Usuario actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al actualizar usuario.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }
        res.json({ status: 'success', message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al eliminar usuario.' });
    }
});

module.exports = router;
