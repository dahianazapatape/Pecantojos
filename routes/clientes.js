const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// GET todos + filtros por parámetro
router.get('/', async (req, res) => {
  const { ciudad, nombre, correo } = req.query;
  let where = [];
  if (ciudad) where.push(`ciudad LIKE '%${ciudad}%'`);
  if (nombre) where.push(`nombre_cliente LIKE '%${nombre}%'`);
  if (correo) where.push(`correo LIKE '%${correo}%'`);
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT * FROM CLIENTE ${whereClause} ORDER BY id`);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET por ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM CLIENTE WHERE id=@id');
    if (!result.recordset[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET advertencia antes de eliminar
router.get('/:id/dependencias', async (req, res) => {
  try {
    const pool = await getPool();
    const pedidos = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT COUNT(*) as total FROM PEDIDOS WHERE id_cliente=@id');
    res.json({
      pedidos: pedidos.recordset[0].total,
      mensaje: pedidos.recordset[0].total > 0
        ? `Este cliente tiene ${pedidos.recordset[0].total} pedido(s) asociado(s). Al eliminarlo se eliminarán también sus pedidos, detalles y pagos.`
        : 'Este cliente no tiene pedidos asociados. Se puede eliminar de forma segura.'
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST crear — valida correo duplicado
router.post('/', async (req, res) => {
  const { nombre_cliente, telefono, correo, direccion, ciudad, fecha_registro } = req.body;
  try {
    const pool = await getPool();
    // Verificar correo duplicado
    if (correo) {
      const dup = await pool.request()
        .input('correo', sql.VarChar, correo)
        .query('SELECT id FROM CLIENTE WHERE correo=@correo');
      if (dup.recordset.length > 0) return res.status(400).json({ error: `Ya existe un cliente registrado con el correo ${correo}` });
    }
    const result = await pool.request()
      .input('nombre_cliente', sql.VarChar, nombre_cliente)
      .input('telefono', sql.VarChar, telefono)
      .input('correo', sql.VarChar, correo)
      .input('direccion', sql.VarChar, direccion)
      .input('ciudad', sql.VarChar, ciudad)
      .input('fecha_registro', sql.Date, fecha_registro || new Date())
      .query(`INSERT INTO CLIENTE (nombre_cliente,telefono,correo,direccion,ciudad,fecha_registro)
              OUTPUT INSERTED.* VALUES (@nombre_cliente,@telefono,@correo,@direccion,@ciudad,@fecha_registro)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT actualizar — valida correo duplicado excluyendo el mismo cliente
router.put('/:id', async (req, res) => {
  const { nombre_cliente, telefono, correo, direccion, ciudad, fecha_registro } = req.body;
  try {
    const pool = await getPool();
    if (correo) {
      const dup = await pool.request()
        .input('correo', sql.VarChar, correo)
        .input('id', sql.Int, req.params.id)
        .query('SELECT id FROM CLIENTE WHERE correo=@correo AND id<>@id');
      if (dup.recordset.length > 0) return res.status(400).json({ error: `Ya existe otro cliente con el correo ${correo}` });
    }
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('nombre_cliente', sql.VarChar, nombre_cliente)
      .input('telefono', sql.VarChar, telefono)
      .input('correo', sql.VarChar, correo)
      .input('direccion', sql.VarChar, direccion)
      .input('ciudad', sql.VarChar, ciudad)
      .input('fecha_registro', sql.Date, fecha_registro)
      .query(`UPDATE CLIENTE SET nombre_cliente=@nombre_cliente,telefono=@telefono,correo=@correo,
              direccion=@direccion,ciudad=@ciudad,fecha_registro=@fecha_registro
              OUTPUT INSERTED.* WHERE id=@id`);
    if (!result.recordset[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE en cascada: pagos → detalles → pedidos → cliente
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    // 1. Obtener pedidos del cliente
    const pedidos = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT id FROM PEDIDOS WHERE id_cliente=@id');

    for (const p of pedidos.recordset) {
      // 2. Devolver stock de cada detalle al inventario
      const detalles = await pool.request()
        .input('pid', sql.Int, p.id)
        .query('SELECT id_producto, cantidad FROM DETALLE_PEDIDOS WHERE id_pedido=@pid');
      for (const d of detalles.recordset) {
        await pool.request()
          .input('ip', sql.Int, d.id_producto)
          .input('c', sql.Int, d.cantidad)
          .query('UPDATE INVENTARIO SET stock_actual=stock_actual+@c WHERE id_producto=@ip');
      }
      // 3. Eliminar pagos del pedido
      await pool.request().input('pid', sql.Int, p.id).query('DELETE FROM PAGO WHERE id_pedidos=@pid');
      // 4. Eliminar detalles del pedido
      await pool.request().input('pid', sql.Int, p.id).query('DELETE FROM DETALLE_PEDIDOS WHERE id_pedido=@pid');
      // 5. Eliminar pedido
      await pool.request().input('pid', sql.Int, p.id).query('DELETE FROM PEDIDOS WHERE id=@pid');
    }
    // 6. Eliminar cliente
    await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM CLIENTE WHERE id=@id');
    res.json({ message: 'Cliente y todos sus datos eliminados correctamente' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
