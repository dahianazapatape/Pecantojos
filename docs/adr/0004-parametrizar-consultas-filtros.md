# ADR-004: Parametrizar las consultas SQL en los filtros de búsqueda

**Estado:** Propuesta
**Atributo de calidad que mejora:** Seguridad *(hallazgo adicional, Semana 13 — no reemplaza
los 3 atributos priorizados en Semana 4/8; ver nota en `docs/arquitectura.md`, sección 2)*
**Responsable sugerido:** *(asignar a un integrante del equipo)*

## Contexto

Al revisar el código real del proyecto durante la Semana 13 (no documentado en Semana 3), se
encontró que varios endpoints construyen la cláusula `WHERE` de sus consultas concatenando
directamente el texto recibido en `req.query`, sin parametrizar:

```js
// routes/clientes.js
if (ciudad) where.push(`ciudad LIKE '%${ciudad}%'`);

// routes/pedidos.js
if (cliente) where.push(`c.nombre_cliente LIKE '%${cliente}%'`);

// routes/reportes.js (patrón similar en varias consultas)
```

Esto es una vulnerabilidad de **inyección SQL**: un valor malicioso en el parámetro de consulta
(por ejemplo, `ciudad=' OR '1'='1`) puede alterar el comportamiento de la consulta, exponer
datos que no deberían ser visibles, o en el peor caso, modificar o eliminar datos.

**Impacto del problema:** cualquier persona con acceso a la API (hoy sin autenticación
obligatoria en la mayoría de los endpoints) podría explotar estos filtros para leer o alterar
información de clientes, pedidos o productos que no le corresponde.

## Decisión

Reemplazar toda concatenación de texto de usuario dentro de una consulta SQL por parámetros,
usando la misma API de `mssql` que ya se usa correctamente en el resto del proyecto
(`pool.request().input(...)`):

```js
// Antes (vulnerable)
if (ciudad) where.push(`ciudad LIKE '%${ciudad}%'`);
// ...
const result = await pool.request().query(`SELECT * FROM CLIENTE ${whereClause}`);

// Después (parametrizado)
const request = pool.request();
let where = [];
if (ciudad) { where.push('ciudad LIKE @ciudad'); request.input('ciudad', sql.VarChar, `%${ciudad}%`); }
const result = await request.query(`SELECT * FROM CLIENTE ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`);
```

Este patrón se aplica a todos los filtros dinámicos encontrados en `routes/clientes.js`,
`routes/pedidos.js` y `routes/reportes.js`.

## Código afectado

- `routes/clientes.js` — filtros por `ciudad`, `nombre`, `correo` (endpoint `GET /`).
- `routes/pedidos.js` — filtros por `estado`, `cliente`, `fecha_inicio`, `fecha_fin` (endpoint `GET /`).
- `routes/reportes.js` — filtros dinámicos en los distintos reportes (revisar cada consulta con
  `WHERE` construido por concatenación).

Dado que el ADR-001 mueve esta misma lógica hacia `repositories/`, se recomienda aplicar esta
corrección **al mismo tiempo** que esa migración, para no parametrizar código que se va a mover
de todas formas poco después.

## Consecuencias

**Positivas:**
- Cierra una vulnerabilidad real y explotable sin necesidad de herramientas adicionales (usa la
  misma librería `mssql` ya presente en el proyecto).
- Es consistente con el resto del código, que ya parametriza correctamente las consultas por
  `id` (ver `routes/clientes.js`, endpoint `GET /:id`).

**Negativas / costos:**
- Ninguno significativo: el cambio es local a cada endpoint afectado y no altera el
  comportamiento esperado de los filtros, solo la forma en que se construyen.

## Alternativas consideradas

- **Sanitizar manualmente el texto de entrada (escapar comillas) en vez de parametrizar:**
  descartada por ser un enfoque propenso a errores y menos confiable que usar parámetros nativos
  del driver, que es la práctica estándar recomendada.
- **No corregirlo en esta entrega y dejarlo solo documentado como hallazgo:** descartada porque
  el costo de la corrección es bajo y el riesgo que mitiga es alto; se prioriza junto con el
  ADR-001 por tocar los mismos archivos.

## Cómo se mide el cumplimiento (RNF-04, ver `docs/arquitectura.md`)

El 100% de los endpoints con filtros de búsqueda usa consultas parametrizadas; una prueba con
cadenas de prueba típicas de inyección SQL (ej. `' OR '1'='1`) no altera el comportamiento ni
expone datos adicionales.
