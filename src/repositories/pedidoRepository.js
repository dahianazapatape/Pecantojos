/**
 * Repository: Pedido
 * ADR-001 (docs/adr/0001-separar-en-capas.md) — acceso a datos de Pedidos aislado de la
 * lógica de negocio y de HTTP. Las consultas se movieron tal cual estaban en
 * routes/pedidos.js (código heredado), sin cambiar su comportamiento.
 */
const { getPool, sql } = require('../../db');
const { getRequest } = require('../utils/transaction'); // ADR-003

async function findAll({ estado, cliente, fecha_inicio, fecha_fin } = {}) {
  const where = [];
  // TODO(ADR-004, ver docs/adr/0004-parametrizar-consultas-filtros.md): filtros aún
  // construidos por concatenación de texto (vulnerables a inyección SQL). Se movieron sin
  // modificar para mantener ADR-001 y ADR-004 como decisiones y commits independientes.
  if (estado) where.push(`p.estado_pedido='${estado}'`);
  if (cliente) where.push(`c.nombre_cliente LIKE '%${cliente}%'`);
  if (fecha_inicio) where.push(`p.fecha_pedido>='${fecha_inicio}'`);
  if (fecha_fin) where.push(`p.fecha_pedido<='${fecha_fin}'`);
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT p.*, c.nombre_cliente, c.telefono as tel_cliente
    FROM PEDIDOS p LEFT JOIN CLIENTE c ON p.id_cliente=c.id
    ${whereClause} ORDER BY p.fecha_pedido DESC`);
  return result.recordset;
}

async function findById(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query(`SELECT p.*, c.nombre_cliente FROM PEDIDOS p
            LEFT JOIN CLIENTE c ON p.id_cliente=c.id WHERE p.id=@id`);
  return result.recordset[0] || null;
}

async function findDetallesConProducto(idPedido) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, idPedido)
    .query(`SELECT dp.*, pr.nombre_producto FROM DETALLE_PEDIDOS dp
            LEFT JOIN PRODUCTO pr ON dp.id_producto=pr.id WHERE dp.id_pedido=@id`);
  return result.recordset;
}

async function countDetalles(idPedido) {
  const pool = await getPool();
  const result = await pool.request().input('id', sql.Int, idPedido)
    .query('SELECT COUNT(*) as total FROM DETALLE_PEDIDOS WHERE id_pedido=@id');
  return result.recordset[0].total;
}

async function countPagos(idPedido) {
  const pool = await getPool();
  const result = await pool.request().input('id', sql.Int, idPedido)
    .query('SELECT COUNT(*) as total FROM PAGO WHERE id_pedidos=@id');
  return result.recordset[0].total;
}

async function create({ id_cliente, fecha_pedido, fecha_entrega, estado_pedido, valor_total }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id_cliente', sql.Int, id_cliente)
    .input('fecha_pedido', sql.Date, fecha_pedido || new Date())
    .input('fecha_entrega', sql.Date, fecha_entrega)
    .input('estado_pedido', sql.VarChar, estado_pedido || 'Pendiente')
    .input('valor_total', sql.Decimal(10, 2), valor_total || 0)
    .query(`INSERT INTO PEDIDOS (id_cliente,fecha_pedido,fecha_entrega,estado_pedido,valor_total)
            OUTPUT INSERTED.* VALUES (@id_cliente,@fecha_pedido,@fecha_entrega,@estado_pedido,@valor_total)`);
  return result.recordset[0];
}

async function update(id, { id_cliente, fecha_pedido, fecha_entrega, estado_pedido, valor_total }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('id_cliente', sql.Int, id_cliente)
    .input('fecha_pedido', sql.Date, fecha_pedido)
    .input('fecha_entrega', sql.Date, fecha_entrega)
    .input('estado_pedido', sql.VarChar, estado_pedido)
    .input('valor_total', sql.Decimal(10, 2), valor_total)
    .query(`UPDATE PEDIDOS SET id_cliente=@id_cliente,fecha_pedido=@fecha_pedido,
            fecha_entrega=@fecha_entrega,estado_pedido=@estado_pedido,valor_total=@valor_total
            OUTPUT INSERTED.* WHERE id=@id`);
  return result.recordset[0] || null;
}

async function getStock(idProducto, tx) {
  const request = await getRequest(tx);
  const result = await request
    .input('id_producto', sql.Int, idProducto)
    .query('SELECT stock_actual FROM INVENTARIO WHERE id_producto=@id_producto');
  return result.recordset[0] ? result.recordset[0].stock_actual : null;
}

async function insertDetalle({ id_pedido, id_producto, cantidad, precio_unitario, subtotal }, tx) {
  const request = await getRequest(tx);
  await request
    .input('id_pedido', sql.Int, id_pedido)
    .input('id_producto', sql.Int, id_producto)
    .input('cantidad', sql.Int, cantidad)
    .input('precio_unitario', sql.Decimal(10, 2), precio_unitario)
    .input('subtotal', sql.Decimal(10, 2), subtotal)
    .query(`INSERT INTO DETALLE_PEDIDOS (id_pedido,id_producto,cantidad,precio_unitario,subtotal)
            VALUES (@id_pedido,@id_producto,@cantidad,@precio_unitario,@subtotal)`);
}

async function descontarStock(idProducto, cantidad, tx) {
  const request = await getRequest(tx);
  await request
    .input('id_producto', sql.Int, idProducto)
    .input('cantidad', sql.Int, cantidad)
    .query(`UPDATE INVENTARIO SET stock_actual=stock_actual-@cantidad, fecha_actualizacion=GETDATE() WHERE id_producto=@id_producto`);
}

async function devolverStockConFecha(idProducto, cantidad, tx) {
  const request = await getRequest(tx);
  await request
    .input('id_producto', sql.Int, idProducto)
    .input('cantidad', sql.Int, cantidad)
    .query(`UPDATE INVENTARIO SET stock_actual=stock_actual+@cantidad, fecha_actualizacion=GETDATE() WHERE id_producto=@id_producto`);
}

async function recalcularTotal(idPedido, tx) {
  const request = await getRequest(tx);
  await request
    .input('id_pedido', sql.Int, idPedido)
    .query(`UPDATE PEDIDOS SET valor_total=(SELECT ISNULL(SUM(subtotal),0) FROM DETALLE_PEDIDOS WHERE id_pedido=@id_pedido) WHERE id=@id_pedido`);
}

async function findDetalleById(detalleId, tx) {
  const request = await getRequest(tx);
  const result = await request
    .input('id', sql.Int, detalleId)
    .query('SELECT * FROM DETALLE_PEDIDOS WHERE id=@id');
  return result.recordset[0] || null;
}

async function deleteDetalleById(detalleId, tx) {
  const request = await getRequest(tx);
  await request.input('id', sql.Int, detalleId).query('DELETE FROM DETALLE_PEDIDOS WHERE id=@id');
}

async function findDetallesByPedido(idPedido, tx) {
  const request = await getRequest(tx);
  const result = await request
    .input('id', sql.Int, idPedido)
    .query('SELECT id_producto, cantidad FROM DETALLE_PEDIDOS WHERE id_pedido=@id');
  return result.recordset;
}

async function incrementarStock(idProducto, cantidad, tx) {
  const request = await getRequest(tx);
  await request
    .input('ip', sql.Int, idProducto)
    .input('c', sql.Int, cantidad)
    .query('UPDATE INVENTARIO SET stock_actual=stock_actual+@c WHERE id_producto=@ip');
}

async function deletePagosByPedido(idPedido, tx) {
  const request = await getRequest(tx);
  await request.input('id', sql.Int, idPedido).query('DELETE FROM PAGO WHERE id_pedidos=@id');
}

async function deleteDetallesByPedido(idPedido, tx) {
  const request = await getRequest(tx);
  await request.input('id', sql.Int, idPedido).query('DELETE FROM DETALLE_PEDIDOS WHERE id_pedido=@id');
}

async function deletePedido(idPedido, tx) {
  const request = await getRequest(tx);
  await request.input('id', sql.Int, idPedido).query('DELETE FROM PEDIDOS WHERE id=@id');
}

module.exports = {
  findAll,
  findById,
  findDetallesConProducto,
  countDetalles,
  countPagos,
  create,
  update,
  getStock,
  insertDetalle,
  descontarStock,
  devolverStockConFecha,
  recalcularTotal,
  findDetalleById,
  deleteDetalleById,
  findDetallesByPedido,
  incrementarStock,
  deletePagosByPedido,
  deleteDetallesByPedido,
  deletePedido,
};
