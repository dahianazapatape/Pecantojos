# Arquitectura — Módulo de Pedidos y Clientes (Pecantojos)

> Plantilla de trabajo. Se irá completando a lo largo de la Semana 13 con los diagramas C4,
> la tabla de componentes y los ADR formales. Las secciones marcadas como "confirmado contra
> el código" ya reflejan una revisión real del repositorio actual, no solo los documentos de
> semanas anteriores.

## 1. Arquitectura actual 

**Backend:** Node.js + Express (`express`, `cors`, `express.Router()` por recurso).
**Base de datos:** SQL Server, base `PECANTOJOS`, mediante el paquete `mssql`.
**Frontend:** HTML, CSS y JavaScript sin framework, consumiendo la API con `fetch`.

El servidor (`server.js`) ya registra rutas separadas por recurso (`routes/clientes.js`,
`routes/pedidos.js`, `routes/productos.js`, `routes/otros.js`, `routes/reportes.js`,
`routes/auth.js`). Sin embargo, dentro de cada archivo de ruta, el manejador de cada endpoint
mezcla tres responsabilidades a la vez: validación de entrada, lógica de negocio y
construcción/ejecución directa de la consulta SQL contra el pool de conexión. No existe una
capa de servicios ni de repositorios independiente.

La conexión a la base de datos (`db.js`) usa autenticación de SQL Server con usuario y
contraseña escritos directamente en el código fuente (no autenticación de Windows, y no lee
las variables del archivo `.env`, que existe pero no se usa).

## 2. Problemas identificados (actualizado contra el código real)

Esta tabla reemplaza/actualiza la lista de la Semana 3 con lo confirmado en el código:

| # | Problema | Evidencia en el código |
|---|----------|------------------------|
| 1 | Ausencia de capas de servicio y repositorio | Cada archivo en `routes/` mezcla validación, reglas de negocio y SQL directo (ej. `routes/pedidos.js`, `routes/clientes.js`) |
| 2 | Configuración de conexión no externalizada | `db.js` tiene usuario y contraseña de SQL Server escritos en texto plano; el archivo `.env` existe pero no se usa |
| 3 | Ausencia de control transaccional en operaciones críticas | `POST /api/pedidos/:id/detalle` ejecuta 3 operaciones independientes (insertar detalle, actualizar inventario, recalcular total) sin transacción |
| 4 | Eliminación física en cascada sin historial | `DELETE /api/pedidos/:id` y `DELETE /api/clientes/:id` borran físicamente registros relacionados (pagos, detalles, pedidos) en un bucle, sin transacción ni borrado lógico |
| 5 | **(nuevo, no documentado antes)** Construcción de SQL por concatenación de texto en filtros | `routes/clientes.js`, `routes/pedidos.js` y `routes/reportes.js` concatenan directamente valores de `req.query` dentro del texto SQL (ej. `` `ciudad LIKE '%${ciudad}%'` ``), lo cual es una vulnerabilidad de inyección SQL |

**Decisión sobre el Problema 5:** se incorpora como **ADR-004**, adicional a los tres atributos
priorizados en la Semana 4/8 (mantenibilidad, portabilidad, confiabilidad), bajo el atributo
**Seguridad**. No reemplaza ni modifica la priorización ya entregada: es un hallazgo encontrado
durante la revisión del código real en la Semana 13. Al ser una corrección de bajo costo y alto
impacto, se prioriza para implementarse junto con el ADR-001

## 3. Requisitos no funcionales (RNF)

| RNF | Atributo relacionado | Descripción | Criterio de aceptación |
|-----|----------------------|--------------|-------------------------|
| RNF-01 | Mantenibilidad | Un cambio de regla de negocio no debe requerir tocar el enrutamiento ni las consultas SQL de otros módulos | El cambio se implementa modificando un único módulo de lógica de negocio (`services/`), en menos de 2 horas, sin generar regresiones en las demás rutas del sistema |
| RNF-02 | Portabilidad | El sistema debe poder desplegarse en un entorno distinto al de desarrollo sin modificar código fuente | La puesta en marcha en un nuevo entorno se logra editando únicamente un archivo o variable de configuración (`.env`), en menos de 30 minutos, sin tocar código fuente |
| RNF-03 | Confiabilidad | Las operaciones que afectan pedidos e inventario deben ser atómicas (todo o nada) | Ante una falla simulada durante el registro de un pedido, se registran 0 casos de inconsistencia entre pedidos e inventario; toda operación incompleta se revierte automáticamente (rollback) en menos de 3 segundos |
| RNF-04 | Seguridad | Las consultas SQL que reciben datos de entrada del usuario deben estar parametrizadas, sin concatenar texto directamente | El 100% de los endpoints con filtros de búsqueda usa consultas parametrizadas; una prueba con cadenas de prueba típicas de inyección SQL (ej. `' OR '1'='1`) no altera el comportamiento ni expone datos adicionales |

## 4. Estilo arquitectónico

- **Estilo propuesto:** arquitectura en capas dentro de un monolito modular — `routes → controllers → services → repositories`, con `config/` y `middleware/`como paquetes transversales.

