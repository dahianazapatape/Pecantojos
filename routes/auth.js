const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');
const { hashPassword, esHash, verificarPassword, crearToken, requiereSesion,
        loginBloqueado, registrarFallo, limpiarIntentos } = require('../sesion');

// Tabla de admins (créala en SQL Server con el script de abajo)
// CREATE TABLE ADMINS (
//   id INT PRIMARY KEY IDENTITY(1,1),
//   usuario VARCHAR(50) UNIQUE NOT NULL,
//   password VARCHAR(100) NOT NULL,   -- se guarda cifrada (scrypt), nunca en texto plano
//   nombre VARCHAR(100)
// );
// Para crear el primer admin, inserta la contraseña en texto plano: el servidor la cifra al arrancar.

// Cifra las contraseñas que sigan en texto plano (se ejecuta al iniciar el servidor)
async function migrarPasswords() {
  const pool = await getPool();
  const { recordset } = await pool.request().query("SELECT id, password FROM ADMINS WHERE password NOT LIKE 'scrypt$%'");
  for (const a of recordset) {
    await pool.request()
      .input('id', sql.Int, a.id)
      .input('p', sql.VarChar, hashPassword(a.password))
      .query('UPDATE ADMINS SET password=@p WHERE id=@id');
  }
  if (recordset.length) console.log(`🔒 ${recordset.length} contraseña(s) de administrador cifradas`);
}

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  if (loginBloqueado(req.ip)) return res.status(429).json({ error: 'Demasiados intentos fallidos. Espera 15 minutos.' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('usuario', sql.VarChar, usuario)
      .query('SELECT id, usuario, nombre, password FROM ADMINS WHERE usuario=@usuario');
    const admin = result.recordset[0];
    // Compatibilidad: si aún está en texto plano, se compara y se cifra en el momento
    const valido = admin && (esHash(admin.password) ? verificarPassword(password, admin.password) : admin.password === password);
    if (!valido) {
      registrarFallo(req.ip);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    if (!esHash(admin.password)) {
      await pool.request().input('id', sql.Int, admin.id).input('p', sql.VarChar, hashPassword(password))
        .query('UPDATE ADMINS SET password=@p WHERE id=@id');
    }
    limpiarIntentos(req.ip);
    const datos = { id: admin.id, usuario: admin.usuario, nombre: admin.nombre };
    res.json({ ok: true, admin: datos, token: crearToken(datos) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admins', requiereSesion, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT id, usuario, nombre FROM ADMINS');
    res.json(result.recordset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admins', requiereSesion, async (req, res) => {
  const { usuario, password, nombre } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('u', sql.VarChar, usuario)
      .input('p', sql.VarChar, hashPassword(password))
      .input('n', sql.VarChar, nombre)
      .query('INSERT INTO ADMINS(usuario,password,nombre) OUTPUT INSERTED.id,INSERTED.usuario,INSERTED.nombre VALUES(@u,@p,@n)');
    res.status(201).json(result.recordset[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.migrarPasswords = migrarPasswords;
