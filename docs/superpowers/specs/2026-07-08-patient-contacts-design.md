# Pantalla "Contactos" — contactos categorizados del paciente

**Fecha:** 2026-07-08
**Módulos:** `backend` (nuevo submódulo dentro de `patient`) — `appmovil` (`presentation/screens/patients`)

## Contexto

El usuario proporcionó un mockup de la pantalla "Contactos" a seguir de forma exacta: una lista de
contactos vinculados al paciente, filtrables por categoría (Todos/Familia/Médico/Emergencia), cada
uno con nombre, categoría, relación (ej. "Hija", "Médico tratante"), teléfono, email u observación,
un badge "Prioritario" para el contacto marcado como tal, acciones "Llamar"/"Editar", y un botón
"Agregar contacto".

Hoy no existe este concepto: `Patient` solo tiene un único campo `emergencyContact` (nombre +
teléfono), y la pantalla `ContactsScreen.tsx` actual muestra ese contacto único, un botón "Editar
paciente" y `CollaboratorsSection` (gestión de colaboradores con acceso/login a la app — un concepto
totalmente distinto, no relacionado a contactos de referencia).

Se decidió (con el usuario) reemplazar por completo el contenido de `ContactsScreen` por la lista
categorizada del mockup. Como eso deja sin punto de entrada a "Editar paciente" y a
`CollaboratorsSection`, se agrega un ícono de editar en el header de `PatientDetailScreen` y
`CollaboratorsSection` se muda a `EditPatientScreen`.

## Alcance

**Incluye:**
- Nuevo concepto de dominio `PatientContact` dentro del hexágono `patient` existente: modelo,
  puertos, casos de uso, adaptador REST, adaptador JPA, tabla `patient_contacts`.
- `ContactsScreen.tsx` reemplazada por completo por la lista categorizada del mockup.
- Componente `PatientContactCard`, util `contactDisplay.ts` (ícono/color por categoría).
- Pantalla nueva `ContactFormScreen` (crear y editar, mismo formulario con `contactId` opcional).
- Ícono de editar paciente en el header de `PatientDetailScreen` → navega a `EditPatientScreen`.
- `CollaboratorsSection` se mueve de `ContactsScreen` a `EditPatientScreen`.
- Entidades, repositorio, DI y rutas nuevas en el móvil.
- Datos de prueba en la BD local para el paciente "María González López": los 3 contactos exactos
  del mockup (Ana Martínez, Dr. Pablo Rojas, Luis Martínez).
- Tests backend (unit + integración) y frontend (Jest/RNTL).

**No incluye (decidido explícitamente con el usuario):**
- Botón/acción "Ver detalle" — la tarjeta ya muestra todos los campos del contacto, no hay nada
  adicional que revelar. Cada tarjeta solo tiene **Llamar** y **Editar**.
- Eliminar un contacto (no está en el mockup; se puede agregar después si se pide).
- Cualquier cambio al campo `Patient.emergencyContact` existente (sigue igual, se usa en otras
  partes — creación de paciente, `EditPatientScreen` — no se toca).
- Permitir que colaboradores agreguen/editen contactos — solo el owner puede.

## Diseño — Backend

### 1. Dominio (`com.cuidalink.patient.domain.model`)

```java
public enum PatientContactCategory { FAMILY, DOCTOR, EMERGENCY }

public class PatientContact {
    private final PatientContactId id;
    private final PatientId patientId;
    private String name;
    private PatientContactCategory category;
    private String relationship;   // "Hija", "Médico tratante", "Hermano"
    private String phone;
    private String email;          // nullable
    private String note;           // nullable
    private boolean priority;

    // constructor + update(...) mutable, mismo estilo que VitalSignDefinition
}
```

`PatientContactId` — record `UUID`-wrapper, mismo patrón que `VitalSignDefinitionId`.

### 2. Puertos y casos de uso

`port/out`: `PatientContactRepository` (`save`, `findById`, `findByPatientId`).

`port/in`: `CreatePatientContactUseCase`, `UpdatePatientContactUseCase`, `ListPatientContactsUseCase`
(una interfaz por caso de uso, mismo estilo que `vital`).

`PatientContactService implements` las 3 interfaces. Autorización (regla acordada — solo el owner
gestiona contactos, igual que definir signos vitales o medicamentos):
- `create`/`update`: requiere `patient.isOwner(requesterId)`.
- `list`: requiere `patient.hasAccess(requesterId)` (owner o colaborador).

