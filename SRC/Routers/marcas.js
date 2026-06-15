const express = require('express');
const router = express.Router();
const db = require('../DB/database');

const verificarSesion = (req, res, next) => {
    if (!req.session || !req.session.usuarioId) {
        return res.status(401).json({ status: 'error', message: 'Sesión no activa. Por favor, inicia sesión.' });
    }
    next();
};

router.get('/', verificarSesion, async (req, res) => {
    const usuarioId = req.session.usuarioId;
    try {
        const [rows] = await db.execute('SELECT * FROM marcas WHERE usuario_id = ?', [usuarioId]);
        res.json({ status: 'success', data: rows });
    } catch (error) {
        console.error('Error al obtener marcas:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al obtener marcas.' });
    }
});

router.post('/', verificarSesion, async (req, res) => {
    const { nombre } = req.body;
    const usuarioId = req.session.usuarioId;

    if (!nombre) {
        return res.status(400).json({ status: 'error', message: 'Nombre de marca es requerido.' });
    }

    try {
        await db.execute('INSERT INTO marcas (nombre, usuario_id) VALUES (?, ?)', [nombre, usuarioId]);
        res.status(201).json({ status: 'success', message: 'Marca creada correctamente.' });
    } catch (error) {
        console.error('Error al crear marca:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al crear marca.' });
    }
});

router.put('/:id', verificarSesion, async (req, res) => {
    const { nombre } = req.body;
    const usuarioId = req.session.usuarioId;

    if (!nombre) {
        return res.status(400).json({ status: 'error', message: 'Nombre de marca es requerido.' });
    }

    try {
        const [result] = await db.execute('UPDATE marcas SET nombre = ? WHERE id = ? AND usuario_id = ?', [nombre, req.params.id, usuarioId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Marca no encontrada o no autorizada.' });
        }
        res.json({ status: 'success', message: 'Marca actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar marca:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al actualizar marca.' });
    }
});

router.delete('/:id', verificarSesion, async (req, res) => {
    const usuarioId = req.session.usuarioId;
    try {
        const [result] = await db.execute('DELETE FROM marcas WHERE id = ? AND usuario_id = ?', [req.params.id, usuarioId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Marca no encontrada o no autorizada.' });
        }
        res.json({ status: 'success', message: 'Marca eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar marca:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al eliminar marca.' });
    }
});

module.exports = router;