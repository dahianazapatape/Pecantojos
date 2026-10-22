/**
 * Repository: Cliente
 * ADR-001 (docs/adr/0001-separar-en-capas.md) — acceso a datos aislado de la lógica
 * de negocio y del manejo de HTTP. Las consultas se movieron tal cual estaban en
 * routes/clientes.js (código heredado), sin cambiar su comportamiento.
 *
 * Nota: usa la conexión existente en la raíz del proyecto (db.js). ADR-002
 * (externalizar configuración) todavía no se aplicó aquí a propósito: es una
 * decisión independiente, pensada para que la implemente otro integrante del
 * equipo sin pisar este trabajo.
 */
const { getPool, sql } = require('../../db');

async function findAll({ ciudad, nombre, correo } = {}) {
  const where = [];
  // TODO(ADR-004, ver docs/adr/0004-parametrizar-consultas-filtros.md): estos filtros
  // siguen construidos por concatenación de texto (vulnerables a inyección SQL).
  // Se movieron sin modificar para mantener ADR-001 y ADR-004 como decisiones
  // independientes y commits separados; falta aplicar la corrección de ADR-004 aquí.
  if (ciudad) where.push(`ciudad LIKE '%${ciudad}%'`);
  if (nombre) where.push(`nombre_cliente LIKE '%${nombre}%'`);
  if (correo) where.push(`correo LIKE '%${correo}%'`);
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const pool = await getPool();
  const result = await pool.request()
    .query(`SELECT * FROM CLIENTE ${whereClause} ORDER BY id`);
  return result.recordset;
}

async function findById(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM CLIENTE WHERE id=@id');
  return result.recordset[0] || null;
}

async function countPedidosByCliente(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT COUNT(*) as total FROM PEDIDOS WHERE id_cliente=@id');
  return result.recordset[0].total;
}

async function findByCorreo(correo, excludeId = null) {
  const pool = await getPool();
  const request = pool.request().input('correo', sql.VarChar, correo);
  let query = 'SELECT id FROM CLIENTE WHERE correo=@correo';
  if (excludeId != null) {
    request.input('id', sql.Int, excludeId);
    query += ' AND id<>@id';
  }
  const result = await request.query(query);
  return result.recordset;
}

async function create({ nombre_cliente, telefono, correo, direccion, ciudad, fecha_registro }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('nombre_cliente', sql.VarChar, nombre_cliente)
    .input('telefono', sql.VarChar, telefono)
    .input('correo', sql.VarChar, correo)
    .input('direccion', sql.VarChar, direccion)
    .input('ciudad', sql.VarChar, ciudad)
    .input('fecha_registro', sql.Date, fecha_registro || new Date())
    .query(`INSERT INTO CLIENTE (nombre_cliente,telefono,correo,direccion,ciudad,fecha_registro)
            OUTPUT INSERTED.* VALUES (@nombre_cliente,@telefono,@correo,@direccion,@ciudad,@fecha_registro)`);
  return result.recordset[0];
}

async function update(id, { nombre_cliente, telefono, correo, direccion, ciudad, fecha_registro }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('nombre_cliente', sql.VarChar, nombre_cliente)
    .input('telefono', sql.VarChar, telefono)
    .input('correo', sql.VarChar, correo)
    .input('direccion', sql.VarChar, direccion)
    .input('ciudad', sql.VarChar, ciudad)
    .input('fecha_registro', sql.Date, fecha_registro)
    .query(`UPDATE CLIENTE SET nombre_cliente=@nombre_cliente,telefono=@telefono,correo=@correo,
            direccion=@direccion,ciudad=@ciudad,fecha_registro=@fecha_registro
            OUTPUT INSERTED.* WHERE id=@id`);
  return result.recordset[0] || null;
}

async function findPedidoIdsByCliente(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT id FROM PEDIDOS WHERE id_cliente=@id');
  return result.recordset.map((p) => p.id);
}

async function findDetallesByPedido(pedidoId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('pid', sql.Int, pedidoId)
    .query('SELECT id_producto, cantidad FROM DETALLE_PEDIDOS WHERE id_pedido=@pid');
  return result.recordset;
}

async function incrementarStock(idProducto, cantidad) {
  const pool = await getPool();
  await pool.request()
    .input('ip', sql.Int, idProducto)
    .input('c', sql.Int, cantidad)
    .query('UPDATE INVENTARIO SET stock_actual=stock_actual+@c WHERE id_producto=@ip');
}

async function deletePagosByPedido(pedidoId) {
  const pool = await getPool();
  await pool.request().input('pid', sql.Int, pedidoId).query('DELETE FROM PAGO WHERE id_pedidos=@pid');
}

async function deleteDetallesByPedido(pedidoId) {
  const pool = await getPool();
  await pool.request().input('pid', sql.Int, pedidoId).query('DELETE FROM DETALLE_PEDIDOS WHERE id_pedido=@pid');
}

async function deletePedido(pedidoId) {
  const pool = await getPool();
  await pool.request().input('pid', sql.Int, pedidoId).query('DELETE FROM PEDIDOS WHERE id=@pid');
}

async function deleteById(id) {
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('DELETE FROM CLIENTE WHERE id=@id');
}

module.exports = {
  findAll,
  findById,
  countPedidosByCliente,
  findByCorreo,
  create,
  update,
  findPedidoIdsByCliente,
  findDetallesByPedido,
  incrementarStock,
  deletePagosByPedido,
  deleteDetallesByPedido,
  deletePedido,
  deleteById,
};
