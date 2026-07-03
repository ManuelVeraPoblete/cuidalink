# HomeScreen — quitar accesos rápidos de Medicamentos/Vitales/Observaciones

**Fecha:** 2026-07-03
**Módulo:** `appmovil` — `presentation/screens/home`

## Contexto

El usuario pidió sacar del grid de accesos rápidos de `HomeScreen` (pantalla de inicio del cuidador)
las tarjetas "Medicamentos de hoy", "Signos vitales" y "Observaciones". Solicitud directa, sin
ambigüedad.

## Alcance

**Incluye:** eliminar las 3 tarjetas `HomeCard` correspondientes del grid en `HomeScreen.tsx`.

**No incluye:** cambios a rutas (`Medicamentos`, `Vitales` siguen existiendo, accesibles desde
`PatientDetailScreen`), cambios a assets de íconos (quedan sin usar, no se borran), cambios a
`Perfil`/`Mis pacientes` (las dos tarjetas que quedan).

## Diseño

En `appmovil/src/presentation/screens/home/HomeScreen.tsx`, el grid pasa de 5 tarjetas a 2:
"Mis pacientes" y "Perfil". Se eliminan los 3 bloques `<HomeCard ... />` de "Medicamentos de hoy",
"Signos vitales" y "Observaciones" — nada más cambia en el archivo (estilos, imports de otros
componentes, etc. quedan igual).

## Testing

No existe archivo de test para `HomeScreen` en este repo (verificado). Verificación: `npx tsc --noEmit`
limpio (no debe quedar ningún import sin usar por el `require()` de los íconos removidos, ya que esos
`require()` viven inline dentro del JSX eliminado, no como imports separados).
