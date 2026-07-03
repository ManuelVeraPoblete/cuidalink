# Caregiver Profile Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `ProfileScreen` (perfil del cuidador) según el mockup, agregando los campos
`phone`/`address`/`specialty`/`experience` al backend y una pantalla de edición nueva.

**Architecture:** Backend hexagonal (auth module): `User` domain gana 4 campos + un método
`updateProfile`, expuestos vía `PATCH /auth/me`. Mobile: `ProfileScreen.tsx` se reescribe por
completo (tema oscuro, mismo patrón de header que `PatientDetailScreen`), y una nueva
`EditProfileScreen.tsx` (tema claro tipo "sheet", mismo patrón que `EditPatientScreen.tsx`) maneja
la edición vía React Hook Form + Zod.

**Tech Stack:** Java 17, Spring Boot 3.2, Spring Data JPA (backend) · React Native 0.74,
TypeScript 5, React Hook Form 7 + Zod 3, TanStack Query 5 (mobile).

## Global Constraints

- `phone`, `address`, `specialty`, `experience` son `String` nullable en todas las capas — sin
  estructura extra, mismo patrón que `Patient.address`.
- El avatar sigue siendo un ícono placeholder (`Ionicons name="person"`), sin subida de foto.
- "Cambiar contraseña" y "Notificaciones" navegan a `ComingSoonScreen` — no tienen funcionalidad
  real en este plan.
- El generador de informe PDF (`DateRangePicker`/`downloadReportUseCase`) se elimina de
  `ProfileScreen` sin reubicarlo — no aparece en el mockup.
- Correo duplicado al editar perfil → HTTP 409 (`IllegalStateException`), mismo patrón que el
  registro.
- Sin comentarios en el código salvo que documenten un porqué no obvio.

---

### Task 1: Backend — `User.updateProfile` + `UpdateProfileUseCase` (dominio puro)

**Files:**
- Modify: `backend/src/main/java/com/cuidalink/auth/domain/model/User.java`
- Create: `backend/src/main/java/com/cuidalink/auth/domain/port/in/UpdateProfileUseCase.java`
- Modify: `backend/src/main/java/com/cuidalink/auth/domain/service/AuthService.java`
- Test: `backend/src/test/java/com/cuidalink/auth/domain/service/AuthServiceTest.java`

**Interfaces:**
- Produces: `User.updateProfile(String name, Email email, String phone, String address, String specialty, String experience): void`; `User.getPhone()/getAddress()/getSpecialty()/getExperience(): String`; `UpdateProfileUseCase.execute(UserId userId, UpdateProfileUseCase.UpdateProfileCommand command): User`; `UpdateProfileUseCase.UpdateProfileCommand(String name, String email, String phone, String address, String specialty, String experience)` (record).

- [ ] **Step 1: Escribir los tests que fallan en `AuthServiceTest`**

Agregar este import junto a los demás, al inicio del archivo (después de
`import com.cuidalink.auth.domain.port.in.RegisterUserUseCase.RegisterUserCommand;`):

```java
import com.cuidalink.auth.domain.port.in.UpdateProfileUseCase;
```

Y agregar estos 3 métodos al final de la clase `AuthServiceTest` (antes del cierre `}` final, después de `updateFcmToken_updatesUserToken`):

```java
    @Test
    void updateProfile_updatesAllFieldsAndReturnsUser() {
        var userId = new UserId(java.util.UUID.randomUUID());
        var user = new User(userId, "Ana", new Email("ana@test.com"), "hashed");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var command = new UpdateProfileUseCase.UpdateProfileCommand(
            "Ana López", "ana@test.com", "+56912345678", "Av. Siempre Viva 123",
            "Cuidado geriátrico", "5 años");

        var updated = sut.execute(userId, command);

        assertThat(updated.getName()).isEqualTo("Ana López");
        assertThat(updated.getPhone()).isEqualTo("+56912345678");
        assertThat(updated.getAddress()).isEqualTo("Av. Siempre Viva 123");
        assertThat(updated.getSpecialty()).isEqualTo("Cuidado geriátrico");
        assertThat(updated.getExperience()).isEqualTo("5 años");
        verify(userRepository).save(user);
    }

    @Test
    void updateProfile_allowsKeepingSameEmail() {
        var userId = new UserId(java.util.UUID.randomUUID());
        var user = new User(userId, "Ana", new Email("ana@test.com"), "hashed");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var command = new UpdateProfileUseCase.UpdateProfileCommand(
            "Ana", "ana@test.com", null, null, null, null);

        var updated = sut.execute(userId, command);

        assertThat(updated.getEmail().value()).isEqualTo("ana@test.com");
        verify(userRepository, never()).findByEmail(any());
    }

    @Test
    void updateProfile_throwsWhenEmailUsedByAnotherUser() {
        var userId = new UserId(java.util.UUID.randomUUID());
        var user = new User(userId, "Ana", new Email("ana@test.com"), "hashed");
        var otherUser = new User(new UserId(java.util.UUID.randomUUID()), "Pedro",
            new Email("pedro@test.com"), "hashed2");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.findByEmail("pedro@test.com")).thenReturn(Optional.of(otherUser));

        var command = new UpdateProfileUseCase.UpdateProfileCommand(
            "Ana", "pedro@test.com", null, null, null, null);

        assertThatThrownBy(() -> sut.execute(userId, command))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ya está en uso");
    }
```

Este archivo ya usa `import static org.mockito.Mockito.*;` (cubre `never()`) e
`import static org.assertj.core.api.Assertions.*;` — no hace falta agregar imports.

