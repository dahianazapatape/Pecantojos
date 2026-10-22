# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto sigue un versionado informal mientras dura el curso de Re-Arquitectura
(no usa [Versionado Semántico](https://semver.org/lang/es/) estricto todavía).

## [Sin publicar]

### Agregado
- Estructura inicial del proyecto para el proceso de refactorización: `src/`, `docs/diagramas/`,
  `docs/adr/`, `tests/`, `resources/`.
- Plantilla de `README.md` con descripción, integrantes, stack, instrucciones de ejecución,
  estructura de carpetas, arquitectura, estado actual y trabajo futuro.
- Plantilla de `docs/arquitectura.md` para documentar arquitectura objetivo, requisitos no
  funcionales, estilo arquitectónico, componentes y decisiones técnicas.
- `.gitignore` ajustado al stack real del proyecto (Node.js, Express, `mssql`, `.env`).
- `docs/arquitectura.md` completo: requisitos no funcionales, estilo arquitectónico con
  justificación y alternativas descartadas, tabla de componentes y tabla de decisiones técnicas.
- 4 ADR en `docs/adr/`, cada uno con contexto, decisión, código afectado, consecuencias y
  alternativas consideradas:
  - `0001-separar-en-capas.md` (Mantenibilidad)
  - `0002-externalizar-configuracion-conexion.md` (Portabilidad)
  - `0003-control-transaccional.md` (Confiabilidad)
  - `0004-parametrizar-consultas-filtros.md` (Seguridad — hallazgo adicional de la Semana 13,
    no reemplaza los 3 atributos priorizados en Semana 4/8)
- Diagramas C4 (contexto, contenedores, componentes) de la arquitectura objetivo en
  `docs/diagramas/`, con los componentes marcados según el ADR que los introduce o modifica, y
  un `docs/diagramas/README.md` como guía de lectura.
- ADR-001 iniciado en código real: módulo de **Clientes** migrado a capas en `src/`
  (`routes/clienteRoutes.js`, `controllers/clienteController.js`, `services/clienteService.js`,
  `repositories/clienteRepository.js`, más `utils/httpError.js`). Mismas rutas y comportamiento
  que `routes/clientes.js`; incluye notas `TODO` marcando dónde entran ADR-003 (transacciones) y
  ADR-004 (parametrizar filtros), para no mezclar esas decisiones en este cambio.

### Pendiente
- Conectar `src/routes/clienteRoutes.js` en `server.js` (reemplazando a `routes/clientes.js`) y
  validar contra la base de datos real.
- Migrar el recurso de Pedidos siguiendo el mismo patrón (ADR-001).
- Implementar ADR-002, ADR-003 y ADR-004 como código real, cada uno a cargo de un integrante
  distinto del equipo y commiteado por separado.

## [Entregas previas del curso] — Semanas 3, 4 y 8

Estas entregas se realizaron como documentos PDF independientes, antes de iniciar el
versionamiento del código en este repositorio:

- **Semana 3** — Selección del módulo MVP (Pedidos y Clientes) para la re-arquitectura:
  información del módulo, diagrama informal de la arquitectura actual, problemas
  arquitectónicos identificados y justificación de viabilidad.
- **Semana 4 / 8** — Definición de 3 atributos de calidad priorizados (mantenibilidad,
  portabilidad, confiabilidad) y un escenario de calidad por atributo.
- **Semana 8 (diagramas)** — Casos de uso, diagrama de flujo, diagrama de paquetes y diagrama
  de clases de la arquitectura propuesta.

> Nota: al revisar el código fuente real del proyecto para esta entrega, se identificaron
> diferencias con lo documentado en Semana 3 (el backend sí usa Express, no el módulo `http`
> nativo) y un problema adicional no documentado antes (inyección SQL por concatenación de
> texto en los filtros de búsqueda). Ambos quedan registrados en `docs/arquitectura.md`.
