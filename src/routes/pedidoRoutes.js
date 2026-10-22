/**
 * Routes: Pedido
 * ADR-001 (docs/adr/0001-separar-en-capas.md) — reemplaza a routes/pedidos.js (código
 * heredado). Solo define rutas y delega en el controller. Mismas rutas y verbos que el
 * archivo heredado, para que el frontend siga funcionando sin cambios.
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/pedidoController');

router.get('/', controller.listar);
router.get('/:id/dependencias', controller.obtenerDependencias);
router.get('/:id', controller.obtenerPorId);
router.post('/', controller.crear);
router.post('/:id/detalle', controller.agregarDetalle);
router.delete('/:id/detalle/:detalleId', controller.eliminarDetalle);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);

module.exports = router;
