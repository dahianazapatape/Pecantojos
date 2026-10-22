/**
 * Controller: Pedido
 * ADR-001 (docs/adr/0001-separar-en-capas.md) — traduce HTTP (req/res) hacia la capa de
 * servicio y los errores de negocio (HttpError) hacia códigos de estado. Sin SQL ni reglas
 * de negocio.
 */
const service = require('../services/pedidoService');

function handleError(res, err) {
  res.status(err.status || 500).json({ error: err.message });
}

async function listar(req, res) {
  try { res.json(await service.listar(req.query)); } catch (err) { handleError(res, err); }
}

async function obtenerPorId(req, res) {
  try { res.json(await service.obtenerPorId(req.params.id)); } catch (err) { handleError(res, err); }
}

async function obtenerDependencias(req, res) {
  try { res.json(await service.obtenerDependencias(req.params.id)); } catch (err) { handleError(res, err); }
}

async function crear(req, res) {
  try { res.status(201).json(await service.crear(req.body)); } catch (err) { handleError(res, err); }
}

async function actualizar(req, res) {
  try { res.json(await service.actualizar(req.params.id, req.body)); } catch (err) { handleError(res, err); }
}

async function agregarDetalle(req, res) {
  try { res.status(201).json(await service.agregarDetalle(req.params.id, req.body)); } catch (err) { handleError(res, err); }
}

async function eliminarDetalle(req, res) {
  try { res.json(await service.eliminarDetalle(req.params.id, req.params.detalleId)); } catch (err) { handleError(res, err); }
}

async function eliminar(req, res) {
  try { res.json(await service.eliminar(req.params.id)); } catch (err) { handleError(res, err); }
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerDependencias,
  crear,
  actualizar,
  agregarDetalle,
  eliminarDetalle,
  eliminar,
};
