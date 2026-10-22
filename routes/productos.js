const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.*, c.nombre_categoria, pr.nombre_promocion
      FROM PRODUCTO p
      LEFT JOIN CATEGORIA c ON p.id_categoria = c.id
      LEFT JOIN PROMOCIONES pr ON p.id_promociones = pr.id
      ORDER BY p.id`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT p.*, c.nombre_categoria, pr.nombre_promocion
              FROM PRODUCTO p
              LEFT JOIN CATEGORIA c ON p.id_categoria = c.id
              LEFT JOIN PROMOCIONES pr ON p.id_promociones = pr.id
              WHERE p.id = @id`);
    if (!result.recordset[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { id_categoria, id_promociones, nombre_producto, descripcion, precio, disponibilidad } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_categoria', sql.Int, id_categoria)
      .input('id_promociones', sql.Int, id_promociones || null)
      .input('nombre_producto', sql.VarChar, nombre_producto)
      .input('descripcion', sql.VarChar, descripcion)
      .input('precio', sql.Decimal(10,2), precio)
      .input('disponibilidad', sql.VarChar, disponibilidad || 'Disponible')
      .query(`INSERT INTO PRODUCTO (id_categoria, id_promociones, nombre_producto, descripcion, precio, disponibilidad)
              OUTPUT INSERTED.*
              VALUES (@id_categoria, @id_promociones, @nombre_producto, @descripcion, @precio, @disponibilidad)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id_categoria, id_promociones, nombre_producto, descripcion, precio, disponibilidad } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('id_categoria', sql.Int, id_categoria)
      .input('id_promociones', sql.Int, id_promociones || null)
      .input('nombre_producto', sql.VarChar, nombre_producto)
      .input('descripcion', sql.VarChar, descripcion)
      .input('precio', sql.Decimal(10,2), precio)
      .input('disponibilidad', sql.VarChar, disponibilidad)
      .query(`UPDATE PRODUCTO SET id_categoria=@id_categoria, id_promociones=@id_promociones,
              nombre_producto=@nombre_producto, descripcion=@descripcion, precio=@precio, disponibilidad=@disponibilidad
              OUTPUT INSERTED.* WHERE id=@id`);
    if (!result.recordset[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM PRODUCTO WHERE id = @id');
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
