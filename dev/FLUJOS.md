# FLUJOS.md
# Suite Financiera Inversión — Esquema de Flujos
**Versión 1.0 — Abril 2026**

---

## Flujo 1 — Evaluación Gastronómica (interno)

```
HUMANO ingresa datos del local
        ↓
[calculadora-ingresos-m2]
  · m² o mesas → capacidad (sillas)
  · ocupación + ticket + rotación → ingreso mensual
  · curva de crecimiento → proyección 5 años
  · "Continuar a Inversión" → localStorage
        ↓
[calculadora-inversion]  ← patrón: dividendos-recurrentes
  · Estructura societaria (% microinv / % controlador)
  · Tiers: cantidad, monto, mes entrada, mes retornos
  · Tributación: 1ª categoría + retención individual
  · Motor: TIR / VAN / ROI / Payback por tier y controlador
  · Output: métricas completas + gráfico VAN acumulado + PDF
```

---

## Flujo 2 — Evaluación Inmobiliaria (interno)

```
HUMANO ingresa propiedades a comparar
        ↓
[sensibilizador-propiedades]
  · Precio UF, m² terreno, m² construido
  · UF/m² calculado automático
  · Estado propiedad (Bien / Antiguo / Mal)
  · Atributos: piso, GGCC, estacionamiento, bodega, terraza, orientación
  · Output: tabla comparativa ordenable + score de conveniencia
        ↓
[calculadora-remodelacion]  (opcional, para propiedades seleccionadas)
  · Costo obras en UF
  · Valor proyectado post-remodelación
  · Delta UF + utilidad estimada
  · Conversión a CLP (tasa UF ingresada manualmente)
        ↓
[calculadora-inversion-inmob]  ← patrón seleccionable
  · PATRÓN A — arriendo-mensual:
      arriendo UF/mes × años proyección → flujo mensual al motor
  · PATRÓN B — venta-activo:
      precio compra + remodelación → venta en año X → evento único al motor
  · PATRÓN C — hibrido:
      arriendo mensual durante N años + venta al final → motor combina flujos
  · Estructura societaria idéntica al motor gastro (tiers + controlador)
  · Motor: TIR / VAN / ROI / Payback (mismo core)
  · Output: métricas completas + comparativo entre patrones + PDF
```

---

## Flujo 3 — Generación de presentación para cliente (capa pública)

```
HUMANO valida evaluación interna (gastro o inmobiliaria)
        ↓
HUMANO activa Agent-Cliente con:
  · Nombre del proyecto
  · Imagen del proyecto
  · Parámetros del contrato de exportación
    (métricas clave: TIR, ROI, payback, retiro/dividendo mensual neto)
        ↓
[Agent-Cliente] construye /cliente/[nombre-proyecto]/
  · Mini app con skin personalizado
  · Imagen del proyecto integrada
  · Métricas del contrato de exportación (no toda la complejidad interna)
  · Vista limpia para el cliente: "así se ve tu inversión"
        ↓
HUMANO revisa y entrega al cliente
```

---

## Flujo 4 — Comunicación entre agentes

```
Agent-A termina un bloque de trabajo
        ↓
Escribe en dev/agent-updates/agent-a.md:
  · Qué hizo
  · Qué dejó listo para otro agente
  · Qué necesita de otro agente (si aplica)
        ↓
HUMANO abre hilo con Agent-B
        ↓
Agent-B lee dev/agent-updates/agent-a.md antes de comenzar
        ↓
Agent-B continúa desde donde quedó Agent-A
        ↓
Agent-B escribe su propio update al terminar
```

---

## Flujo 5 — Evolución de la Constitución

```
Cualquier agente detecta algo que debería estar en la Constitución
        ↓
Escribe en su archivo de updates:
  [PROPUESTA CONSTITUCIÓN]: descripción del cambio
        ↓
HUMANO acumula propuestas (puede ser de varios agentes)
        ↓
HUMANO activa Agent-Repo con las propuestas a aprobar
        ↓
Agent-Repo actualiza CONSTITUTION.md y/o AGENTS.md
        ↓
Nueva versión numerada (v1.x) con fecha
```

---

## Contrato de exportación — formato estándar hacia cliente

Todo proyecto que llega a capa cliente expone exactamente este objeto:

```javascript
const contratoExportacion = {
  proyecto: {
    nombre: "Nombre del Proyecto",
    tipo: "gastro | inmobiliario",
    imagen: "assets/imagen-proyecto.jpg",
    descripcion: "Descripción breve para el cliente"
  },
  inversion: {
    montoIndividual: 0,        // CLP o UF según vertical
    moneda: "CLP | UF",
    mesInversion: 0,
    mesInicioRetornos: 0
  },
  metricas: {
    tirAnual: 0,               // porcentaje
    roiAnual: 0,               // porcentaje
    paybackMeses: 0,           // meses desde inversión
    retornoMensualNeto: 0,     // CLP — año estabilizado
    vanTotal: 0                // CLP
  },
  patron: "dividendos-recurrentes | arriendo-mensual | venta-activo | hibrido"
}
```