- [ ] **Step 2: Confirmar que no compila (falta `UpdateProfileUseCase`, falta `sut.execute(userId, command)`)**

Run: `cd backend && mvn test-compile -q -Dtest=AuthServiceTest`
Expected: FAIL — `cannot find symbol: class UpdateProfileUseCase`.

- [ ] **Step 3: Crear el puerto `UpdateProfileUseCase`**

Crear `backend/src/main/java/com/cuidalink/auth/domain/port/in/UpdateProfileUseCase.java`:

```java
package com.cuidalink.auth.domain.port.in;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.auth.domain.model.UserId;

public interface UpdateProfileUseCase {
    User execute(UserId userId, UpdateProfileCommand command);

    record UpdateProfileCommand(String name, String email, String phone, String address,
                                 String specialty, String experience) {}
}
```

- [ ] **Step 4: Agregar los 4 campos y `updateProfile` a `User`**

Reemplazar el contenido completo de
`backend/src/main/java/com/cuidalink/auth/domain/model/User.java`:

```java
package com.cuidalink.auth.domain.model;

public class User {
    private final UserId id;
    private String name;
    private Email email;
    private String passwordHash;
    private FcmToken fcmToken;
    private final UserRole role;
    private String phone;
    private String address;
    private String specialty;
    private String experience;

    public User(UserId id, String name, Email email, String passwordHash) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = UserRole.CAREGIVER;
    }

    public User(UserId id, String name, Email email, String passwordHash, UserRole role) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public void updateFcmToken(FcmToken token) { this.fcmToken = token; }

    public void updateProfile(String name, Email email, String phone, String address,
                               String specialty, String experience) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.specialty = specialty;
        this.experience = experience;
    }

    public UserId getId() { return id; }
    public String getName() { return name; }
    public Email getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public FcmToken getFcmToken() { return fcmToken; }
    public UserRole getRole() { return role; }
    public String getPhone() { return phone; }
    public String getAddress() { return address; }
    public String getSpecialty() { return specialty; }
    public String getExperience() { return experience; }
}
```

Nota: `email` deja de ser `final` porque `updateProfile` lo reasigna.

- [ ] **Step 5: Implementar `UpdateProfileUseCase` en `AuthService`**

En `backend/src/main/java/com/cuidalink/auth/domain/service/AuthService.java`, cambiar la firma de
la clase:

```java
public class AuthService implements RegisterUserUseCase, LoginUserUseCase, UpdateFcmTokenUseCase, UpdateProfileUseCase {
```

Y agregar este método al final de la clase (antes del `}` de cierre):

```java
    @Override
    public User execute(UserId userId, UpdateProfileCommand command) {
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        if (!command.email().equals(user.getEmail().value())) {
            userRepository.findByEmail(command.email()).ifPresent(existing -> {
                if (!existing.getId().equals(userId)) {
                    throw new IllegalStateException("Este correo ya está en uso");
                }
            });
        }
        user.updateProfile(command.name(), new Email(command.email()), command.phone(),
            command.address(), command.specialty(), command.experience());
        return userRepository.save(user);
    }
```

- [ ] **Step 6: Correr los tests y verificar que pasan**

Run: `cd backend && mvn test -Dtest=AuthServiceTest -q`
Expected: BUILD SUCCESS, 7 tests OK (4 existentes + 3 nuevos).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/cuidalink/auth/domain/model/User.java \
        backend/src/main/java/com/cuidalink/auth/domain/port/in/UpdateProfileUseCase.java \
        backend/src/main/java/com/cuidalink/auth/domain/service/AuthService.java \
        backend/src/test/java/com/cuidalink/auth/domain/service/AuthServiceTest.java
