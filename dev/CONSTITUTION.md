# CONSTITUTION.md
# Suite Financiera — Sistema Multi-Agente
**Versión 1.0 — Abril 2026**
**Estado:** Activa | **Aprobada por:** Humano (propietario del sistema)

---

## 1. Propósito del sistema

Esta suite es una **herramienta de trabajo interno** para evaluar y estructurar inversiones. Su función es que el equipo pueda generar evaluaciones complejas de forma rápida, con la experiencia del negocio incrustada, y convertirlas eficientemente en presentaciones personalizadas para clientes.

El sistema **no es un producto público.** Lo que el cliente ve son derivaciones simplificadas y personalizadas por proyecto, generadas desde aquí.

> **Principio rector:** Un solo motor de cálculo. Múltiples pieles.
> El backend financiero es idéntico para todas las verticales. Lo que cambia es el patrón de ingresos que lo alimenta y el skin que presenta los resultados al cliente.

---

## 2. Arquitectura de capas

El sistema opera en dos capas permanentes, independientes pero conectadas.

### Capa Interna — Suite (privada)
Herramienta de trabajo del equipo. Máxima complejidad, todos los parámetros, múltiples escenarios simultáneos. Vive en este repositorio. Los agentes trabajan aquí.

### Capa Cliente — Mini Apps / Presentaciones (pública)
Derivaciones simplificadas de modelos validados en la capa interna. El cliente ve su escenario específico, con imagen del proyecto e interfaz limpia. **Nunca modifica el motor interno.**

**Regla absoluta de capas:**
Todo lo público es una proyección de algo validado internamente. Un agente de la capa interna nunca modifica directamente código de la capa cliente. Lo que hace es completar su trabajo, marcar qué debe propagarse hacia afuera, y dejar el aviso en su archivo de updates. La adaptación para el cliente es un paso separado y deliberado.

---

## 3. Verticales del sistema

El sistema opera sobre dos verticales de inversión. Ambas comparten el mismo motor financiero.

### Vertical Gastronómica
Evaluación de inversión en restaurantes y locales de food & beverage. Los ingresos se modelan como **flujo operacional recurrente** (ventas mensuales por capacidad, ocupación y ticket promedio). Moneda nativa: **CLP**.

**Herramientas actuales (MVP funcional):**
- `calculadora-ingresos-m2.md` — Proyección de ingresos por m², mesas, servicios y curva de crecimiento a 5 años
- `calculadora-inversion.md` — Motor de inversión societaria v3.0: tiers, TIR, VAN, ROI, payback a 10 años

### Vertical Inmobiliaria
Evaluación de inversión en propiedades. Los ingresos se modelan según el patrón de salida: arriendo mensual, venta en X años, o híbrido. Moneda nativa de valorización: **UF** (con conversión a CLP para display). Incluye variables específicas como precio UF/m², estado de la propiedad, crédito hipotecario y costo de remodelación.

**Herramientas en desarrollo:**
- Sensibilizador de Propiedades — comparación de opciones: precio, m², UF/m², estado, atributos
- Calculadora de Remodelación — costo de obras, valor proyectado, delta y utilidad estimada
- Calculadora de Inversión Inmobiliaria — motor unificado adaptado a patrones arriendo/venta/híbrido

### Extensibilidad
El sistema está diseñado para ser suficientemente robusto como para evaluar cualquier tipo de inversión estructurada. Verticales adicionales (locales comerciales, otros activos) se incorporan como nuevos patrones de ingresos sobre el mismo motor, no como sistemas paralelos.

---

## 4. Motor unificado de inversión

El corazón compartido de todas las verticales. **Ningún agente lo fragmenta; todos lo alimentan.**

### Componentes del motor (implementados en `calculadora-inversion.md`)
- **Estructura societaria:** Sociedad Microinversionistas + Sociedad Controlador, porcentajes configurables
- **Tiers de inversión:** hasta 6 tiers dinámicos con cantidad de inversionistas, monto individual, mes de inversión, mes de inicio de retornos, tipo de holder y retención de impuestos
- **Métricas financieras:** TIR (Newton-Raphson, 100 iteraciones), VAN (tasa de descuento configurable), ROI anual neto, Payback real desde inversión
- **Tributación:** Impuesto 1ª Categoría nivel sociedad (25% Chile, editable), retención a nivel inversionista individual, manejo de IVA opcional
- **Visualización:** Proyección VAN acumulado a 10 años por tier y controlador (Chart.js 4.4)
- **Exportación:** PDF vía html2pdf.js

