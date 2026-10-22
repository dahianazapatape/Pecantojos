# 🍪 Pecantojos — Módulo de Pedidos y Clientes

## Descripción

Pecantojos es el sistema de gestión para un emprendimiento de galletas y postres, que
reemplaza el control manual de clientes, productos, pedidos e inventario. Este repositorio
contiene el proceso de **re-arquitectura** del módulo de **Pedidos y Clientes**, el módulo
MVP seleccionado para el curso, partiendo de la aplicación full-stack ya construida
(Node.js/Express + SQL Server + HTML/CSS/JS) hacia una arquitectura organizada por capas.

## Integrantes

- Dahiana Zapata
- Jhonatan Quintero
- Anggie Rivera
- Sofía Carvajal
- Valentina Marín 

## Tecnologías

**Backend (actual, antes de refactorizar):**
- Node.js + [Express](https://expressjs.com/) (`express`, `cors`, enrutamiento con `express.Router()`)
- SQL Server, mediante el paquete [`mssql`](https://www.npmjs.com/package/mssql) (driver `tedious`)
- `dotenv` disponible en `package.json`, aunque la conexión actual (`db.js`) todavía no lee las
  variables de `.env` — ver "Estado actual"

**Frontend (actual):**
- HTML, CSS y JavaScript sin frameworks, consumiendo la API con `fetch`

**Base de datos:**
- SQL Server, base de datos `PECANTOJOS`

> Nota de corrección: documentación previa del curso (Semana 3) describía el backend como
> Node.js con el módulo `http` nativo, sin framework. Al revisar el código fuente real se
> confirmó que el proyecto usa **Express**. Esta sección refleja el stack real.

## Instrucciones de ejecución

1. Clonar el repositorio.
2. Instalar dependencias del backend:
   ```bash
   npm install
   ```
3. Configurar la base de datos:
   - Crear un archivo `.env` en la raíz (no se versiona, ver `.gitignore`) con, al menos:
     ```
     DB_SERVER=localhost
     DB_NAME=PECANTOJOS
     DB_USER=...
     DB_PASSWORD=...
     DB_PORT=1433
     PORT=3000
     ```
   - (Pendiente como parte de la refactorización: que la conexión a la base de datos lea
     estas variables en lugar de tener usuario y contraseña escritos directamente en el código.)
4. Iniciar el servidor:
   ```bash
   npm start
   ```
5. Abrir el frontend (`index.html`) en el navegador, o servirlo según se defina en la
   refactorización.

## Estructura de carpetas

```
pecantojos/
├── src/                        ← Código fuente en proceso de refactorización (capas)
│   ├── routes/
│   │   └── clienteRoutes.js        ← ADR-001, implementado (reemplaza a routes/clientes.js)
│   ├── controllers/
│   │   └── clienteController.js    ← ADR-001, implementado
│   ├── services/
│   │   └── clienteService.js       ← ADR-001, implementado (incluye TODO de ADR-003)
│   ├── repositories/
│   │   └── clienteRepository.js    ← ADR-001, implementado (incluye TODO de ADR-004)
│   ├── utils/
│   │   └── httpError.js            ← error HTTP compartido entre controller/service
│   ├── middleware/                 ← pendiente (ADR futuro)
│   └── config/                     ← pendiente (ADR-002)
├── docs/
│   ├── arquitectura.md   ← Arquitectura objetivo, RNF, estilo, componentes, decisiones técnicas
│   ├── diagramas/        ← Diagramas C4 (contexto, contenedores, componentes) y de despliegue
│   └── adr/               ← Registro de decisiones de arquitectura (Architecture Decision Records)
├── tests/                ← Pruebas automatizadas
├── resources/            ← Recursos de apoyo (scripts SQL, datos de ejemplo, assets)
├── README.md
├── CHANGELOG.md
└── .gitignore
```

**Código heredado (previo a la refactorización, aún no movido a `src/`):**

```
server.js            ← Punto de entrada Express actual
db.js                ← Conexión a SQL Server (credenciales hardcodeadas — ver docs/arquitectura.md)
routes/
├── auth.js
├── clientes.js       ← ya reemplazado por src/routes/clienteRoutes.js (falta conectar en server.js)
├── pedidos.js
├── productos.js
├── otros.js          ← categorías, promociones, proveedores, insumos, inventario, pagos, compras
└── reportes.js
index.html            ← Frontend
```

> `src/repositories/clienteRepository.js` reutiliza la conexión de `db.js` en la raíz del
> proyecto (`require('../../db')`), así que para probar el módulo de Clientes en capas hace
> falta que `db.js` exista en esa misma ubicación, como en el proyecto real.

## Arquitectura

Ver [`docs/arquitectura.md`](docs/arquitectura.md) para la descripción completa: arquitectura
objetivo, requisitos no funcionales, estilo arquitectónico, componentes y decisiones técnicas.

Diagramas C4 (contexto, contenedores, componentes): [`docs/diagramas/`](docs/diagramas/).

Decisiones de refactorización documentadas como ADR: [`docs/adr/`](docs/adr/).

## Estado actual

- [x] Semana 3: módulo MVP seleccionado (Pedidos y Clientes), problemas arquitectónicos
  identificados y justificación de viabilidad.
- [x] Semana 4/8: atributos de calidad priorizados (mantenibilidad, portabilidad,
  confiabilidad) con un escenario de calidad por atributo.
- [x] Semana 8: diagramas de casos de uso, flujo, paquetes y clases de la arquitectura
  propuesta.
- [x] Semana 13 (en curso): estructura inicial del repositorio creada (`src/`, `docs/`,
  `tests/`, `resources/`). Sin dependencias instaladas ni funcionalidades movidas todavía.
- [x] 4 ADR redactados en `docs/adr/`: ADR-001 (mantenibilidad), ADR-002 (portabilidad),
  ADR-003 (confiabilidad), ADR-004 (seguridad — hallazgo de inyección SQL). Cada uno documenta
  problema, decisión, código afectado y consecuencias. Pendiente: asignar responsable por
  decisión y commitear cada uno por separado (ver abajo).
- [x] Tabla de componentes y responsabilidades en `docs/arquitectura.md` (completada; falta
  enlazar cada fila con su ADR correspondiente una vez implementados).
- [x] Diagramas C4 (contexto, contenedores, componentes) de la arquitectura objetivo en
  `docs/diagramas/`, trazados contra los 4 ADR.
- [x] ADR-001 iniciado en código real: módulo de **Clientes** migrado a capas en `src/`
  (`routes/`, `controllers/`, `services/`, `repositories/`). Pedidos y los demás recursos
  siguen pendientes, y `server.js` todavía no se cambió para usar las rutas nuevas (ver
  `docs/adr/0001-separar-en-capas.md`, sección "Avance de implementación").

## Reparto de trabajo y commits

| Decisión | Atributo | Archivos principales | Integrante sugerido |
|----------|----------|------------------------|----------------------|
| ADR-001 — Separar en capas | Mantenibilidad | `src/controllers/`, `src/services/`, `src/repositories/` | *(Anggie — módulo Clientes ya iniciado; falta Pedidos y conectar `server.js`)* |
| ADR-002 — Externalizar configuración | Portabilidad | `src/config/`, `.env.example` | *(Jhonatan)* |
| ADR-003 — Control transaccional | Confiabilidad | `src/services/*Service.js` (transacciones) | *(Dahiana)* |
| ADR-004 — Parametrizar consultas | Seguridad | `routes/clientes.js`, `routes/pedidos.js`, `routes/reportes.js` | *(Valentina)* |

## Trabajo futuro

- Mover la lógica de `routes/` hacia una estructura en capas (`routes/ → controllers/ →
  services/ → repositories/`) dentro de `src/`, empezando por el módulo de Pedidos y Clientes.
- Externalizar la configuración de conexión a base de datos (usar `.env` realmente, eliminar
  credenciales escritas en el código).
- Introducir control transaccional (`BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`) en las
  operaciones que hoy ejecutan varios pasos sin agrupar: registrar pedido (insertar pedido +
  detalle + descontar inventario) y las eliminaciones en cascada.
- Corregir la construcción de consultas SQL por concatenación de texto en los filtros de
  búsqueda (`clientes.js`, `pedidos.js`, `reportes.js`), reemplazándola por parámetros
  (ADR-004, ver `docs/adr/`).
- Cambiar la eliminación física de pedidos y clientes por borrado lógico con historial.
- Agregar pruebas automatizadas en `tests/` para los endpoints del módulo MVP.