git commit -m "feat(backend): add User.updateProfile and UpdateProfileUseCase"
```

---

### Task 2: Backend — persistencia + endpoint `PATCH /auth/me`

**Files:**
- Modify: `backend/src/main/java/com/cuidalink/auth/adapter/out/persistence/UserJpaEntity.java`
- Modify: `backend/src/main/java/com/cuidalink/auth/adapter/out/persistence/JpaUserRepositoryAdapter.java`
- Modify: `backend/src/main/java/com/cuidalink/auth/adapter/in/rest/dto/AuthResponse.java`
- Create: `backend/src/main/java/com/cuidalink/auth/adapter/in/rest/dto/UpdateProfileRequest.java`
- Modify: `backend/src/main/java/com/cuidalink/auth/adapter/in/rest/AuthController.java`
- Modify: `backend/src/test/java/com/cuidalink/auth/adapter/in/rest/AuthControllerTest.java`
- Modify: `backend/src/test/java/com/cuidalink/AuthIntegrationTest.java`

**Interfaces:**
- Consumes: `UpdateProfileUseCase.execute(UserId, UpdateProfileCommand): User` (Task 1).
- Produces: `AuthResponse(String id, String name, String email, String role, String phone, String address, String specialty, String experience)`; endpoint `PATCH /api/v1/auth/me`.

**Nota de entorno:** Docker no está disponible en este entorno — `AuthIntegrationTest`
(`@Testcontainers`) se verifica por compilación (`mvn test-compile`), no por ejecución real. El
usuario deberá correrlo localmente (con Docker) o confiar en CI antes de mergear.

**Nota de diseño de testing:** el endpoint `GET /auth/me` existente nunca tuvo cobertura
`@WebMvcTest` propia (requiere resolver `@AuthenticationPrincipal`, que `AuthControllerTest` no
simula hoy — solo prueba las rutas públicas `register`/`login`). Se mantiene ese mismo límite para
`PATCH /auth/me`: `AuthControllerTest` solo se actualiza para que el contexto de Spring siga
levantando (mock del bean nuevo), sin un test dedicado al endpoint. La cobertura real de
autenticación + endpoint completo vive en los 2 casos nuevos de `AuthIntegrationTest` (Step 8),
igual que la cobertura de `register` ya existente ahí.

- [ ] **Step 1: Agregar las 4 columnas a `UserJpaEntity`**

Reemplazar el contenido completo de
`backend/src/main/java/com/cuidalink/auth/adapter/out/persistence/UserJpaEntity.java`:

```java
package com.cuidalink.auth.adapter.out.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class UserJpaEntity {
    @Id
    private String id;
    private String name;
    @Column(unique = true)
    private String email;
    @Column(name = "password_hash")
    private String passwordHash;
    private String fcmToken;
    private String role;
    private String phone;
    private String address;
    private String specialty;
    private String experience;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getFcmToken() { return fcmToken; }
    public void setFcmToken(String fcmToken) { this.fcmToken = fcmToken; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
}
```

`spring.jpa.hibernate.ddl-auto=update` (ya configurado en `application.properties`) crea las
columnas nuevas solo, mismo patrón que las columnas de `schedule` agregadas en el trabajo de
medicamentos.

- [ ] **Step 2: Mapear los campos nuevos en `JpaUserRepositoryAdapter`**

Reemplazar los métodos `toJpa`/`toDomain` en
`backend/src/main/java/com/cuidalink/auth/adapter/out/persistence/JpaUserRepositoryAdapter.java`:

```java
    private UserJpaEntity toJpa(User u) {
        var e = new UserJpaEntity();
        e.setId(u.getId().value().toString());
        e.setName(u.getName());
        e.setEmail(u.getEmail().value());
        e.setPasswordHash(u.getPasswordHash());
        e.setFcmToken(u.getFcmToken() != null ? u.getFcmToken().value() : null);
        e.setRole(u.getRole().name());
        e.setPhone(u.getPhone());
        e.setAddress(u.getAddress());
        e.setSpecialty(u.getSpecialty());
        e.setExperience(u.getExperience());
        return e;
    }

    private User toDomain(UserJpaEntity e) {
        var user = new User(
            new UserId(UUID.fromString(e.getId())),
            e.getName(),
            new Email(e.getEmail()),
            e.getPasswordHash(),
            UserRole.valueOf(e.getRole())
        );
        if (e.getFcmToken() != null) user.updateFcmToken(new FcmToken(e.getFcmToken()));
        user.updateProfile(e.getName(), new Email(e.getEmail()), e.getPhone(), e.getAddress(),
            e.getSpecialty(), e.getExperience());
        return user;
    }
```

- [ ] **Step 3: Extender `AuthResponse` con los campos nuevos**

Reemplazar el contenido completo de
`backend/src/main/java/com/cuidalink/auth/adapter/in/rest/dto/AuthResponse.java`:

```java
package com.cuidalink.auth.adapter.in.rest.dto;

public record AuthResponse(String id, String name, String email, String role, String phone,
                            String address, String specialty, String experience) {}
```

- [ ] **Step 4: Crear `UpdateProfileRequest`**

Crear `backend/src/main/java/com/cuidalink/auth/adapter/in/rest/dto/UpdateProfileRequest.java`:

```java
package com.cuidalink.auth.adapter.in.rest.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
    @NotBlank String name,
    @Email @NotBlank String email,
    String phone,
    String address,
    String specialty,
    String experience
) {}
```

- [ ] **Step 5: Agregar el endpoint `PATCH /auth/me` a `AuthController`**

Reemplazar el contenido completo de
`backend/src/main/java/com/cuidalink/auth/adapter/in/rest/AuthController.java`:

```java
package com.cuidalink.auth.adapter.in.rest;

import com.cuidalink.auth.adapter.in.rest.dto.*;
import com.cuidalink.auth.domain.model.User;
import com.cuidalink.auth.domain.port.in.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final RegisterUserUseCase registerUseCase;
    private final LoginUserUseCase loginUseCase;
    private final UpdateFcmTokenUseCase fcmTokenUseCase;
    private final UpdateProfileUseCase updateProfileUseCase;

    public AuthController(RegisterUserUseCase r, LoginUserUseCase l, UpdateFcmTokenUseCase f,
                           UpdateProfileUseCase u) {
        this.registerUseCase = r;
        this.loginUseCase = l;
        this.fcmTokenUseCase = f;
        this.updateProfileUseCase = u;
    }

    @PostMapping("/register")
    public ResponseEntity<TokenResponse> register(@Validated @RequestBody RegisterRequest req) {
        String token = registerUseCase.execute(
            new RegisterUserUseCase.RegisterUserCommand(req.name(), req.email(), req.password()));
        return ResponseEntity.ok(new TokenResponse(token));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Validated @RequestBody LoginRequest req) {
        String token = loginUseCase.login(req.email(), req.password());
        return ResponseEntity.ok(new TokenResponse(token));
    }

    @PostMapping("/fcm-token")
    public ResponseEntity<Void> updateFcmToken(@AuthenticationPrincipal User user,
                                                @Validated @RequestBody FcmTokenRequest req) {
        fcmTokenUseCase.update(user.getId(), req.token());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(toResponse(user));
    }

    @PatchMapping("/me")
    public ResponseEntity<AuthResponse> updateMe(@AuthenticationPrincipal User user,
                                                  @Validated @RequestBody UpdateProfileRequest req) {
        var updated = updateProfileUseCase.execute(user.getId(),
            new UpdateProfileUseCase.UpdateProfileCommand(
                req.name(), req.email(), req.phone(), req.address(), req.specialty(), req.experience()));
        return ResponseEntity.ok(toResponse(updated));
    }

    private AuthResponse toResponse(User u) {
        return new AuthResponse(u.getId().value().toString(), u.getName(), u.getEmail().value(),
            u.getRole().name(), u.getPhone(), u.getAddress(), u.getSpecialty(), u.getExperience());
    }
}
```

Nota: se removieron los `System.out.println` de depuración de `register`/`login` — eran ruido de
debug, no afectan comportamiento.

- [ ] **Step 6: Actualizar `AuthControllerTest` con el mock nuevo**

En `backend/src/test/java/com/cuidalink/auth/adapter/in/rest/AuthControllerTest.java`, agregar
este campo junto a los otros `@MockBean` (después de `UpdateFcmTokenUseCase fcmTokenUseCase;`):

```java
    @MockBean
    UpdateProfileUseCase updateProfileUseCase;
