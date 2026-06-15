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
        const [rows] = await db.execute('SELECT * FROM productos WHERE usuario_id = ?', [usuarioId]);
        res.json({ status: 'success', data: rows });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al obtener productos.' });
    }
});

router.get('/:id', verificarSesion, async (req, res) => {
    const usuarioId = req.session.usuarioId;
    try {
        const [rows] = await db.execute('SELECT * FROM productos WHERE id = ? AND usuario_id = ?', [req.params.id, usuarioId]);
        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Producto no encontrado o no autorizado.' });
        }
        res.json({ status: 'success', data: rows[0] });
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al obtener producto.' });
    }
});

router.post('/', verificarSesion, async (req, res) => {
    const { sku, nombre, descripcion, categoria, marca, pCompra, pVenta, stock, stockMin, proveedor, tVenta, fVencimiento, estado } = req.body;
    const usuarioId = req.session.usuarioId;

    if (!sku || !nombre || !categoria || !marca) {
        return res.status(400).json({ status: 'error', message: 'SKU, nombre, categoría y marca son requeridos.' });
    }

    try {
        await db.execute(
            `INSERT INTO productos (sku, nombre, descripcion, categoria, marca, pCompra, pVenta, stock, stockMin, proveedor, tVenta, fVencimiento, estado, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sku, nombre, descripcion || '', categoria, marca, pCompra || 0, pVenta || 0, stock || 0, stockMin || 0, proveedor || '', tVenta || 'Unidad', fVencimiento || null, estado || 'Óptimo', usuarioId]
        );
        res.status(201).json({ status: 'success', message: 'Producto guardado correctamente.' });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al crear producto.' });
    }
});

router.put('/:id', verificarSesion, async (req, res) => {
    const usuarioId = req.session.usuarioId;
    const fields = [];
    const params = [];
    const allowed = ['sku', 'nombre', 'descripcion', 'categoria', 'marca', 'pCompra', 'pVenta', 'stock', 'stockMin', 'proveedor', 'tVenta', 'fVencimiento', 'estado'];
    
    allowed.forEach(field => {
        if (req.body[field] !== undefined) {
            fields.push(`${field} = ?`);
            params.push(req.body[field]);
        }
    });

    if (fields.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No se enviaron campos para actualizar.' });
    }

    // Agregamos los parámetros requeridos por la cláusula WHERE
    params.push(req.params.id);
    params.push(usuarioId);

    try {
        const [result] = await db.execute(`UPDATE productos SET ${fields.join(', ')} WHERE id = ? AND usuario_id = ?`, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Producto no encontrado o no autorizado.' });
        }
        res.json({ status: 'success', message: 'Producto actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al actualizar producto.' });
    }
});

router.delete('/:id', verificarSesion, async (req, res) => {
    const usuarioId = req.session.usuarioId;
    try {
        const [result] = await db.execute('DELETE FROM productos WHERE id = ? AND usuario_id = ?', [req.params.id, usuarioId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Producto no encontrado o no autorizado.' });
        }
        res.json({ status: 'success', message: 'Producto eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al eliminar producto.' });
    }
});

module.exports = router;