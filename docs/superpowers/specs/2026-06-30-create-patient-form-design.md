# Spec: Formulario de Nuevo Paciente (Extendido)

## Contexto

La pantalla `CreatePatientScreen` actual solo recibe nombre y fecha de nacimiento como texto libre. Este spec extiende el formulario para capturar todos los datos clínicos y de contacto relevantes, con todos los campos obligatorios.

## Campos del formulario

| # | Campo | Tipo UI | Backend field | Requerido |
|---|-------|---------|---------------|-----------|
| 1 | Nombre completo | TextInput | `fullName` | Sí |
| 2 | RUT / documento de identidad | TextInput | `identificationNumber` | Sí |
| 3 | Fecha de nacimiento | Date picker nativo | `birthDate` | Sí |
| 4 | Edad | Texto calculado (read-only) | — | — |
| 5 | Sexo | Selector: Masculino / Femenino / Otro | `gender` | Sí |
| 6 | Dirección | TextInput | `address` | Sí |
| 7 | Nombre contacto de emergencia | TextInput | `emergencyContact.name` | Sí |
| 8 | Teléfono contacto de emergencia | TextInput numérico | `emergencyContact.phone` | Sí |
| 9 | Previsión de salud | TextInput | `healthInsurance` | Sí |
| 10 | Grupo sanguíneo | Selector | `bloodType` | Sí |

**Opciones grupo sanguíneo:** A+, A−, B+, B−, AB+, AB−, O+, O−, No sé

**Edad:** se calcula en tiempo real a partir de `birthDate` usando `differenceInYears` (date-fns) o cálculo manual. Solo lectura, no se envía al backend.

## Cambios en Backend

### Modelo de dominio `Patient`

Agregar tres campos nuevos a `Patient.java`:
- `String address` — dirección del paciente
- `String healthInsurance` — previsión de salud
- `String bloodType` — grupo sanguíneo

Todos no nulos. Agregar al constructor principal, reconstruction constructor, getters y setters.

### DTOs

**`CreatePatientRequest`:** agregar `@NotBlank String address`, `@NotBlank String healthInsurance`, `@NotBlank String bloodType`. El campo `identificationNumber` pasa a `@NotBlank`.

**`UpdatePatientRequest`:** agregar los mismos tres campos opcionales (para edición parcial futura).

**`PatientResponse`:** agregar `address`, `healthInsurance`, `bloodType` para que el frontend los pueda mostrar.

### Entidad JPA `PatientJpaEntity`

Agregar columnas `address`, `health_insurance`, `blood_type` con sus getters/setters. Hibernate genera las columnas vía `ddl-auto=update`.

### Adaptador `JpaPatientRepositoryAdapter`

Actualizar `toJpa()` y `toDomain()` para mapear los tres campos nuevos.

### Servicio `PatientService`

Actualizar el caso de uso `create` para pasar `address`, `healthInsurance` y `bloodType` al constructor de `Patient`.

## Cambios en Mobile

### Dependencias

- `@react-native-community/datetimepicker` — date picker nativo (ya disponible en Expo)

### Schema Zod actualizado

```typescript
const schema = z.object({
  fullName:              z.string().min(2),
  identificationNumber:  z.string().min(1),
  birthDate:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender:                z.enum(['MALE', 'FEMALE', 'OTHER']),
  address:               z.string().min(1),
  emergencyContactName:  z.string().min(1),
  emergencyContactPhone: z.string().min(1),
  healthInsurance:       z.string().min(1),
  bloodType:             z.string().min(1),
});
```

### UI `CreatePatientScreen`

- Envolver en `ScrollView` para formularios largos
- Date picker: al tocar el campo fecha se abre `DateTimePicker` en modo `date`. Al seleccionar, se formatea a `YYYY-MM-DD` y se calcula la edad
- Sexo y grupo sanguíneo: implementados con `TouchableOpacity` + `Modal` con lista de opciones (patrón selector simple, sin librería extra)
- Edad: `Text` calculado junto al campo de fecha, no editable

### Repositorio `ApiPatientRepository`

El método `createPatient` envía el body completo con todos los campos nuevos mapeando `emergencyContactName` / `emergencyContactPhone` al objeto `emergencyContact: { name, phone }`.

## Validaciones

- Frontend: Zod valida todos los campos antes de hacer submit
- Backend: `@NotBlank` / `@NotNull` en el DTO; `GlobalExceptionHandler` devuelve 400 con detalle de campo

## Flujo

1. Usuario rellena formulario → toca "Crear Paciente"
2. Zod valida → si hay errores los muestra inline bajo cada campo
3. `patientRepo.createPatient(data)` → POST `/api/v1/patients`
4. Backend valida, crea paciente, responde 201
5. App invalida query `['patients']` y navega hacia atrás