```

Esto es obligatorio: `AuthController` ahora requiere 4 dependencias en su constructor, y
`@WebMvcTest` fallará al levantar el contexto si falta el mock del bean nuevo.

- [ ] **Step 7: Correr los tests existentes del controller (deben seguir pasando)**

Run: `cd backend && mvn test -Dtest=AuthControllerTest -q`
Expected: BUILD SUCCESS, 2 tests OK.

- [ ] **Step 8: Agregar casos de integración para `PATCH /auth/me`**

En `backend/src/test/java/com/cuidalink/AuthIntegrationTest.java`, agregar el import:

```java
import com.cuidalink.auth.adapter.in.rest.dto.AuthResponse;
```

Y agregar estos 2 tests al final de la clase (antes del `}` de cierre):

```java
    @Test
    void updateProfile_persistsChangesAndReflectsInMe() {
        var registerReq = new RegisterRequest("Carla Soto", "carla@integration.com", "password123");
        ResponseEntity<TokenResponse> registerResponse = restTemplate.postForEntity(
            "/api/v1/auth/register", registerReq, TokenResponse.class);
        String token = registerResponse.getBody().token();

        var headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        var patchBody = """
            {"name":"Carla Soto Pérez","email":"carla@integration.com","phone":"+56912345678",
             "address":"Av. Siempre Viva 123","specialty":"Cuidado geriátrico","experience":"5 años"}
            """;
        var patchEntity = new HttpEntity<>(patchBody, headers);

        ResponseEntity<AuthResponse> patchResponse = restTemplate.exchange(
            "/api/v1/auth/me", HttpMethod.PATCH, patchEntity, AuthResponse.class);

        assertThat(patchResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(patchResponse.getBody().phone()).isEqualTo("+56912345678");
        assertThat(patchResponse.getBody().specialty()).isEqualTo("Cuidado geriátrico");

        var getEntity = new HttpEntity<>(headers);
        ResponseEntity<AuthResponse> getResponse = restTemplate.exchange(
            "/api/v1/auth/me", HttpMethod.GET, getEntity, AuthResponse.class);
        assertThat(getResponse.getBody().address()).isEqualTo("Av. Siempre Viva 123");
    }

    @Test
    void updateProfile_duplicateEmail_returns409() {
        restTemplate.postForEntity("/api/v1/auth/register",
            new RegisterRequest("Usuario Uno", "uno@integration.com", "password123"), TokenResponse.class);
        var registerTwo = restTemplate.postForEntity("/api/v1/auth/register",
            new RegisterRequest("Usuario Dos", "dos@integration.com", "password123"), TokenResponse.class);
        String tokenTwo = registerTwo.getBody().token();

        var headers = new HttpHeaders();
        headers.setBearerAuth(tokenTwo);
        headers.setContentType(MediaType.APPLICATION_JSON);
        var patchBody = """
            {"name":"Usuario Dos","email":"uno@integration.com"}
            """;
        var patchEntity = new HttpEntity<>(patchBody, headers);

        ResponseEntity<Object> response = restTemplate.exchange(
            "/api/v1/auth/me", HttpMethod.PATCH, patchEntity, Object.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }
```

- [ ] **Step 9: Verificar que todo compila (el nuevo test de integración no se ejecuta aquí)**

Run: `cd backend && mvn test-compile -q`
Expected: BUILD SUCCESS, sin errores de compilación.

- [ ] **Step 10: Correr la suite completa excepto los tests de integración**

Run: `cd backend && mvn test -Dtest='!*IntegrationTest' -q`
Expected: BUILD SUCCESS.

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/java/com/cuidalink/auth/adapter/out/persistence/UserJpaEntity.java \
        backend/src/main/java/com/cuidalink/auth/adapter/out/persistence/JpaUserRepositoryAdapter.java \
        backend/src/main/java/com/cuidalink/auth/adapter/in/rest/dto/AuthResponse.java \
        backend/src/main/java/com/cuidalink/auth/adapter/in/rest/dto/UpdateProfileRequest.java \
        backend/src/main/java/com/cuidalink/auth/adapter/in/rest/AuthController.java \
        backend/src/test/java/com/cuidalink/auth/adapter/in/rest/AuthControllerTest.java \
        backend/src/test/java/com/cuidalink/AuthIntegrationTest.java
git commit -m "feat(backend): expose profile fields via PATCH /auth/me"
```

---

### Task 3: Mobile — `User` entity + `AuthRepository.updateProfile`

**Files:**
- Modify: `appmovil/src/domain/entities/User.ts`
- Modify: `appmovil/src/domain/repositories/AuthRepository.ts`
- Modify: `appmovil/src/data/repositories/ApiAuthRepository.ts`

**Interfaces:**
- Produces: `User { id, name, email, role: 'CAREGIVER', phone?, address?, specialty?, experience? }`; `AuthRepository.updateProfile(data): Promise<User>`.

No hay convención de test para `data/repositories/*.ts` en este repo (ya establecido en un plan
anterior) — se verifica con `tsc --noEmit` + la suite completa.

- [ ] **Step 1: Extender `User.ts`**

Reemplazar el contenido completo de `appmovil/src/domain/entities/User.ts`:

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

- [ ] **Step 2: Agregar `updateProfile` a `AuthRepository`**

Reemplazar el contenido completo de `appmovil/src/domain/repositories/AuthRepository.ts`:

```typescript
import { User } from '@/domain/entities';

export type UpdateProfileData = {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  specialty?: string | null;
  experience?: string | null;
};

export interface AuthRepository {
  loginWithEmail(email: string, password: string): Promise<User>;
  register(name: string, email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  getMe(): Promise<User>;
  updateFcmToken(token: string): Promise<void>;
  updateProfile(data: UpdateProfileData): Promise<User>;
}
```

- [ ] **Step 3: Implementar `updateProfile` en `ApiAuthRepository`**

En `appmovil/src/data/repositories/ApiAuthRepository.ts`, agregar el import y el método:

```typescript
import { AuthRepository, UpdateProfileData } from '@/domain/repositories/AuthRepository';
```

(reemplaza el import existente `import { AuthRepository } from '@/domain/repositories/AuthRepository';`)

Y agregar este método a la clase, después de `getMe`:

```typescript
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const res = await apiClient.patch<User>('/auth/me', data);
    return res.data;
  }
```

- [ ] **Step 4: Verificar tipos y suite completa**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

Run: `cd appmovil && npx jest`
Expected: todos los tests en PASS (este cambio solo agrega campos opcionales/un método nuevo, no
debería romper nada existente).

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/domain/entities/User.ts \
        appmovil/src/domain/repositories/AuthRepository.ts \
        appmovil/src/data/repositories/ApiAuthRepository.ts
git commit -m "feat(appmovil): add profile fields to User and updateProfile to AuthRepository"
```

---

### Task 4: Mobile — Rediseñar `ProfileScreen.tsx`

**Files:**
- Modify: `appmovil/src/presentation/screens/profile/ProfileScreen.tsx`
- Modify: `appmovil/src/presentation/navigation/AppNavigator.tsx`
- Test: `appmovil/src/presentation/screens/profile/__tests__/ProfileScreen.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `User` con los campos de Task 3; `AuthRepository.logout()` (ya existente).
- Produces: navega a `'EditProfile'` (sin params) y a `'ComingSoon'` (`{ title, subtitle }`, ya
  existente). Task 5 registra el `Stack.Screen` real de `EditProfile`.

- [ ] **Step 1: Agregar el tipo de ruta `EditProfile` y ocultar el header nativo de `Perfil`**

En `appmovil/src/presentation/navigation/AppNavigator.tsx`, en el tipo `PatientStackParams`,
agregar una línea después de `Today: undefined;`:

```typescript
  Today: undefined;
  EditProfile: undefined;
```

Y cambiar la línea del `Stack.Screen` de `Perfil`:

```typescript
      <Stack.Screen name="Perfil" component={ProfileScreen} options={{ title: 'Perfil' }} />
```

por:

```typescript
      <Stack.Screen name="Perfil" component={ProfileScreen} options={{ headerShown: false }} />
```

(La entrada `<Stack.Screen name="EditProfile" .../>` se agrega en la Task 5, cuando la pantalla
existe. El tipo ya declarado aquí es suficiente para que `ProfileScreen` compile en esta tarea.)

- [ ] **Step 2: Escribir el test que falla**

Crear `appmovil/src/presentation/screens/profile/__tests__/ProfileScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfileScreen from '../ProfileScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const logout = jest.fn().mockResolvedValue(undefined);
  mockedUseInjection.mockReturnValue({ authRepo: { logout } });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ProfileScreen navigation={navigation} />
    </QueryClientProvider>
  );
  return { navigation, logout };
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1', name: 'Manuel Vera', email: 'manuel.vera@email.com', role: 'CAREGIVER',
        phone: '+56912345678', address: 'Av. Los Leones 1234, Piso 5',
        specialty: 'Cuidado de adultos mayores', experience: '5 años',
      },
    });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('muestra los datos personales del cuidador', () => {
    renderScreen();
    expect(screen.getByText('Manuel Vera')).toBeTruthy();
    expect(screen.getByText('Cuidador')).toBeTruthy();
    expect(screen.getByText('manuel.vera@email.com')).toBeTruthy();
    expect(screen.getByText('+56912345678')).toBeTruthy();
    expect(screen.getByText('Av. Los Leones 1234, Piso 5')).toBeTruthy();
    expect(screen.getByText('Cuidado de adultos mayores')).toBeTruthy();
    expect(screen.getByText('5 años')).toBeTruthy();
  });

  it('muestra "No especificado" cuando faltan campos', () => {
    useAuthStore.setState({
      user: { id: 'u1', name: 'Manuel Vera', email: 'manuel.vera@email.com', role: 'CAREGIVER' },
    });
    renderScreen();
    expect(screen.getAllByText('No especificado').length).toBe(4);
  });

  it('el botón Editar navega a EditProfile', () => {
    const { navigation } = renderScreen();
    fireEvent.press(screen.getByText('Editar'));
    expect(navigation.navigate).toHaveBeenCalledWith('EditProfile');
  });

  it('las filas de configuración navegan a ComingSoon', () => {
    const { navigation } = renderScreen();
    fireEvent.press(screen.getByText('Cambiar contraseña'));
    expect(navigation.navigate).toHaveBeenCalledWith('ComingSoon', {
      title: 'Cambiar contraseña', subtitle: 'Configuración de seguridad',
    });

    fireEvent.press(screen.getByText('Notificaciones'));
    expect(navigation.navigate).toHaveBeenCalledWith('ComingSoon', {
      title: 'Notificaciones', subtitle: 'Preferencias de notificación',
    });
  });

  it('cierra sesión al presionar Cerrar sesión', async () => {
    const { logout } = renderScreen();
    fireEvent.press(screen.getByText('Cerrar sesión'));
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(useAuthStore.getState().user).toBeNull();
  });
});
```

- [ ] **Step 3: Confirmar que falla**

Run: `cd appmovil && npx jest --testPathPattern=profile/__tests__/ProfileScreen.test.tsx`
Expected: FAIL (el `ProfileScreen` actual no tiene ninguno de estos textos/comportamientos).

- [ ] **Step 4: Reescribir `ProfileScreen.tsx`**

Reemplazar el contenido completo de
`appmovil/src/presentation/screens/profile/ProfileScreen.tsx`:

```tsx
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useAuthStore } from '@/presentation/stores/authStore';
import { useInjection } from '@/presentation/hooks/useInjection';
import ScreenBackground from '@/presentation/components/ScreenBackground';

const ROLE_LABELS: Record<string, string> = { CAREGIVER: 'Cuidador' };

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Perfil'>;
};

type ProfileFieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null | undefined;
  onPress: () => void;
};

function ProfileField({ icon, label, value, onPress }: ProfileFieldProps) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldLeft}>
        <Ionicons name={icon} size={18} color="#5ee7df" />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={styles.fieldDivider} />
      <Text style={styles.fieldValue} numberOfLines={2}>{value || 'No especificado'}</Text>
      <TouchableOpacity onPress={onPress} hitSlop={8}>
        <Ionicons name="create-outline" size={18} color="#7dd3fc" />
      </TouchableOpacity>
    </View>
  );
}

type ConfigRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function ConfigRow({ icon, label, onPress }: ConfigRowProps) {
  return (
    <TouchableOpacity style={styles.configRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.configIconCircle}>
        <Ionicons name={icon} size={18} color="#5ee7df" />
      </View>
      <Text style={styles.configLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#7dd3fc" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { authRepo } = useInjection();
  const queryClient = useQueryClient();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await authRepo.logout();
      queryClient.clear();
      setUser(null);
    } catch {
      Alert.alert('Error', 'No se pudo cerrar sesión.');
    } finally {
      setLogoutLoading(false);
    }
  };

  function goToEdit() {
    navigation.navigate('EditProfile');
  }

  function goToComingSoon(title: string, subtitle: string) {
    navigation.navigate('ComingSoon', { title, subtitle });
  }

  if (!user) return null;

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerLogoRow}>
            <Image
              source={require('../../../../assets/cuidalink-icon.png')}
              style={styles.headerLogoIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>
              <Text style={styles.headerCuida}>Cuida</Text>
              <Text style={styles.headerLink}>Link</Text>
            </Text>
          </View>
          <View style={styles.backButtonSpacer} />
        </View>

        <Text style={styles.title}>Perfil del cuidador</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color="rgba(255,255,255,0.85)" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#5ee7df" />
              <Text style={styles.roleBadgeText}>{ROLE_LABELS[user.role] ?? user.role}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={goToEdit}>
            <Ionicons name="create-outline" size={16} color="#ff8a80" />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={18} color="#5ee7df" />
          <Text style={styles.sectionTitle}>Datos personales</Text>
        </View>

        <ProfileField icon="person-outline" label="Nombre" value={user.name} onPress={goToEdit} />
        <ProfileField icon="mail-outline" label="Correo electrónico" value={user.email} onPress={goToEdit} />
        <ProfileField icon="call-outline" label="Teléfono" value={user.phone} onPress={goToEdit} />
        <ProfileField icon="location-outline" label="Dirección" value={user.address} onPress={goToEdit} />
        <ProfileField icon="medkit-outline" label="Especialidad" value={user.specialty} onPress={goToEdit} />
        <ProfileField icon="star-outline" label="Experiencia" value={user.experience} onPress={goToEdit} />

        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={18} color="#5ee7df" />
          <Text style={styles.sectionTitle}>Configuración</Text>
        </View>

        <ConfigRow
          icon="lock-closed-outline"
          label="Cambiar contraseña"
          onPress={() => goToComingSoon('Cambiar contraseña', 'Configuración de seguridad')}
        />
        <ConfigRow
          icon="notifications-outline"
          label="Notificaciones"
          onPress={() => goToComingSoon('Notificaciones', 'Preferencias de notificación')}
        />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={logoutLoading}>
          {logoutLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  backButtonSpacer: { width: 44 },
  headerLogoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerLogoIcon: { width: 32, height: 32 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  headerCuida: { color: '#fff' },
  headerLink: { color: '#38bdf8' },

  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    padding: 20, marginBottom: 28, gap: 16,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(148,180,204,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: '#5ee7df', backgroundColor: 'rgba(94,231,223,0.12)',
  },
  roleBadgeText: { color: '#5ee7df', fontWeight: 'bold', fontSize: 12 },
  editButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,138,128,0.5)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  editButtonText: { color: '#ff8a80', fontWeight: 'bold', fontSize: 13 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#5ee7df' },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12,
  },
  fieldLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 100 },
  fieldLabel: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  fieldDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.18)' },
  fieldValue: { flex: 1, color: '#fff', fontSize: 14 },

  configRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12,
  },
  configIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(94,231,223,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  configLabel: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16, marginTop: 8,
  },
  logoutButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
```

- [ ] **Step 5: Correr el test de esta pantalla y verificar que pasa**

Run: `cd appmovil && npx jest --testPathPattern=profile/__tests__/ProfileScreen.test.tsx`
Expected: PASS, 5/5 tests.

- [ ] **Step 6: Verificar tipos y la suite completa**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

Run: `cd appmovil && npx jest`
Expected: todos los tests en PASS.

- [ ] **Step 7: Commit**

```bash
git add appmovil/src/presentation/screens/profile/ProfileScreen.tsx \
        appmovil/src/presentation/screens/profile/__tests__/ProfileScreen.test.tsx \
        appmovil/src/presentation/navigation/AppNavigator.tsx
git commit -m "feat(appmovil): redesign ProfileScreen to match caregiver profile mockup"
```

---

### Task 5: Mobile — `EditProfileScreen.tsx` + navegación

**Files:**
- Create: `appmovil/src/presentation/screens/profile/EditProfileScreen.tsx`
- Modify: `appmovil/src/presentation/navigation/AppNavigator.tsx`
- Test: `appmovil/src/presentation/screens/profile/__tests__/EditProfileScreen.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `AuthRepository.updateProfile(data): Promise<User>` (Task 3); ruta `EditProfile:
  undefined` ya declarada en `PatientStackParams` (Task 4); `stripChilePrefix`, `toChilePhone`,
  `isValidChileSubscriberNumber` de `@/domain/utils/chilePhone` (ya existentes).

- [ ] **Step 1: Escribir el test que falla**

Crear `appmovil/src/presentation/screens/profile/__tests__/EditProfileScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import EditProfileScreen from '../EditProfileScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const updateProfile = jest.fn().mockResolvedValue({
    id: 'u1', name: 'Manuel Vera', email: 'manuel.vera@email.com', role: 'CAREGIVER',
    phone: '+56912345678', address: 'Nueva dirección', specialty: 'Cuidado de adultos mayores',
    experience: '5 años',
  });
  mockedUseInjection.mockReturnValue({ authRepo: { updateProfile } });

  render(<EditProfileScreen navigation={navigation} />);
  return { navigation, updateProfile };
}

