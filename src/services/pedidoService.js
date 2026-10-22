/**
 * Service: Pedido
 * ADR-001 (docs/adr/0001-separar-en-capas.md) — reglas de negocio de Pedidos (validación de
 * stock, cálculo de subtotal, orquestación de detalle/inventario/total), separadas de HTTP
 * (controller) y de SQL (repository).
 *
 * agregarDetalle, eliminarDetalle y eliminar ejecutan varios pasos de escritura sin
 * transacción, igual que el código heredado. Es el problema que resuelve ADR-003
 * (docs/adr/0003-control-transaccional.md); se deja así a propósito para que ADR-003 sea
 * una decisión y un commit independientes sobre estos mismos métodos.
 */
const repo = require('../repositories/pedidoRepository');
const { HttpError } = require('../utils/httpError');

async function listar(filtros) {
  return repo.findAll(filtros);
}

async function obtenerPorId(id) {
  const pedido = await repo.findById(id);
  if (!pedido) throw new HttpError(404, 'Pedido no encontrado');
  const detalle = await repo.findDetallesConProducto(id);
  return { ...pedido, detalle };
}

async function obtenerDependencias(id) {
  const detalles = await repo.countDetalles(id);
  const pagos = await repo.countPagos(id);
  return {
    detalles,
    pagos,
    mensaje: `Este pedido tiene ${detalles} producto(s) y ${pagos} pago(s). Al eliminarlo se devolverá el stock al inventario.`,
  };
}

async function crear(datos) {
  return repo.create(datos);
}

async function actualizar(id, datos) {
  const actualizado = await repo.update(id, datos);
  if (!actualizado) throw new HttpError(404, 'Pedido no encontrado');
  return actualizado;
}

async function agregarDetalle(idPedidoParam, { id_producto, cantidad, precio_unitario }) {
  const id_pedido = parseInt(idPedidoParam);
  const cant = parseInt(cantidad);
  const precio = parseFloat(precio_unitario);
  const subtotal = cant * precio;

  // TODO(ADR-003): los 3 pasos de escritura de abajo (insertar detalle, descontar stock,
  // recalcular total) deben ir dentro de una transacción.
  const stockActual = await repo.getStock(id_producto);
  if (stockActual === null) throw new HttpError(400, 'Este producto no tiene registro en inventario');
  if (stockActual < cant) throw new HttpError(400, `Stock insuficiente. Disponible: ${stockActual}`);

  await repo.insertDetalle({ id_pedido, id_producto, cantidad: cant, precio_unitario: precio, subtotal });
  await repo.descontarStock(id_producto, cant);
  await repo.recalcularTotal(id_pedido);
  return { message: 'Producto agregado y stock actualizado' };
}

async function eliminarDetalle(idPedido, detalleId) {
  // TODO(ADR-003): envolver en una transacción (borrar detalle + devolver stock + recalcular total).
  const detalle = await repo.findDetalleById(detalleId);
  if (!detalle) throw new HttpError(404, 'Detalle no encontrado');
  await repo.deleteDetalleById(detalleId);
  await repo.devolverStockConFecha(detalle.id_producto, detalle.cantidad);
  await repo.recalcularTotal(idPedido);
  return { message: 'Producto eliminado y stock devuelto' };
}

async function eliminar(id) {
  // TODO(ADR-003): envolver la cascada completa en una transacción.
  const detalles = await repo.findDetallesByPedido(id);
  for (const d of detalles) {
    await repo.incrementarStock(d.id_producto, d.cantidad);
  }
  await repo.deletePagosByPedido(id);
  await repo.deleteDetallesByPedido(id);
  await repo.deletePedido(id);
  return { message: 'Pedido eliminado y stock devuelto correctamente' };
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
