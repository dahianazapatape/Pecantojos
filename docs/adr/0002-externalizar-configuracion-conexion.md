# ADR-002: Externalizar la configuración de conexión a base de datos

**Estado:** Propuesta
**Atributo de calidad que mejora:** Portabilidad
**Responsable sugerido:** *(asignar a un integrante del equipo)*

## Contexto

El archivo `db.js` contiene la configuración de conexión a SQL Server escrita directamente en
el código fuente, incluyendo usuario y contraseña en texto plano:

```js
const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'PECANTOJOS',
  user: 'sa',
  password: 'Pecantojos123',
  ...
};
```

El proyecto ya tiene un archivo `.env` con `DB_SERVER`, `DB_NAME`, `DB_PORT` y `PORT`, y la
dependencia `dotenv` está declarada en `package.json`, pero `db.js` no las usa: ni siquiera
hace `require('dotenv').config()`. Esto fue identificado como el Problema 2 en la Semana 3 y
confirmado contra el código real en la Semana 13.

**Impacto del problema:** el sistema solo funciona tal como está configurado en el equipo
donde se desarrolló (misma instancia `localhost\SQLEXPRESS`, mismo usuario `sa`, misma
contraseña). Llevarlo a otro computador, a un servidor del negocio, o a un entorno en la nube,
exige editar manualmente el código fuente — no solo un archivo de configuración. Además, tener
credenciales en texto plano en el código es un riesgo si el repositorio se comparte o se sube a
un control de versiones público.

## Decisión

Crear un módulo `config/` dentro de `src/`, con una función `obtenerConexion()` (o
equivalente) que lea los parámetros de conexión únicamente desde variables de entorno
(`process.env`, cargadas con `dotenv`), sin ningún valor de conexión hardcodeado en el código.

```js
// src/config/dbConfig.js (boceto)
require('dotenv').config();

module.exports = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
};
```

El archivo `.env` (ya existente, ya ignorado por `.gitignore`) se completa con `DB_USER` y
`DB_PASSWORD`. Se agrega un `.env.example` sin valores reales, para que cualquier integrante
del equipo (o un entorno nuevo) sepa qué variables debe definir.

## Código afectado

- `db.js` se reemplaza por `src/config/dbConfig.js` (o se adapta en el mismo lugar como primer
  paso, antes de mover el resto a `src/`).
- Se agrega `.env.example` en la raíz del proyecto.
- `README.md`, sección "Instrucciones de ejecución", se actualiza para reflejar que ya no hay
  que editar código para cambiar la conexión.

## Consecuencias

**Positivas:**
- El sistema se puede desplegar en cualquier equipo o entorno cambiando solo el archivo `.env`,
  sin tocar código fuente.
- Elimina credenciales en texto plano del código versionado.
- Facilita que cada integrante del equipo use su propia instancia local de SQL Server sin pisar
  la configuración de los demás.

**Negativas / costos:**
- Cada integrante debe configurar su propio `.env` localmente (ya mitigado con `.env.example`
  como guía).
- Si alguien olvida definir una variable, el sistema debe fallar con un mensaje claro en vez de
  conectarse con valores por defecto silenciosos (se recomienda validar las variables requeridas
  al iniciar el servidor).

## Alternativas consideradas

- **Autenticación de Windows en vez de usuario/contraseña de SQL Server:** no se adopta porque
  depende de que la máquina esté unida a un dominio o tenga el mismo usuario de Windows, lo cual
  reduce aún más la portabilidad entre equipos distintos del negocio.
- **Un archivo de configuración JSON en vez de variables de entorno:** descartado porque es más
  fácil de subir por error al control de versiones que un `.env` ya cubierto por `.gitignore`, y
  porque variables de entorno es el estándar para este tipo de configuración en Node.js.

## Cómo se mide el cumplimiento (RNF-02, ver `docs/arquitectura.md`)

La puesta en marcha del sistema en un entorno nuevo se logra editando únicamente el archivo
`.env`, en menos de 30 minutos, sin modificar código fuente.