describe('EditProfileScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1', name: 'Manuel Vera', email: 'manuel.vera@email.com', role: 'CAREGIVER',
        phone: '+56912345678', address: 'Av. Los Leones 1234',
        specialty: 'Cuidado de adultos mayores', experience: '5 años',
      },
    });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('precarga los datos actuales del usuario', () => {
    renderScreen();
    expect(screen.getByDisplayValue('Manuel Vera')).toBeTruthy();
    expect(screen.getByDisplayValue('manuel.vera@email.com')).toBeTruthy();
    expect(screen.getByDisplayValue('912345678')).toBeTruthy();
    expect(screen.getByDisplayValue('Av. Los Leones 1234')).toBeTruthy();
  });

  it('muestra error si el nombre queda vacío', async () => {
    renderScreen();
    fireEvent.changeText(screen.getByDisplayValue('Manuel Vera'), '');
    fireEvent.press(screen.getByText('Guardar Cambios'));
    expect(await screen.findByText('El nombre debe tener al menos 2 caracteres')).toBeTruthy();
  });

  it('guarda exitosamente, actualiza el store y navega atrás', async () => {
    const { updateProfile, navigation } = renderScreen();

    fireEvent.changeText(screen.getByDisplayValue('Av. Los Leones 1234'), 'Nueva dirección');
    fireEvent.press(screen.getByText('Guardar Cambios'));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({
      name: 'Manuel Vera',
      email: 'manuel.vera@email.com',
      phone: '+56912345678',
      address: 'Nueva dirección',
      specialty: 'Cuidado de adultos mayores',
      experience: '5 años',
    }));
    expect(navigation.goBack).toHaveBeenCalled();
    expect(useAuthStore.getState().user?.address).toBe('Nueva dirección');
  });

  it('muestra una alerta específica cuando el correo ya está en uso (409)', async () => {
    const updateProfile = jest.fn().mockRejectedValue({
      isAxiosError: true, response: { status: 409 },
    });
    mockedUseInjection.mockReturnValue({ authRepo: { updateProfile } });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

    render(<EditProfileScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as any} />);
    fireEvent.press(screen.getByText('Guardar Cambios'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'Este correo ya está en uso.'));
  });

  it('muestra una alerta genérica para otros errores', async () => {
    const updateProfile = jest.fn().mockRejectedValue(new Error('network'));
    mockedUseInjection.mockReturnValue({ authRepo: { updateProfile } });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

    render(<EditProfileScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as any} />);
    fireEvent.press(screen.getByText('Guardar Cambios'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo actualizar el perfil.'));
  });
});
```

- [ ] **Step 2: Confirmar que falla**

Run: `cd appmovil && npx jest --testPathPattern=profile/__tests__/EditProfileScreen.test.tsx`
Expected: FAIL (el archivo `EditProfileScreen.tsx` no existe).

- [ ] **Step 3: Crear `EditProfileScreen.tsx`**

Crear `appmovil/src/presentation/screens/profile/EditProfileScreen.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { isValidChileSubscriberNumber, stripChilePrefix, toChilePhone } from '@/domain/utils/chilePhone';
import ScreenBackground from '@/presentation/components/ScreenBackground';

