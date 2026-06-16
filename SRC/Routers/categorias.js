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
        const [rows] = await db.execute('SELECT * FROM categorias WHERE usuario_id = ?', [usuarioId]);
        res.json({ status: 'success', data: rows });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al obtener categorías.' });
    }
});

router.post('/', verificarSesion, async (req, res) => {
    const { nombre } = req.body;
    const usuarioId = req.session.usuarioId;

    if (!nombre) {
        return res.status(400).json({ status: 'error', message: 'Nombre de categoría es requerido.' });
    }

    try {
        // 1. 🔥 NUEVO: Validar si la categoría ya existe para este usuario específico
        const [rows] = await db.execute(
            'SELECT * FROM categorias WHERE nombre = ? AND usuario_id = ?', 
            [nombre, usuarioId]
        );

        if (rows.length > 0) {
            // Si ya existe, no hacemos el INSERT. 
            // Respondemos con éxito (200) para que el frontend continúe sin romperse.
            return res.status(200).json({ 
                status: 'success', 
                message: 'La categoría ya existe y está lista para usarse.',
                data: rows[0] 
            });
        }

        // 2. Si no existe, procedemos a crearla de forma segura
        await db.execute('INSERT INTO categorias (nombre, usuario_id) VALUES (?, ?)', [nombre, usuarioId]);
        
        res.status(201).json({ status: 'success', message: 'Categoría creada correctamente.' });

    } catch (error) {
        console.error('Error al crear categoría:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al crear categoría.' });
    }
});

router.put('/:id', verificarSesion, async (req, res) => {
    const { nombre } = req.body;
    const usuarioId = req.session.usuarioId;

    if (!nombre) {
        return res.status(400).json({ status: 'error', message: 'Nombre de categoría es requerido.' });
    }
    try {
        const [result] = await db.execute('UPDATE categorias SET nombre = ? WHERE id = ? AND usuario_id = ?', [nombre, req.params.id, usuarioId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Categoría no encontrada o no autorizada.' });
        }
        res.json({ status: 'success', message: 'Categoría actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar categoría:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al actualizar categoría.' });
    }
});

router.delete('/:id', verificarSesion, async (req, res) => {
    const usuarioId = req.session.usuarioId;
    try {
        const [result] = await db.execute('DELETE FROM categorias WHERE id = ? AND usuario_id = ?', [req.params.id, usuarioId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Categoría no encontrada o no autorizada.' });
        }
        res.json({ status: 'success', message: 'Categoría eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al eliminar categoría.' });
    }
});

module.exports = router;