/**
 * Service: Cliente
 * ADR-001 (docs/adr/0001-separar-en-capas.md) — lógica de negocio del módulo de
 * Clientes, separada de las rutas (HTTP) y del acceso a datos (repository).
 * ADR-003: la eliminación en cascada se ejecuta dentro de una transacción (ver eliminar).
 * ADR-005: los datos de entrada se validan antes de llegar a la base de datos.
 */
const repo = require('../repositories/clienteRepository');
const { HttpError } = require('../utils/httpError');
const { withTransaction } = require('../utils/transaction'); // ADR-003
const { validarId, validarCliente } = require('../validators/validaciones'); // ADR-005

async function listar(filtros) {
  return repo.findAll(filtros);
}

async function obtenerPorId(id) {
  validarId(id, 'id del cliente'); // ADR-005
  const cliente = await repo.findById(id);
  if (!cliente) throw new HttpError(404, 'Cliente no encontrado');
  return cliente;
}

async function obtenerDependencias(id) {
  validarId(id, 'id del cliente'); // ADR-005
  const totalPedidos = await repo.countPedidosByCliente(id);
  return {
    pedidos: totalPedidos,
    mensaje: totalPedidos > 0
      ? `Este cliente tiene ${totalPedidos} pedido(s) asociado(s). Al eliminarlo se eliminarán también sus pedidos, detalles y pagos.`
      : 'Este cliente no tiene pedidos asociados. Se puede eliminar de forma segura.',
  };
}

async function crear(datos) {
  validarCliente(datos); // ADR-005
  if (datos.correo) {
    const existentes = await repo.findByCorreo(datos.correo);
    if (existentes.length > 0) {
      throw new HttpError(400, `Ya existe un cliente registrado con el correo ${datos.correo}`);
    }
  }
  return repo.create(datos);
}

async function actualizar(id, datos) {
  validarId(id, 'id del cliente'); // ADR-005
  validarCliente(datos);           // ADR-005
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
  validarId(id, 'id del cliente'); // ADR-005: se valida antes de abrir la transacción
  // ADR-003: toda la cascada (devolver stock, borrar pagos/detalles/pedidos y el cliente) corre
  // en una sola transacción: si cualquier paso falla, no queda nada a medias.
  await withTransaction(async (tx) => {
    const pedidoIds = await repo.findPedidoIdsByCliente(id, tx);

    for (const pedidoId of pedidoIds) {
      const detalles = await repo.findDetallesByPedido(pedidoId, tx);
      for (const detalle of detalles) {
        await repo.incrementarStock(detalle.id_producto, detalle.cantidad, tx);
      }
      await repo.deletePagosByPedido(pedidoId, tx);
      await repo.deleteDetallesByPedido(pedidoId, tx);
      await repo.deletePedido(pedidoId, tx);
    }

    await repo.deleteById(id, tx);
  });
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
