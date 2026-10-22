const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// GET todos + filtros
router.get('/', async (req, res) => {
  const { estado, cliente, fecha_inicio, fecha_fin } = req.query;
  let where = [];
  if (estado) where.push(`p.estado_pedido='${estado}'`);
  if (cliente) where.push(`c.nombre_cliente LIKE '%${cliente}%'`);
  if (fecha_inicio) where.push(`p.fecha_pedido>='${fecha_inicio}'`);
  if (fecha_fin) where.push(`p.fecha_pedido<='${fecha_fin}'`);
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.*, c.nombre_cliente, c.telefono as tel_cliente
      FROM PEDIDOS p LEFT JOIN CLIENTE c ON p.id_cliente=c.id
      ${whereClause} ORDER BY p.fecha_pedido DESC`);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET por ID con detalle
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const pedido = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT p.*, c.nombre_cliente FROM PEDIDOS p
              LEFT JOIN CLIENTE c ON p.id_cliente=c.id WHERE p.id=@id`);
    const detalle = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT dp.*, pr.nombre_producto FROM DETALLE_PEDIDOS dp
              LEFT JOIN PRODUCTO pr ON dp.id_producto=pr.id WHERE dp.id_pedido=@id`);
    if (!pedido.recordset[0]) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ ...pedido.recordset[0], detalle: detalle.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET dependencias antes de eliminar
router.get('/:id/dependencias', async (req, res) => {
  try {
    const pool = await getPool();
    const detalles = await pool.request().input('id', sql.Int, req.params.id)
      .query('SELECT COUNT(*) as total FROM DETALLE_PEDIDOS WHERE id_pedido=@id');
    const pagos = await pool.request().input('id', sql.Int, req.params.id)
      .query('SELECT COUNT(*) as total FROM PAGO WHERE id_pedidos=@id');
    res.json({
      detalles: detalles.recordset[0].total,
      pagos: pagos.recordset[0].total,
      mensaje: `Este pedido tiene ${detalles.recordset[0].total} producto(s) y ${pagos.recordset[0].total} pago(s). Al eliminarlo se devolverá el stock al inventario.`
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST crear
router.post('/', async (req, res) => {
  const { id_cliente, fecha_pedido, fecha_entrega, estado_pedido, valor_total } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_cliente', sql.Int, id_cliente)
      .input('fecha_pedido', sql.Date, fecha_pedido || new Date())
      .input('fecha_entrega', sql.Date, fecha_entrega)
      .input('estado_pedido', sql.VarChar, estado_pedido || 'Pendiente')
      .input('valor_total', sql.Decimal(10,2), valor_total || 0)
      .query(`INSERT INTO PEDIDOS (id_cliente,fecha_pedido,fecha_entrega,estado_pedido,valor_total)
              OUTPUT INSERTED.* VALUES (@id_cliente,@fecha_pedido,@fecha_entrega,@estado_pedido,@valor_total)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST agregar producto al detalle y restar stock
router.post('/:id/detalle', async (req, res) => {
  const { id_producto, cantidad, precio_unitario } = req.body;
  const id_pedido = parseInt(req.params.id);
  const cant = parseInt(cantidad);
  const precio = parseFloat(precio_unitario);
  const subtotal = cant * precio;
  try {
    const pool = await getPool();
    const stockResult = await pool.request()
      .input('id_producto', sql.Int, id_producto)
      .query('SELECT stock_actual FROM INVENTARIO WHERE id_producto=@id_producto');
    if (!stockResult.recordset[0]) return res.status(400).json({ error: 'Este producto no tiene registro en inventario' });
    const stockActual = stockResult.recordset[0].stock_actual;
    if (stockActual < cant) return res.status(400).json({ error: `Stock insuficiente. Disponible: ${stockActual}` });
    await pool.request()
      .input('id_pedido', sql.Int, id_pedido)
      .input('id_producto', sql.Int, id_producto)
      .input('cantidad', sql.Int, cant)
      .input('precio_unitario', sql.Decimal(10,2), precio)
      .input('subtotal', sql.Decimal(10,2), subtotal)
      .query(`INSERT INTO DETALLE_PEDIDOS (id_pedido,id_producto,cantidad,precio_unitario,subtotal)
              VALUES (@id_pedido,@id_producto,@cantidad,@precio_unitario,@subtotal)`);
    await pool.request()
      .input('id_producto', sql.Int, id_producto)
      .input('cantidad', sql.Int, cant)
      .query(`UPDATE INVENTARIO SET stock_actual=stock_actual-@cantidad, fecha_actualizacion=GETDATE() WHERE id_producto=@id_producto`);
    await pool.request()
      .input('id_pedido', sql.Int, id_pedido)
      .query(`UPDATE PEDIDOS SET valor_total=(SELECT ISNULL(SUM(subtotal),0) FROM DETALLE_PEDIDOS WHERE id_pedido=@id_pedido) WHERE id=@id_pedido`);
    res.status(201).json({ message: 'Producto agregado y stock actualizado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE producto del detalle y devolver stock
router.delete('/:id/detalle/:detalleId', async (req, res) => {
  try {
    const pool = await getPool();
    const detalleResult = await pool.request()
      .input('id', sql.Int, req.params.detalleId)
      .query('SELECT * FROM DETALLE_PEDIDOS WHERE id=@id');
    if (!detalleResult.recordset[0]) return res.status(404).json({ error: 'Detalle no encontrado' });
    const { id_producto, cantidad } = detalleResult.recordset[0];
    await pool.request().input('id', sql.Int, req.params.detalleId).query('DELETE FROM DETALLE_PEDIDOS WHERE id=@id');
    await pool.request()
      .input('id_producto', sql.Int, id_producto)
      .input('cantidad', sql.Int, cantidad)
      .query(`UPDATE INVENTARIO SET stock_actual=stock_actual+@cantidad, fecha_actualizacion=GETDATE() WHERE id_producto=@id_producto`);
    await pool.request()
      .input('id_pedido', sql.Int, req.params.id)
      .query(`UPDATE PEDIDOS SET valor_total=(SELECT ISNULL(SUM(subtotal),0) FROM DETALLE_PEDIDOS WHERE id_pedido=@id_pedido) WHERE id=@id_pedido`);
    res.json({ message: 'Producto eliminado y stock devuelto' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT actualizar
router.put('/:id', async (req, res) => {
  const { id_cliente, fecha_pedido, fecha_entrega, estado_pedido, valor_total } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('id_cliente', sql.Int, id_cliente)
      .input('fecha_pedido', sql.Date, fecha_pedido)
      .input('fecha_entrega', sql.Date, fecha_entrega)
      .input('estado_pedido', sql.VarChar, estado_pedido)
      .input('valor_total', sql.Decimal(10,2), valor_total)
      .query(`UPDATE PEDIDOS SET id_cliente=@id_cliente,fecha_pedido=@fecha_pedido,
              fecha_entrega=@fecha_entrega,estado_pedido=@estado_pedido,valor_total=@valor_total
              OUTPUT INSERTED.* WHERE id=@id`);
    if (!result.recordset[0]) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE en cascada: devolver stock → pagos → detalles → pedido
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const detalles = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT id_producto, cantidad FROM DETALLE_PEDIDOS WHERE id_pedido=@id');
    for (const d of detalles.recordset) {
      await pool.request()
        .input('ip', sql.Int, d.id_producto)
        .input('c', sql.Int, d.cantidad)
        .query('UPDATE INVENTARIO SET stock_actual=stock_actual+@c WHERE id_producto=@ip');
    }
    await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM PAGO WHERE id_pedidos=@id');
    await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM DETALLE_PEDIDOS WHERE id_pedido=@id');
    await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM PEDIDOS WHERE id=@id');
    res.json({ message: 'Pedido eliminado y stock devuelto correctamente' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
