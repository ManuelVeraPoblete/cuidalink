# HomeScreen Trim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quitar las tarjetas "Medicamentos de hoy", "Signos vitales" y "Observaciones" del grid de accesos rápidos de `HomeScreen`.

**Architecture:** Edición puntual de JSX en un único archivo, sin cambios de lógica ni de rutas.

**Tech Stack:** React Native 0.74, TypeScript 5.

## Global Constraints

- No se tocan rutas (`Medicamentos`, `Vitales` siguen registradas en `AppNavigator`, accesibles desde `PatientDetailScreen`).
- No se borran los assets de íconos usados por las tarjetas removidas.
- No existe archivo de test para `HomeScreen` en este repo — no se crea uno nuevo.
- Sin comentarios en el código salvo que documenten un porqué no obvio.

---

### Task 1: Quitar las 3 tarjetas del grid

**Files:**
- Modify: `appmovil/src/presentation/screens/home/HomeScreen.tsx`

**Interfaces:** Ninguna — no se cambian tipos ni firmas, solo se elimina JSX dentro del componente ya existente.

- [ ] **Step 1: Editar el grid**

En `appmovil/src/presentation/screens/home/HomeScreen.tsx`, reemplazar el bloque `<View style={styles.grid}>...</View>` completo:

```tsx
        <View style={styles.grid}>
          <HomeCard
            icon={require('../../../../assets/icons/pacientes.png')}
            label="Mis pacientes"
            onPress={() => navigation.navigate('Pacientes')}
          />
          <HomeCard
            icon={require('../../../../assets/icons/medicamentos-pildora.png')}
            label="Medicamentos de hoy"
            onPress={() => navigation.navigate('Medicamentos')}
          />
          <HomeCard
            icon={require('../../../../assets/icons/signos-vitales.png')}
            label="Signos vitales"
            onPress={() => navigation.navigate('Vitales')}
          />
          <HomeCard
            icon={require('../../../../assets/icons/observaciones.png')}
            label="Observaciones"
          />
          <HomeCard
            icon={require('../../../../assets/icons/perfil.png')}
            label="Perfil"
            onPress={() => navigation.navigate('Perfil')}
          />
        </View>
```

por:

```tsx
        <View style={styles.grid}>
          <HomeCard
            icon={require('../../../../assets/icons/pacientes.png')}
            label="Mis pacientes"
            onPress={() => navigation.navigate('Pacientes')}
          />
          <HomeCard
            icon={require('../../../../assets/icons/perfil.png')}
            label="Perfil"
            onPress={() => navigation.navigate('Perfil')}
          />
        </View>
```

No se cambia nada más del archivo (imports, `HomeCard`, header, saludo, divisor, `styles` — todo queda igual; el estilo `grid` ya usa `flexWrap`, así que 2 tarjetas se ven bien sin ajustes de layout).

- [ ] **Step 2: Verificar tipos**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Correr la suite completa**

Run: `cd appmovil && npx jest`
Expected: todos los tests en PASS (no hay test de `HomeScreen`, así que este cambio no puede romper ninguno existente).

- [ ] **Step 4: Commit**

```bash
git add appmovil/src/presentation/screens/home/HomeScreen.tsx
git commit -m "feat(appmovil): remove Medicamentos/Vitales/Observaciones cards from HomeScreen"
```