### 3. Adaptador REST

`PatientContactController`:
```
POST  /patients/{patientId}/contacts
GET   /patients/{patientId}/contacts
PUT   /patients/{patientId}/contacts/{contactId}
```

DTOs: `CreatePatientContactRequest`, `UpdatePatientContactRequest`, `PatientContactResponse` —
records simples, mismo estilo que `CreateVitalDefinitionRequest`/`VitalDefinitionResponse`.
Validación: `name`/`category`/`phone` `@NotBlank`/`@NotNull`; `relationship`, `email`, `note`
opcionales (`String`, sin anotación); `priority` `boolean` con default `false` si no se envía.

Errores: reutiliza `GlobalExceptionHandler` (`IllegalArgumentException` → 400). Sin manejo nuevo.

### 4. Persistencia (JPA)

`PatientContactJpaEntity` (tabla `patient_contacts`), `JpaPatientContactRepositoryAdapter`,
`SpringPatientContactRepository` — mapeo directo campo a campo (sin serialización especial, a
diferencia de `vital_records`).

`schema.sql` — se agrega:
```sql
CREATE TABLE patient_contacts (
    id            VARCHAR(36)  PRIMARY KEY,
    patient_id    VARCHAR(36)  NOT NULL,
    name          VARCHAR(255) NOT NULL,
    category      VARCHAR(20)  NOT NULL,   -- FAMILY | DOCTOR | EMERGENCY
    relationship  VARCHAR(255),
    phone         VARCHAR(50)  NOT NULL,
    email         VARCHAR(255),
    note          TEXT,
    priority      BOOLEAN      NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_patient_contacts_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
);

CREATE INDEX idx_patient_contacts_patient ON patient_contacts (patient_id);
```

## Diseño — Frontend (`appmovil`)

### 1. Entidad (`domain/entities/PatientContact.ts`)

```ts
export type PatientContactCategory = 'FAMILY' | 'DOCTOR' | 'EMERGENCY';

export interface PatientContact {
  id: string;
  patientId: string;
  name: string;
  category: PatientContactCategory;
  relationship: string;
  phone: string;
  email: string | null;
  note: string | null;
  priority: boolean;
}
```
Export en `entities/index.ts`.

### 2. Repositorio

```ts
export interface CreatePatientContactData {
  name: string;
  category: PatientContactCategory;
  relationship: string;
  phone: string;
  email: string | null;
  note: string | null;
  priority: boolean;
}

export interface PatientContactRepository {
  listContacts(patientId: string): Promise<PatientContact[]>;
  createContact(patientId: string, data: CreatePatientContactData): Promise<PatientContact>;
  updateContact(patientId: string, contactId: string, data: CreatePatientContactData): Promise<PatientContact>;
}
```
`ApiPatientContactRepository` contra `/patients/{id}/contacts` (mismo patrón `axios` que
`ApiVitalRepository`). Se agrega `patientContactRepo` a `useInjection.ts`.

### 3. `domain/utils/contactDisplay.ts`

```ts
export function pickContactCategoryStyle(category: PatientContactCategory):
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string } {
  switch (category) {
    case 'FAMILY':    return { icon: 'people',   color: '#1a9c7d', label: 'Familia' };
    case 'DOCTOR':    return { icon: 'medkit',   color: '#2f6fed', label: 'Médico' };
    case 'EMERGENCY': return { icon: 'alarm',    color: '#e05555', label: 'Emergencia' };
  }
}
```

### 4. `PatientContactCard.tsx` (nuevo)

Avatar circular (ícono/color de `pickContactCategoryStyle`), nombre, badge de categoría + texto de
`relationship`, fila teléfono (ícono `call-outline`), fila email (ícono `mail-outline`, solo si
`email`) **o** fila nota (ícono `chatbubble-ellipses-outline`, solo si `note` y no hay `email`),
acciones **Llamar** (`Linking.openURL('tel:'+phone)`) y **Editar** (navega a `ContactForm` con
`contactId`). Si `priority`: borde rojo en la tarjeta + badge "★ Prioritario" arriba a la derecha
(mismo tratamiento visual que el mockup).

### 5. `ContactsScreen.tsx` (reemplazo completo)

- Header + logo (patrón `TasksScreen`), título "Contactos", subtítulo "Contactos vinculados al
  paciente".
- `PatientChip` (reutilizado, ya existe) con `patient.fullName`.
- Tabs de categoría: `Todos` (ícono `people-circle`, teal) / `Familia` / `Médico` / `Emergencia`
  (mismo componente visual `tabsRow`/`tab`/`tabActive` de `TasksScreen`, filtro local).
