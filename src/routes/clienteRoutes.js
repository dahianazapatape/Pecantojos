/**
 * Routes: Cliente
 * ADR-001 (docs/adr/0001-separar-en-capas.md) — reemplaza a routes/clientes.js
 * (código heredado). Solo define las rutas y delega en el controller; sin SQL ni
 * lógica de negocio.
 *
 * Mismas rutas y mismos verbos que el archivo heredado, para que el frontend
 * actual (index.html) siga funcionando sin cambios al apuntar aquí.
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/clienteController');

router.get('/', controller.listar);
router.get('/:id/dependencias', controller.obtenerDependencias);
router.get('/:id', controller.obtenerPorId);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);

module.exports = router;
