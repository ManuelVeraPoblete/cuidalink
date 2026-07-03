# Rediseño de la pantalla de Perfil del Cuidador

**Fecha:** 2026-07-03
**Módulos:** `backend` — `auth`; `appmovil` — `presentation/screens/profile`

## Contexto

El usuario pidió rediseñar la pantalla de perfil del cuidador (`ProfileScreen`) siguiendo un
mockup estricto: header con back button + logo, tarjeta de avatar/nombre/badge de rol/botón
"Editar", sección "Datos personales" (Nombre, Correo electrónico, Teléfono, Dirección,
Especialidad, Experiencia — cada uno con ícono, label, valor y lápiz de edición), sección
"Configuración" (Cambiar contraseña, Notificaciones) y botón "Cerrar sesión".

Hoy `ProfileScreen.tsx` es una pantalla mínima de tema claro con nombre/correo, un generador de
informes PDF (`DateRangePicker` + `downloadReportUseCase`) y el botón de cerrar sesión. El modelo
`User` (backend y mobile) solo tiene `id`, `name`, `email` (mobile) / `id`, `name`, `email`,
`passwordHash`, `role`, `fcmToken` (backend) — no existen los campos `phone`, `address`,
`specialty`, `experience` que pide el mockup.

## Alcance

**Incluye:**
- Backend: agregar `phone`, `address`, `specialty`, `experience` (todos `String` nullable) a
  `User` (auth), persistencia JPA, y un endpoint `PATCH /auth/me` para actualizar el perfil
  propio (incluye validación de correo duplicado).
- Mobile: rediseño completo de `ProfileScreen.tsx` según el mockup (tema oscuro, mismo patrón de
  header que `PatientDetailScreen`/`DailyMedsScreen`).
- Mobile: nueva pantalla `EditProfileScreen.tsx` (formulario para los 6 campos), alcanzable desde
  el botón "Editar" o cualquier lápiz de fila.
- Mobile: filas "Cambiar contraseña" y "Notificaciones" navegan a `ComingSoonScreen` (no existe
  funcionalidad real hoy).

**No incluye (fuera de alcance):**
- Subida/cambio de foto de perfil (el avatar sigue siendo un ícono placeholder, igual que el de
  pacientes).
- Funcionalidad real de "Cambiar contraseña" o "Notificaciones".
- El generador de informe PDF (`DateRangePicker`/`downloadReportUseCase`) se **elimina** de
  `ProfileScreen` sin reubicarlo — no aparece en el mockup. Puede reubicarse en una tarea futura
  aparte (ej. como tarjeta de "Historial" en `PatientDetailScreen`).
- Roles de colaborador (`UserRole` sigue teniendo un solo valor, `CAREGIVER`); el badge "Cuidador"
  es un mapeo estático, no un selector.

## Diseño

### 1. Backend — dominio y persistencia (`auth`)

`User` (dominio, `com.cuidalink.auth.domain.model.User`) gana 4 campos mutables nuevos: `phone`,
`address`, `specialty`, `experience` (todos `String`, nullable). Se agregan getters/setters
(`updateProfile(String name, Email email, String phone, String address, String specialty, String
experience)` como método único que actualiza todos los campos editables a la vez — evita 6
setters sueltos).

`UserJpaEntity` gana las 4 columnas nuevas (`String`, nullable) con sus getters/setters.
`ddl-auto=update` las crea automáticamente, mismo patrón que las columnas de `schedule` agregadas
en el trabajo de medicamentos. `JpaUserRepositoryAdapter` las mapea igual que las existentes.

### 2. Backend — endpoint `PATCH /auth/me`

Nuevo puerto `UpdateProfileUseCase`:

```java
public interface UpdateProfileUseCase {
    User execute(UserId userId, UpdateProfileCommand command);
    record UpdateProfileCommand(String name, String email, String phone, String address,
                                 String specialty, String experience) {}
}
```

`AuthService` implementa este puerto además de los existentes:
- Busca el usuario por `userId` (404 lógico → `IllegalArgumentException` si no existe, aunque en
  la práctica el `userId` viene del JWT autenticado y siempre existe).