### Patrones de ingresos soportados
El motor recibe un flujo de caja mensual. La fuente de ese flujo cambia según la vertical:

| Patrón | Vertical | Descripción |
|--------|----------|-------------|
| `dividendos-recurrentes` | Gastronómica | Ingresos operacionales mensuales × margen × % a distribuir |
| `arriendo-mensual` | Inmobiliaria | Arriendo neto mensual proyectado a X años |
| `venta-activo` | Inmobiliaria | Flujo cero hasta año de venta, luego evento único de liquidación |
| `hibrido` | Inmobiliaria | Arriendo mensual durante N años + venta al final del período |

### Contrato de exportación hacia capa cliente
Cada herramienta interna tiene dos contratos:
1. **Contrato interno** — cálculo completo con todos los parámetros
2. **Contrato de exportación** — subset simplificado para presentación al cliente: métricas clave (TIR, ROI, payback, retiro mensual neto), imagen del proyecto, nombre y descripción personalizada

---

## 5. Estructura del repositorio

```
/
├── index.md                              ← Landing page Suite (renombrar a index.html)
├── calculadora-ingresos-m2.md            ← Gastro: proyección ingresos v1.2 (MVP ✓)
├── calculadora-inversion.md             ← Motor inversión societaria v3.0 (MVP ✓)
│
├── dev/                                  ← Sistema multi-agente
│   ├── CONSTITUTION.md                   ← Este documento
│   ├── AGENTS.md                         ← Mapa detallado de agentes y prompts
│   └── agent-updates/                    ← Comunicación entre agentes
│       ├── agent-modelo.md
│       ├── agent-gastro.md
│       ├── agent-inmobiliario.md
│       ├── agent-cliente.md
│       └── agent-repo.md
│
├── inmobiliario/                         ← [A crear] Vertical inmobiliaria
│   ├── sensibilizador-propiedades.html
│   ├── calculadora-remodelacion.html
│   └── calculadora-inversion-inmob.html
│
└── cliente/                              ← [A crear] Capa pública por proyecto
    └── [nombre-proyecto]/
        ├── index.html                    ← Mini app personalizada
        └── assets/                       ← Imagen y recursos del proyecto
```

---

## 6. Mapa de agentes

Cada agente tiene un hilo propio en Perplexity, dentro de este Space. Lee su archivo de updates y el de los agentes relacionados antes de comenzar cualquier trabajo.

| Agente | Responsabilidad única | Archivos que puede modificar |
|--------|----------------------|------------------------------|
| **Agent-Modelo** | Motor de cálculo financiero: lógica de TIR, VAN, ROI, payback, patrones de ingresos, tributación | Sección JS del motor en `calculadora-inversion.md` y su equivalente inmobiliario |
| **Agent-Gastro** | Vertical gastronómica: calculadoras de ingresos m², flujo operacional, UX interna gastro | `calculadora-ingresos-m2.md`, sección inputs/UI de `calculadora-inversion.md` |
| **Agent-Inmobiliario** | Vertical inmobiliaria: sensibilizador, remodelación, adaptación del motor a patrones UF/arriendo/venta | Todo dentro de `/inmobiliario/` |
| **Agent-Cliente** | Capa pública: mini apps y presentaciones personalizadas por proyecto, con imagen e identidad | Todo dentro de `/cliente/` |
| **Agent-Repo** | Repositorio, Constitución, documentación, estructura de carpetas, consistencia general | `dev/`, `index.md`, coordinación de estructura — activado por el humano cuando corresponde |

---

## 7. Protocolo de comunicación entre agentes

Cada agente escribe en su archivo `dev/agent-updates/[nombre].md` al terminar un bloque de trabajo. El formato es fijo:

