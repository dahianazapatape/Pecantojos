/**
 * Service: Cliente
 * ADR-001 (docs/adr/0001-separar-en-capas.md) — lógica de negocio del módulo de
 * Clientes, separada de las rutas (HTTP) y del acceso a datos (repository).
 *
 * La eliminación en cascada (eliminar) ejecuta varios pasos de escritura sin
 * envolverlos en una transacción, igual que en el código heredado. Eso es
 * exactamente el Problema descrito en ADR-003 (docs/adr/0003-control-transaccional.md):
 * se deja así a propósito, para que ADR-003 sea una decisión e commit independiente
 * sobre este mismo método.
 */
const repo = require('../repositories/clienteRepository');
const { HttpError } = require('../utils/httpError');

async function listar(filtros) {
  return repo.findAll(filtros);
}

async function obtenerPorId(id) {
  const cliente = await repo.findById(id);
  if (!cliente) throw new HttpError(404, 'Cliente no encontrado');
  return cliente;
}

async function obtenerDependencias(id) {
  const totalPedidos = await repo.countPedidosByCliente(id);
  return {
    pedidos: totalPedidos,
    mensaje: totalPedidos > 0
      ? `Este cliente tiene ${totalPedidos} pedido(s) asociado(s). Al eliminarlo se eliminarán también sus pedidos, detalles y pagos.`
      : 'Este cliente no tiene pedidos asociados. Se puede eliminar de forma segura.',
  };
}

async function crear(datos) {
  if (datos.correo) {
    const existentes = await repo.findByCorreo(datos.correo);
    if (existentes.length > 0) {
      throw new HttpError(400, `Ya existe un cliente registrado con el correo ${datos.correo}`);
    }
  }
  return repo.create(datos);
}

async function actualizar(id, datos) {
  if (datos.correo) {
    const existentes = await repo.findByCorreo(datos.correo, id);
    if (existentes.length > 0) {
      throw new HttpError(400, `Ya existe otro cliente con el correo ${datos.correo}`);
    }
  }
  const actualizado = await repo.update(id, datos);
  if (!actualizado) throw new HttpError(404, 'Cliente no encontrado');
  return actualizado;
}

async function eliminar(id) {
  // TODO(ADR-003, ver docs/adr/0003-control-transaccional.md): envolver estos pasos
  // en una transacción (BEGIN TRANSACTION / COMMIT / ROLLBACK) para que, si uno falla
  // a mitad de camino, no quede inventario descontado ni registros a medio borrar.
  const pedidoIds = await repo.findPedidoIdsByCliente(id);

  for (const pedidoId of pedidoIds) {
    const detalles = await repo.findDetallesByPedido(pedidoId);
    for (const detalle of detalles) {
      await repo.incrementarStock(detalle.id_producto, detalle.cantidad);
    }
    await repo.deletePagosByPedido(pedidoId);
    await repo.deleteDetallesByPedido(pedidoId);
    await repo.deletePedido(pedidoId);
  }

  await repo.deleteById(id);
  return { message: 'Cliente y todos sus datos eliminados correctamente' };
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerDependencias,
  crear,
  actualizar,
  eliminar,
};