- Si `command.email()` es distinto al email actual del usuario, valida que
  `userRepository.findByEmail(command.email())` no devuelva un usuario con otro id — si lo hace,
  lanza `IllegalStateException("Este correo ya está en uso")` (→ HTTP 409 vía
  `GlobalExceptionHandler`, mismo patrón que el registro).
- Llama `user.updateProfile(...)`, guarda, retorna el usuario actualizado.

`AuthController` gana:

```java
@PatchMapping("/me")
public ResponseEntity<AuthResponse> updateMe(@AuthenticationPrincipal User user,
                                              @Validated @RequestBody UpdateProfileRequest req) {
    var updated = updateProfileUseCase.execute(user.getId(),
        new UpdateProfileUseCase.UpdateProfileCommand(
            req.name(), req.email(), req.phone(), req.address(), req.specialty(), req.experience()));
    return ResponseEntity.ok(toResponse(updated));
}
```

Nuevo DTO `UpdateProfileRequest(@NotBlank String name, @Email @NotBlank String email, String
phone, String address, String specialty, String experience)` — `phone`/`address`/`specialty`/
`experience` sin `@NotBlank` (opcionales).

`AuthResponse` se extiende a `record AuthResponse(String id, String name, String email, String
role, String phone, String address, String specialty, String experience)`. `toResponse(User)` en
`AuthController` mapea los 4 campos nuevos (pueden ser `null`). El `GET /auth/me` existente
también devuelve estos campos automáticamente (mismo método `toResponse`).

### 3. Mobile — `User` entity y `AuthRepository`

`User.ts`:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CAREGIVER';
  phone?: string | null;
  address?: string | null;
  specialty?: string | null;
  experience?: string | null;
}
```

`AuthRepository`/`ApiAuthRepository` gana:

```typescript
updateProfile(data: {
  name: string; email: string; phone?: string | null; address?: string | null;
  specialty?: string | null; experience?: string | null;
}): Promise<User>;
```

Implementación: `PATCH /auth/me` con el body, retorna el `User` actualizado (misma forma que
`/auth/me` GET).

### 4. Mobile — `ProfileScreen.tsx` (rediseño)

Mismo tema oscuro y patrón de header (back button circular + logo CuidaLink centrado + spacer) que
`PatientDetailScreen`/`DailyMedsScreen`. Título "Perfil del cuidador".

**Tarjeta superior:** avatar circular con ícono `Ionicons name="person"` (mismo placeholder que
usa `PatientDetailScreen` para el avatar de paciente — sin foto real), nombre (`user.name`), badge
"Cuidador" (texto estático, ya que `role` solo tiene el valor `CAREGIVER` hoy — mismo componente
visual `statusBadge` que ya existe en `PatientDetailScreen`), botón "Editar" (ícono lápiz + texto)
que navega a `EditProfile`.

**Sección "Datos personales":** título con ícono `person-outline`. 6 filas, cada una con: ícono
(`person-outline` Nombre, `mail-outline` Correo, `call-outline` Teléfono, `location-outline`
Dirección, `medkit-outline` Especialidad, `star-outline` Experiencia), label, valor, y un ícono de
lápiz (`create-outline`) a la derecha que también navega a `EditProfile`. El teléfono se muestra
formateado con `toChilePhone` cuando existe. Campos vacíos (`null`/`undefined`) muestran
`"No especificado"` en lugar del valor.

**Sección "Configuración":** título con ícono `settings-outline`. Dos filas tipo lista
(ícono + texto + chevron): "Cambiar contraseña" (ícono `lock-closed-outline`) y "Notificaciones"
(ícono `notifications-outline`), ambas navegan a
`navigation.navigate('ComingSoon', { title, subtitle })` (mismo patrón que
`PatientDetailScreen.goToComingSoon`).

**Botón "Cerrar sesión":** se mantiene igual a como existe hoy (mismo `handleLogout`,
`ActivityIndicator` mientras carga), pero restyled al lenguaje visual oscuro del mockup (fondo
rojo `#e05555`, ícono `log-out-outline` + texto, mismo estilo que el botón "Agregar medicamento"
de `DailyMedsScreen` en cuanto a forma).