```markdown
## [FECHA] — [ESTADO: En progreso | Completado | Bloqueado]
**Hice:** descripción breve de lo realizado
**Dejé listo para:** qué puede usar otro agente de este trabajo
**Necesito de [Agente-X]:** solicitud específica, si aplica
**Propuesta Constitución:** [solo si aplica] descripción del cambio propuesto
**Próximo paso:** qué sigue dentro de mi dominio
```

**Regla de lectura:** Antes de comenzar cualquier trabajo con dependencias potenciales, el agente lee los archivos de updates de los agentes relacionados con su tarea.

---

## 8. Reglas de acción

Filosofía: **actúa y notifica** — sin pedir permiso para trabajar dentro del propio dominio.

| Acción | Regla |
|--------|-------|
| Trabajar dentro de su dominio | Libre — deja update al terminar |
| Crear archivos nuevos dentro de su dominio | Libre — avisa en su update |
| Cambio que afecta el dominio de otro agente | Escribe la solicitud en su update; espera ACK antes de ejecutar |
| Modificar el motor de cálculo compartido | Coordinar con Agent-Modelo primero |
| Tocar la capa cliente | Solo Agent-Cliente, nunca directamente desde verticales |
| Eliminar archivos existentes | Requiere confirmación humana explícita |
| Proponer cambio a este documento | Escribir `[PROPUESTA CONSTITUCIÓN]` en su update; el humano aprueba |

---

## 9. Convenciones técnicas

**Stack:** HTML + CSS + JavaScript vanilla. Sin frameworks. Sin build steps. Archivos autocontenidos.

**Dependencias externas permitidas (vía CDN):**
- Chart.js 4.4.0 — gráficos
- html2pdf.js 0.10.1 — exportación PDF

**CSS:** Siempre mediante custom properties (`--primary`, `--success`, `--warning`, etc.). No hardcodear colores ni espaciados.

**Monedas:**
- Gastronómica: CLP como unidad nativa (`Intl.NumberFormat('es-CL', { currency: 'CLP' })`)
- Inmobiliaria: UF como unidad nativa de valorización; CLP como display secundario
- La tasa UF → CLP se ingresa manualmente como parámetro (no se consume API externa)

**Nomenclatura de variables:** Español para conceptos de negocio (`margenUtilidad`, `pctSocChef`, `valorUF`), inglés para lógica genérica (`debounce`, `render`, `calcular`, `cleanNumber`).

**Responsive:** Breakpoints mínimos en 1024px y 640px. Layout principal: sidebar 320px fijo + panel resultados flexible.

**Archivos:** Un archivo = una herramienta. Autocontenido. Nombramiento en kebab-case descriptivo (`calculadora-ingresos-m2.html`).

---

## 10. Cuándo activar Agent-Repo

Agent-Repo no trabaja en forma continua. Se activa en momentos específicos:

- **Reorganización de estructura:** cuando se crean nuevas carpetas o se mueven archivos
- **Actualización de Constitución:** cuando hay propuestas acumuladas listas para aprobar
- **Onboarding de agente nuevo:** cuando se agrega una vertical o herramienta no contemplada
- **Auditoría de consistencia:** cuando dos agentes han trabajado en paralelo y hay riesgo de divergencia
- **Release hacia cliente:** cuando una herramienta interna está lista para tener su versión pública

En la práctica, lo activas tú abriendo un hilo con ese agente cuando detectas que se necesita orden.

---

## 11. Protocolo de evolución

Esta Constitución es un documento vivo. La primera versión es intencionalmente abierta; los límites y convenciones se afinan con la experiencia.

- Cualquier agente puede **proponer** un cambio con la etiqueta `[PROPUESTA CONSTITUCIÓN]` en su archivo de updates
- Los cambios se acumulan y el humano los revisa y aprueba en bloque
- Cada versión aprobada se numera (`v1.1`, `v1.2`) y se fecha en el encabezado de este documento
- Lo que no está definido aquí no está prohibido — está pendiente de descubrir

---

*Este documento es la fuente de verdad del sistema.*
*Ante cualquier ambigüedad entre un agente y este documento, prevalece este documento.*
*Ante cualquier ambigüedad entre este documento y el humano, prevalece el humano.*
