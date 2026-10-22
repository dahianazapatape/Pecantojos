/**
 * Service: Pedido
 * ADR-001 (docs/adr/0001-separar-en-capas.md) — reglas de negocio de Pedidos (validación de
 * stock, cálculo de subtotal, orquestación de detalle/inventario/total), separadas de HTTP
 * (controller) y de SQL (repository).
 *
 * ADR-003: agregarDetalle, eliminarDetalle y eliminar se ejecutan dentro de una transacción
 * (todo o nada). Ver docs/adr/0003-control-transaccional.md.
 *
 * ADR-005: los datos de entrada se validan antes de abrir la transacción o llegar al repository
 * (evita, por ejemplo, cantidades negativas o NaN que descuadran el inventario).
 * Ver docs/adr/0005-validar-datos-de-entrada.md.
 */
const repo = require('../repositories/pedidoRepository');
const { HttpError } = require('../utils/httpError');
const { withTransaction } = require('../utils/transaction'); // ADR-003
const { validarId, validarPedido, validarDetalle } = require('../validators/validaciones'); // ADR-005

async function listar(filtros) {
  return repo.findAll(filtros);
}

async function obtenerPorId(id) {
  validarId(id, 'id del pedido'); // ADR-005
  const pedido = await repo.findById(id);
  if (!pedido) throw new HttpError(404, 'Pedido no encontrado');
  const detalle = await repo.findDetallesConProducto(id);
  return { ...pedido, detalle };
}

async function obtenerDependencias(id) {
  validarId(id, 'id del pedido'); // ADR-005
  const detalles = await repo.countDetalles(id);
  const pagos = await repo.countPagos(id);
  return {
    detalles,
    pagos,
    mensaje: `Este pedido tiene ${detalles} producto(s) y ${pagos} pago(s). Al eliminarlo se devolverá el stock al inventario.`,
  };
}

async function crear(datos) {
  validarPedido(datos); // ADR-005
  return repo.create(datos);
}

async function actualizar(id, datos) {
  validarId(id, 'id del pedido'); // ADR-005
  validarPedido(datos);           // ADR-005
  const actualizado = await repo.update(id, datos);
  if (!actualizado) throw new HttpError(404, 'Pedido no encontrado');
  return actualizado;
}

async function agregarDetalle(idPedidoParam, datos = {}) {
  // ADR-005: antes de esto, una cantidad vacía o negativa pasaba como NaN o restaba "al revés"
  // en el inventario. Ahora se rechaza con 400 sin abrir la transacción.
  const id_pedido = validarId(idPedidoParam, 'id del pedido');
  validarDetalle(datos);
  const { id_producto, cantidad, precio_unitario } = datos;
  const cant = parseInt(cantidad);
  const precio = parseFloat(precio_unitario);
  const subtotal = cant * precio;

  // ADR-003: insertar detalle + descontar stock + recalcular total son un solo bloque atómico.
  await withTransaction(async (tx) => {
    const stockActual = await repo.getStock(id_producto, tx);
    if (stockActual === null) throw new HttpError(400, 'Este producto no tiene registro en inventario');
    if (stockActual < cant) throw new HttpError(400, `Stock insuficiente. Disponible: ${stockActual}`);

    await repo.insertDetalle({ id_pedido, id_producto, cantidad: cant, precio_unitario: precio, subtotal }, tx);
    await repo.descontarStock(id_producto, cant, tx);
    await repo.recalcularTotal(id_pedido, tx);
  });
  return { message: 'Producto agregado y stock actualizado' };
}

async function eliminarDetalle(idPedido, detalleId) {
  validarId(idPedido, 'id del pedido');     // ADR-005
  validarId(detalleId, 'id del detalle');   // ADR-005
  // ADR-003: borrar detalle + devolver stock + recalcular total en una transacción.
  await withTransaction(async (tx) => {
    const detalle = await repo.findDetalleById(detalleId, tx);
    if (!detalle) throw new HttpError(404, 'Detalle no encontrado');
    await repo.deleteDetalleById(detalleId, tx);
    await repo.devolverStockConFecha(detalle.id_producto, detalle.cantidad, tx);
    await repo.recalcularTotal(idPedido, tx);
  });
  return { message: 'Producto eliminado y stock devuelto' };
}

async function eliminar(id) {
  validarId(id, 'id del pedido'); // ADR-005: se valida antes de abrir la transacción
  // ADR-003: devolver stock + borrar pagos, detalles y pedido en una transacción.
  await withTransaction(async (tx) => {
    const detalles = await repo.findDetallesByPedido(id, tx);
    for (const d of detalles) {
      await repo.incrementarStock(d.id_producto, d.cantidad, tx);
    }
    await repo.deletePagosByPedido(id, tx);
    await repo.deleteDetallesByPedido(id, tx);
    await repo.deletePedido(id, tx);
  });
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