Se elimina la sección "Generar Informe PDF" (`DateRangePicker`, `downloadReportUseCase`,
`reportLoading`, `handleDownloadReport`) — no aparece en el mockup y no se reubica en este
trabajo.

### 5. Mobile — `EditProfileScreen.tsx` (nueva)

Mismo patrón que `EditPatientScreen.tsx`: tema claro tipo "sheet" (`ScrollView` +
`rgba(255,255,255,0.92)` card), React Hook Form + Zod. Zod schema:

```typescript
const schema = z.object({
  name:       z.string({ error: 'Nombre requerido' }).min(2, 'El nombre debe tener al menos 2 caracteres'),
  email:      z.string({ error: 'Correo requerido' }).email('Correo inválido'),
  phone:      z.string().optional(),
  address:    z.string().optional(),
  specialty:  z.string().optional(),
  experience: z.string().optional(),
});
```

`phone` reutiliza el mismo patrón de prefijo `+56` que `EditPatientScreen` usa para
`emergencyContactPhone` (`stripChilePrefix`/`toChilePhone`/`isValidChileSubscriberNumber`), pero
sin ser obligatorio: si el campo queda vacío, se envía `null`; si tiene contenido, debe cumplir
`isValidChileSubscriberNumber` (validación condicional vía `.refine` solo cuando no está vacío).

Al guardar (`onSubmit`): llama `authRepo.updateProfile({...data, phone: phone ? toChilePhone(phone) : null})`,
actualiza `useAuthStore().setUser(updated)` con la respuesta, `navigation.goBack()`. Error 409
(correo duplicado) → `Alert.alert('Error', 'Este correo ya está en uso.')`; cualquier otro error →
`Alert.alert('Error', 'No se pudo actualizar el perfil.')`.

Ruta nueva `EditProfile: undefined` en `PatientStackParams`/`AppNavigator`, registrada con
`options={{ title: 'Editar Perfil' }}` (mismo patrón que `EditPatient`).

## Manejo de errores

- Backend: correo duplicado de otro usuario → 409 (`IllegalStateException`); validación de
  `@NotBlank`/`@Email` en `name`/`email` → 400 (ya manejado por `GlobalExceptionHandler`).
- Mobile: carga de `ProfileScreen` no requiere `isLoading` propio — `user` viene del `authStore`,
  ya poblado desde el login/registro. Si algún campo nuevo es `null` (usuarios existentes antes de
  este cambio), se muestra `"No especificado"`.
- Guardado en `EditProfileScreen`: mismo patrón de `loading`/`ActivityIndicator`/`Alert.alert` que
  `EditPatientScreen`.

## Testing

**Backend:**
- `AuthServiceTest`: nuevo `update(...)` — actualiza todos los campos correctamente; permite
  guardar el mismo correo propio (no debe lanzar conflicto); rechaza correo ya usado por otro
  usuario (`IllegalStateException`).
- `AuthControllerTest` (`@WebMvcTest`, mock del use case): `PATCH /auth/me` devuelve 200 con el
  usuario actualizado; validación de `name`/`email` en blanco devuelve 400.

**Mobile:**
- `ProfileScreen.test.tsx` (nuevo, no existe hoy): muestra los 6 campos con sus valores (y
  "No especificado" cuando son `null`); "Editar" navega a `EditProfile`; las filas de
  Configuración navegan a `ComingSoon` con el título correcto; "Cerrar sesión" sigue invocando
  `authRepo.logout()` y limpiando el store.
- `EditProfileScreen.test.tsx` (nuevo): valida nombre/correo requeridos; guardado exitoso llama
  `updateProfile` con los datos correctos (incluyendo formateo de teléfono) y navega atrás; error
  409 muestra el mensaje de correo duplicado.