- **Justificación:** se elige un monolito modular en capas, y no una arquitectura distribuida
  (microservicios), por cuatro razones concretas del contexto del proyecto:
  1. **Tamaño y equipo:** Pecantojos es un negocio pequeño con una base de datos única
     (SQL Server / `PECANTOJOS`) y un equipo de 5 personas trabajando en un curso con tiempo
     limitado; no hay necesidad real de escalar componentes de forma independiente.
  2. **Refactorización incremental (*strangler pattern*):** el código ya está separado por
     recurso en `routes/` (clientes, pedidos, productos, etc.), lo que permite migrar un
     archivo de ruta a la vez hacia la nueva estructura en capas sin detener el sistema ni
     reescribirlo por completo, algo mucho más costoso con microservicios.
  3. **Relación directa con los problemas identificados:** los 5 problemas de la sección 2 son
     de organización interna del código (capas, configuración, transacciones, SQL parametrizado),
     no de escalabilidad o despliegue distribuido — un estilo en capas los resuelve directamente,
     sin añadir complejidad que no resuelve ningún problema real detectado.
  4. **Costo operativo:** microservicios exigirían contenedores, orquestación y comunicación entre
     servicios (red, resiliencia, *service discovery*), infraestructura que el negocio no tiene y
     que no se justifica para el volumen de pedidos actual.

- **Alternativas consideradas:**
  - **Microservicios:** descartada por el costo operativo y de despliegue descrito arriba, y
    porque no resuelve ninguno de los problemas identificados en el código actual.
  - **Arquitectura hexagonal (puertos y adaptadores):** se considera una evolución futura una
    vez que la separación en capas esté estable, especialmente si se requiere soportar más de
    un motor de persistencia o más canales de entrada (hoy solo HTTP). No se adopta en esta
    entrega por el tiempo disponible y porque la arquitectura en capas ya resuelve los 5
    problemas identificados.
  - **Mantener el estado actual** (lógica dentro de `routes/`): descartada por ser,
    precisamente, la causa raíz de los problemas 1 a 5.

## 5. Componentes y responsabilidades


| Componente | Responsabilidad | Dependencias | Archivo/paquete actual |
|------------|------------------|---------------|--------------------------|
| `routes/` | Definir endpoints HTTP y delegar al controlador correspondiente | `controllers/` | Clientes: `src/routes/clienteRoutes.js` (ADR-001, implementado). Resto: `routes/*.js` (todavía llama directo a `db.js`) |
| `controllers/` | Adaptar petición/respuesta HTTP, invocar servicios | `services/` | Clientes: `src/controllers/clienteController.js` (ADR-001, implementado). Resto: *(no existe aún; lógica mezclada dentro de `routes/*.js`)* |
| `services/` | Reglas de negocio y orquestación de transacciones | `repositories/` | Clientes: `src/services/clienteService.js` (ADR-001, implementado). Resto: *(no existe aún; lógica mezclada dentro de `routes/*.js`)* |
| `repositories/` | Único punto de acceso a SQL | `config/` (conexión) | Clientes: `src/repositories/clienteRepository.js` (ADR-001, implementado). Resto: *(no existe aún; consultas SQL dentro de `routes/*.js`)* |
| `config/` | Configuración externalizada de conexión a BD | — | `db.js` (hoy con credenciales hardcodeadas; pendiente ADR-002) |
| `middleware/` | Validación de entrada, manejo de errores, autenticación | — | *(no existe aún; validación mínima dentro de cada ruta)* |
| `models/` | Entidades del dominio (Pedido, DetallePedido, Cliente, Producto) | — | *(no existe aún; los `recordset` de `mssql` se usan directamente)* |

## 6. Decisiones técnicas

| ADR | Decisión | Atributo que mejora | Estado |
|-----|----------|----------------------|--------|
| ADR-001 | Separar la lógica de `routes/` en capas (`controllers/ → services/ → repositories/`) | Mantenibilidad | **Iniciada** (módulo Clientes en `src/`) |
| ADR-002 | Externalizar la configuración de conexión a base de datos (`config/` + variables de entorno) | Portabilidad | Propuesta |
| ADR-003 | Introducir control transaccional en operaciones críticas (registrar pedido, eliminar en cascada) | Confiabilidad | Propuesta |
| ADR-004 | Parametrizar las consultas SQL en los filtros de búsqueda, eliminando la concatenación de texto | Seguridad *(hallazgo adicional, Semana 13)* | Propuesta |

## 7. Diagramas

Diagramas C4 de la arquitectura **objetivo** (post-refactorización), en
[`docs/diagramas/`](diagramas/):

- [Nivel 1 — Contexto](diagramas/1_c4_contexto.png): el Encargado del negocio y el único
  sistema externo (SQL Server).
- [Nivel 2 — Contenedores](diagramas/2_c4_contenedores.png): Frontend Web, Backend API
  (Node.js + Express), los contenedores internos transversales `config/` y `middleware/`, y la
  base de datos.
- [Nivel 3 — Componentes](diagramas/3_c4_componentes.png): la estructura en capas interna del
  Backend API (`routes → controllers → services → repositories`), con cada componente marcado
  según el ADR que lo introduce o modifica.

Ver también [`docs/diagramas/README.md`](diagramas/README.md) para la guía de lectura completa.

## 8. Historial de esta plantilla

- 2026-10-21 — Creación de la plantilla, con hallazgos confirmados contra el código real del
  repositorio (ver sección 2, incluye corrección respecto a Semana 3 y un problema nuevo).
- 2026-10-21 — Se completan los RNF (sección 3), la justificación del estilo arquitectónico
  (sección 4) y la tabla de decisiones técnicas (sección 6). Se decide incorporar el hallazgo
  de inyección SQL como ADR-004 (Seguridad), adicional a los tres atributos priorizados en la
  Semana 4/8, sin reemplazarlos.
- 2026-10-21 — Se agregan los diagramas C4 (contexto, contenedores, componentes) de la
  arquitectura objetivo en `docs/diagramas/`, trazados contra los 4 ADR.
