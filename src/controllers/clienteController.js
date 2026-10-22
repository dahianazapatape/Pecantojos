/**
 * Controller: Cliente
 * ADR-001 (docs/adr/0001-separar-en-capas.md) — traduce HTTP (req/res) hacia la
 * capa de servicio, y los errores de negocio (HttpError) hacia códigos de estado.
 * No contiene SQL ni reglas de negocio: eso vive en services/ y repositories/.
 */
const service = require('../services/clienteService');

function handleError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message });
}

async function listar(req, res) {
  try {
    const clientes = await service.listar(req.query);
    res.json(clientes);
  } catch (err) { handleError(res, err); }
}

async function obtenerPorId(req, res) {
  try {
    const cliente = await service.obtenerPorId(req.params.id);
    res.json(cliente);
  } catch (err) { handleError(res, err); }
}

async function obtenerDependencias(req, res) {
  try {
    const dependencias = await service.obtenerDependencias(req.params.id);
    res.json(dependencias);
  } catch (err) { handleError(res, err); }
}

async function crear(req, res) {
  try {
    const cliente = await service.crear(req.body);
    res.status(201).json(cliente);
  } catch (err) { handleError(res, err); }
}

async function actualizar(req, res) {
  try {
    const cliente = await service.actualizar(req.params.id, req.body);
    res.json(cliente);
  } catch (err) { handleError(res, err); }
}

async function eliminar(req, res) {
  try {
    const resultado = await service.eliminar(req.params.id);
    res.json(resultado);
  } catch (err) { handleError(res, err); }
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerDependencias,
  crear,
  actualizar,
  eliminar,
};
