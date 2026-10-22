const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ═══ CONTRASEÑAS (scrypt) ═══
// Formato guardado: scrypt$<sal>$<hash>  (≈76 caracteres, cabe en VARCHAR(100))
function hashPassword(password) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, sal, 32);
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`;
}

function esHash(guardado) {
  return typeof guardado === 'string' && guardado.startsWith('scrypt$');
}

function verificarPassword(password, guardado) {
  if (!esHash(guardado)) return false;
  const [, sal, hash] = guardado.split('$');
  const esperado = Buffer.from(hash, 'base64');
  const calculado = crypto.scryptSync(password, Buffer.from(sal, 'base64'), esperado.length);
  return crypto.timingSafeEqual(esperado, calculado);
}

// ═══ TOKENS DE SESIÓN (firmados con HMAC) ═══
// La clave se genera una sola vez y se guarda en .session-secret (no se sirve al navegador),
// así las sesiones siguen válidas aunque se reinicie el servidor.
const ARCHIVO_CLAVE = path.join(__dirname, '.session-secret');
function obtenerClave() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  try { return fs.readFileSync(ARCHIVO_CLAVE, 'utf8').trim(); }
  catch {
    const nueva = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(ARCHIVO_CLAVE, nueva);
    return nueva;
  }
}
const CLAVE = obtenerClave();
const DURACION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function firmar(datos) {
  return crypto.createHmac('sha256', CLAVE).update(datos).digest('base64url');
}

function crearToken(admin) {
  const datos = Buffer.from(JSON.stringify({ id: admin.id, usuario: admin.usuario, exp: Date.now() + DURACION_MS })).toString('base64url');
  return `${datos}.${firmar(datos)}`;
}

function leerToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [datos, firma] = token.split('.');
  const esperada = firmar(datos);
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  try {
    const sesion = JSON.parse(Buffer.from(datos, 'base64url').toString());
    return sesion.exp > Date.now() ? sesion : null;
  } catch { return null; }
}

// Middleware: exige "Authorization: Bearer <token>" válido
function requiereSesion(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  const sesion = tipo === 'Bearer' ? leerToken(token) : null;
  if (!sesion) return res.status(401).json({ error: 'Sesión no válida o expirada. Inicia sesión de nuevo.' });
  req.admin = sesion;
  next();
}

// ═══ LÍMITE DE INTENTOS DE LOGIN ═══
// 5 intentos fallidos por IP → bloqueo de 15 minutos
const intentos = new Map();
const MAX_INTENTOS = 5, BLOQUEO_MS = 15 * 60 * 1000;

function loginBloqueado(ip) {
  const r = intentos.get(ip);
  if (!r) return false;
  if (Date.now() - r.desde > BLOQUEO_MS) { intentos.delete(ip); return false; }
  return r.fallos >= MAX_INTENTOS;
}
function registrarFallo(ip) {
  const r = intentos.get(ip);
  if (!r || Date.now() - r.desde > BLOQUEO_MS) intentos.set(ip, { fallos: 1, desde: Date.now() });
  else r.fallos++;
}
function limpiarIntentos(ip) { intentos.delete(ip); }

module.exports = {
  hashPassword, esHash, verificarPassword,
  crearToken, requiereSesion,
  loginBloqueado, registrarFallo, limpiarIntentos,
};
