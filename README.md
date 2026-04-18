# Suite Financiera Inversión (SFI)
**Herramienta interna de evaluación de inversiones — uso exclusivo del equipo**

## Verticales
- **Gastronómica** — restaurantes y locales F&B
- **Inmobiliaria** — house flipping, arriendo, renta

## Estructura
```
/
├── calculadora-ingresos-m2 v1.0.html   ← Gastro: proyección ingresos (MVP ✓)
├── calculadora-inversion v1.0.html      ← Motor inversión societaria (MVP ✓)
├── dev/                                 ← Sistema multi-agente
│   ├── CONSTITUTION.md                  ← Fuente de verdad del sistema
│   ├── AGENTS.md                        ← Roles y responsabilidades
│   ├── FLUJOS.md                        ← Esquemas de flujo
│   └── agent-updates/                   ← Comunicación entre agentes
├── inmobiliario/                        ← [En desarrollo]
└── cliente/                             ← [En desarrollo] Mini apps por proyecto
```

## Principio rector
> Un solo motor de cálculo. Múltiples pieles.
> Backend homologado → frontend personalizado por proyecto y cliente.

Ver `dev/CONSTITUTION.md` para la fuente de verdad completa.