const schema = z.object({
  name: z.string({ error: 'Nombre requerido' }).min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string({ error: 'Correo requerido' }).min(1, 'Correo requerido').email('Correo inválido'),
  phone: z.string().optional().refine(
    (v) => !v || isValidChileSubscriberNumber(v),
    'Ingresa los 9 dígitos del celular, sin el +56'
  ),
  address: z.string().optional(),
  specialty: z.string().optional(),
  experience: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'EditProfile'>;
};

export default function EditProfileScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const { authRepo } = useInjection();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ? stripChilePrefix(user.phone) : '',
      address: user?.address ?? '',
      specialty: user?.specialty ?? '',
      experience: user?.experience ?? '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const updated = await authRepo.updateProfile({
        name: data.name,
        email: data.email,
        phone: data.phone ? toChilePhone(data.phone) : null,
        address: data.address || null,
        specialty: data.specialty || null,
        experience: data.experience || null,
      });
      setUser(updated);
      navigation.goBack();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        Alert.alert('Error', 'Este correo ya está en uso.');
      } else {
        Alert.alert('Error', 'No se pudo actualizar el perfil.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.sheet}>
          <Text style={styles.sectionTitle}>Datos personales</Text>

          <Text style={styles.label}>Nombre completo *</Text>
          <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
            <TextInput style={[styles.input, errors.name && styles.inputError]}
              placeholder="Ej: Manuel Vera" value={value} onChangeText={onChange} />
          )} />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

          <Text style={styles.label}>Correo electrónico *</Text>
          <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
            <TextInput style={[styles.input, errors.email && styles.inputError]}
              placeholder="Ej: manuel.vera@email.com" autoCapitalize="none" keyboardType="email-address"
              value={value} onChangeText={onChange} />
          )} />
          {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

          <Text style={styles.label}>Teléfono</Text>
          <View style={[styles.input, styles.phoneRow, errors.phone && styles.inputError]}>
            <Text style={styles.phonePrefix}>🇨🇱 +56</Text>
            <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
              <TextInput style={styles.phoneInput}
                placeholder="912345678" keyboardType="number-pad" maxLength={9}
                value={value} onChangeText={(text) => onChange(text.replace(/\D/g, ''))} />
            )} />
          </View>
          {errors.phone && <Text style={styles.error}>{errors.phone.message}</Text>}

          <Text style={styles.label}>Dirección</Text>
          <Controller control={control} name="address" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input}
              placeholder="Ej: Av. Providencia 123, Santiago" value={value} onChangeText={onChange} />
          )} />

          <Text style={styles.label}>Especialidad</Text>
          <Controller control={control} name="specialty" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input}
              placeholder="Ej: Cuidado de adultos mayores" value={value} onChangeText={onChange} />
          )} />

          <Text style={styles.label}>Experiencia</Text>
          <Controller control={control} name="experience" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input}
              placeholder="Ej: 5 años" value={value} onChangeText={onChange} />
          )} />

          <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar Cambios</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 24, paddingBottom: 48 },
  sheet: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D7DD2', marginTop: 4, marginBottom: 8 },
  label: { fontSize: 14, color: '#444', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, justifyContent: 'center', minHeight: 48 },
  inputError: { borderColor: '#e53e3e' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', padding: 0, paddingLeft: 12 },
  phonePrefix: { fontSize: 16, color: '#333', marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 16, padding: 12 },
  error: { color: '#e53e3e', fontSize: 12, marginTop: 2 },
  button: { backgroundColor: '#2D7DD2', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
```

- [ ] **Step 4: Registrar la ruta `EditProfile` en `AppNavigator`**

En `appmovil/src/presentation/navigation/AppNavigator.tsx`, agregar el import junto a los demás:

```typescript
import EditProfileScreen from '@/presentation/screens/profile/EditProfileScreen';
```

Y agregar el `Stack.Screen` después de la línea de `Perfil`:

```typescript
      <Stack.Screen name="Perfil" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Editar Perfil' }} />
```

- [ ] **Step 5: Correr el test de esta pantalla y verificar que pasa**

Run: `cd appmovil && npx jest --testPathPattern=profile/__tests__/EditProfileScreen.test.tsx`
Expected: PASS, 5/5 tests.

- [ ] **Step 6: Verificar tipos y la suite completa**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

Run: `cd appmovil && npx jest`
Expected: todos los tests en PASS.

- [ ] **Step 7: Commit**

```bash
git add appmovil/src/presentation/screens/profile/EditProfileScreen.tsx \
        appmovil/src/presentation/screens/profile/__tests__/EditProfileScreen.test.tsx \
        appmovil/src/presentation/navigation/AppNavigator.tsx
git commit -m "feat(appmovil): add EditProfileScreen and wire EditProfile route"
```

---

## Verificación final

- Backend: `mvn test -Dtest='!*IntegrationTest' -q` limpio; `mvn test-compile -q` limpio (incluye
  `AuthIntegrationTest` con los 2 casos nuevos, no ejecutables aquí por falta de Docker).
- Mobile: `npx tsc --noEmit` y `npx jest` limpios (12 → 14 suites: 2 nuevas de `profile/`).
- Manual (para el usuario, con Docker + Expo corriendo): abrir Perfil desde Inicio → Perfil,
  comparar contra el mockup, tocar "Editar" o cualquier lápiz, cambiar datos, guardar, confirmar
  que persisten al reabrir la app (logout/login).
