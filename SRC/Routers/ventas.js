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
        const [rows] = await db.execute('SELECT * FROM ventas WHERE usuario_id = ? ORDER BY fecha DESC', [usuarioId]);
        res.json({ status: 'success', data: rows });
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al obtener ventas.' });
    }
});

router.get('/:id', verificarSesion, async (req, res) => {
    const usuarioId = req.session.usuarioId;
    try {
        const [rows] = await db.execute('SELECT * FROM ventas WHERE id = ? AND usuario_id = ?', [req.params.id, usuarioId]);
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Venta no encontrada o no autorizada.' });
        }
        res.json({ status: 'success', data: rows[0] });
    } catch (error) {
        console.error('Error al obtener venta:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al obtener venta.' });
    }
});

router.post('/', verificarSesion, async (req, res) => {
    const { total, detalles, vendedor, fecha } = req.body;
    const usuarioId = req.session.usuarioId;

    if (total === undefined || !detalles) {
        return res.status(400).json({ status: 'error', message: 'Total y detalles son requeridos.' });
    }

    try {
        await db.execute(
            'INSERT INTO ventas (total, detalles, vendedor, fecha, usuario_id) VALUES (?, ?, ?, ?, ?)',
            [total, JSON.stringify(detalles), vendedor || 'Desconocido', fecha || new Date(), usuarioId]
        );
        res.status(201).json({ status: 'success', message: 'Venta registrada correctamente.' });
    } catch (error) {
        console.error('Error al crear venta:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al crear venta.' });
    }
});

router.delete('/:id', verificarSesion, async (req, res) => {
    const usuarioId = req.session.usuarioId;
    try {
        const [result] = await db.execute('DELETE FROM ventas WHERE id = ? AND usuario_id = ?', [req.params.id, usuarioId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Venta no encontrada o no autorizada.' });
        }
        res.json({ status: 'success', message: 'Venta eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar venta:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al eliminar venta.' });
    }
});

module.exports = router;