- `FlatList` de `PatientContactCard` filtrada por tab activo.
- `ListEmptyComponent`: "Sin contactos para mostrar."
- Botón "Agregar contacto" (rojo, ícono `person-add`) — **solo si `patient.isOwner`** — navega a
  `ContactForm` con `{ patientId }` (sin `contactId` → modo creación).
- Sin paciente seleccionado / patrón ya usado: no aplica aquí porque `Contacts` recibe `patientId`
  como route param (no depende de `selectedPatientId`), igual que hoy.

### 6. `ContactFormScreen.tsx` (nuevo, crea y edita)

Route params `{ patientId: string; contactId?: string }`. Si `contactId` está presente, precarga el
formulario con `listContacts(patientId).find(c => c.id === contactId)` (no hay `getContact`
individual — la lista ya viene completa y no es pesada). React Hook Form + Zod, mismo patrón que
`CreateTaskScreen`:

1. **Nombre** — texto, requerido.
2. **Categoría** — 3 botones (Familia/Médico/Emergencia, iconos y colores de
   `pickContactCategoryStyle`), selección única, requerido.
3. **Relación** — texto libre (ej. "Hija", "Médico tratante"), opcional.
4. **Teléfono** — texto, requerido (mismo validador `isValidChileSubscriberNumber`/`toChilePhone`
   usado en `EditPatientScreen` para el contacto de emergencia).
5. **Email** — texto, opcional, validado como email si no vacío.
6. **Nota** — textarea, opcional.
7. **Marcar como prioritario** — `Switch`, default `false`.

Al enviar: `createContact`/`updateContact` según haya `contactId`, invalida
`['patient-contacts', patientId]`, `navigation.goBack()`. Mismo manejo de error (`Alert.alert`) que
el resto de formularios.

### 7. Navegación (`AppNavigator.tsx`)

```ts
ContactForm: { patientId: string; contactId?: string };
```
```ts
<Stack.Screen name="ContactForm" component={ContactFormScreen} options={{ headerShown: false }} />
```

### 8. `PatientDetailScreen.tsx` — ícono de editar paciente

El `backButtonSpacer` (hoy un `View` vacío de 44×44 para balancear el header) se reemplaza por un
botón real, visible solo si `patient.isOwner`:
```tsx
{patient.isOwner ? (
  <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('EditPatient', { patientId })}>
    <Ionicons name="create-outline" size={20} color="#fff" />
  </TouchableOpacity>
) : (
  <View style={styles.backButtonSpacer} />
)}
```

### 9. `EditPatientScreen.tsx` — mover `CollaboratorsSection`

Se agrega `<CollaboratorsSection patientId={patientId} isOwner={patient.isOwner} />` al final del
`ScrollView`, después del botón "Guardar Cambios" (mismo lugar donde vivía en `ContactsScreen`). No
se toca el resto de la pantalla (sigue con su tema claro actual — fuera de alcance restylearla).

## Manejo de errores

- Backend: `IllegalArgumentException` (paciente no encontrado, sin acceso, solo-owner) → 400 vía
  `GlobalExceptionHandler`, mismo criterio que el resto de módulos.
- Frontend: `Alert.alert('Error', 'No se pudo guardar el contacto.')` en fallo de
  crear/actualizar, mismo patrón que el resto de formularios. `Llamar` sin teléfono no debería poder
  ocurrir (`phone` es requerido), no se agrega guarda especial.

## Testing

**Backend:**
- `PatientContactServiceTest` (unit, Mockito): autorización (owner vs colaborador vs sin acceso)
  para `create`/`update`/`list`.
- `PatientContactIntegrationTest` (Testcontainers, mirror de `VitalIntegrationTest`): crear → listar
  → actualizar, contra PostgreSQL real.

**Frontend:**
- `contactDisplay.test.ts`: `pickContactCategoryStyle` para las 3 categorías.
- `ContactsScreen.test.tsx` (RNTL): filtro por tab, tarjeta muestra email o nota según corresponda,
  badge/borde de prioritario, botón "Agregar contacto" oculto si no es owner, "Llamar" invoca
  `Linking.openURL` con el teléfono correcto.
- `ContactFormScreen.test.tsx`: validaciones requeridas, modo creación vs edición (precarga de
  datos), envío exitoso llama al método correcto del repositorio y navega atrás.
