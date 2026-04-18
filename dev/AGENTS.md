# AGENTS.md
# Suite Financiera Inversión — Mapa de Agentes
**Versión 1.0 — Abril 2026**

---

## Resumen del equipo

| Agente | Hilo en Perplexity | Dominio | Estado |
|--------|--------------------|---------|--------|
| Agent-Modelo | `hilo: modelo-financiero` | Motor de cálculo unificado | Activo |
| Agent-Gastro | `hilo: vertical-gastro` | Vertical gastronómica | Activo |
| Agent-Inmobiliario | `hilo: vertical-inmobiliario` | Vertical inmobiliaria | Activo |
| Agent-Cliente | `hilo: capa-cliente` | Presentaciones y mini apps | Activo |
| Agent-Repo | `hilo: repo-estructura` | Repositorio y Constitución | On-demand |

---

## Agent-Modelo

**Responsabilidad única:** Motor de cálculo financiero compartido por todas las verticales.

**Lo que hace:**
- Mantiene y evoluciona las funciones `calcularTIR()`, `calcularVAN()`, `getDividendoMensual()` y sus equivalentes por patrón de ingreso
- Implementa nuevos patrones: `arriendo-mensual`, `venta-activo`, `hibrido`
- Garantiza consistencia matemática entre verticales
- Define el contrato de exportación hacia capa cliente (qué métricas expone cada patrón)

**Archivos que puede tocar:**
- Sección `CÁLCULOS MATEMÁTICOS` y `FUNCIÓN CLAVE` en `calculadora-inversion v1.0.html`
- Sección equivalente en `inmobiliario/calculadora-inversion-inmob.html` (a crear)
- `dev/agent-updates/agent-modelo.md`

**No toca:** CSS, HTML estructural, capa cliente, archivos de otras verticales.

**Coordina con:** Agent-Gastro y Agent-Inmobiliario para validar que los patrones de ingreso alimenten correctamente el motor.

---

## Agent-Gastro

**Responsabilidad única:** Vertical gastronómica completa — UX interna y lógica de ingresos.

**Lo que hace:**
- Mantiene y evoluciona `calculadora-ingresos-m2 v1.0.html`
- Mantiene la UI/UX de inputs en `calculadora-inversion v1.0.html`
- Garantiza el flujo `Ingresos m²` → `Inversión` vía localStorage
- Propone mejoras a la experiencia interna del equipo para la vertical gastro

**Archivos que puede tocar:**
- `calculadora-ingresos-m2 v1.0.html` (completo)
- Sección inputs/UI/HTML de `calculadora-inversion v1.0.html`
- `dev/agent-updates/agent-gastro.md`

**No toca:** Motor de cálculo JS, capa cliente, vertical inmobiliaria.

**Coordina con:** Agent-Modelo cuando necesite cambios en la lógica de cálculo.

---

## Agent-Inmobiliario

**Responsabilidad única:** Vertical inmobiliaria — sensibilización, remodelación e inversión.

**Lo que hace:**
- Construye y mantiene `inmobiliario/sensibilizador-propiedades.html`
- Construye y mantiene `inmobiliario/calculadora-remodelacion.html`
- Construye y mantiene `inmobiliario/calculadora-inversion-inmob.html`
- Trabaja en UF como unidad nativa; CLP como display secundario
- Implementa variables específicas: precio UF/m², estado propiedad, crédito hipotecario, costo obras

**Archivos que puede tocar:**
- Todo dentro de `/inmobiliario/`
- `dev/agent-updates/agent-inmobiliario.md`

**No toca:** Motor de cálculo core, vertical gastro, capa cliente.

**Coordina con:** Agent-Modelo para integrar patrones `arriendo-mensual`, `venta-activo` e `hibrido`.

---

## Agent-Cliente

**Responsabilidad única:** Capa pública — mini apps y presentaciones personalizadas por proyecto.

**Lo que hace:**
- Crea la mini app de cada proyecto en `/cliente/[nombre-proyecto]/`
- Adapta el contrato de exportación del motor a una vista limpia para el cliente
- Integra imagen y nombre del proyecto
- Garantiza que la presentación sea personalizable sin tocar el motor

**Archivos que puede tocar:**
- Todo dentro de `/cliente/`
- `dev/agent-updates/agent-cliente.md`

**No toca:** Motor de cálculo, herramientas internas, ningún archivo fuera de `/cliente/`.

**Coordina con:** Agent-Modelo para recibir el contrato de exportación del proyecto específico.

---

## Agent-Repo

**Activación:** On-demand por el humano. No opera en forma continua.

**Responsabilidad única:** Orden, consistencia y evolución del repositorio y la Constitución.

**Lo que hace:**
- Reorganiza estructura de carpetas cuando es necesario
- Procesa propuestas `[PROPUESTA CONSTITUCIÓN]` acumuladas en agent-updates
- Actualiza `CONSTITUTION.md` y `AGENTS.md` con cambios aprobados
- Crea estructura para nuevas verticales o herramientas
- Audita consistencia cuando dos agentes han trabajado en paralelo

**Archivos que puede tocar:**
- `dev/CONSTITUTION.md`
- `dev/AGENTS.md`
- `dev/agent-updates/agent-repo.md`
- Estructura de carpetas del repositorio (con aprobación humana)

**Cuándo activarlo:**
- Nueva vertical o herramienta no contemplada en la Constitución
- Propuestas acumuladas listas para aprobar
- Reorganización de estructura
- Release de herramienta interna hacia capa cliente
- Auditoría de consistencia post trabajo paralelo

---

## Flujo de trabajo estándar

```
1. Humano abre hilo con el agente correspondiente
2. Agente lee su archivo dev/agent-updates/[nombre].md
3. Agente lee updates de agentes relacionados si hay dependencias
4. Agente trabaja dentro de su dominio
5. Agente escribe update al terminar en dev/agent-updates/[nombre].md
6. Si generó algo que otro agente necesita → lo indica en "Dejé listo para"
7. Si necesita algo de otro agente → lo indica en "Necesito de [Agente-X]"
8. Humano coordina el handoff entre agentes cuando corresponde
```
