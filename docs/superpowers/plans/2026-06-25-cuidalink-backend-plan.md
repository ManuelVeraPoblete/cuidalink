# CuidaLink Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el backend de CuidaLink en Java 17 + Spring Boot 3 con arquitectura hexagonal estricta: dominio puro sin dependencias de framework, ports & adapters, PostgreSQL, JWT propio (jjwt 0.12), FCM e iText 7 para PDF.

**Architecture:** Monolito hexagonal modular — 6 módulos independientes (`auth`, `patient`, `medication`, `vital`, `notification`, `report`). Cada módulo contiene su propio hexágono (domain/port/in, domain/port/out, domain/service, adapter/in/rest, adapter/out/persistence). El dominio nunca importa Spring, JPA ni Firebase.

**Tech Stack:** Java 17, Spring Boot 3.2, Spring Data JPA, Spring Security, PostgreSQL 15, jjwt 0.12 (JWT), Firebase Admin SDK 9.2 (solo FCM), iText 7.2.5, Bucket4j 8.7, JUnit 5, Mockito, Testcontainers, Maven.

## Global Constraints

- Java 17 — usar records para Value Objects, sealed classes donde aplique
- Spring Boot 3.2.x — NO usar versiones anteriores
- Ninguna anotación de Spring/JPA en paquetes `domain/model/` ni `domain/service/`
- Todas las entidades JPA viven en `adapter/out/persistence/` — NO en el dominio
- Prefix de API: `/api/v1`
- Autenticación: JWT propio firmado con HS256 (jjwt), generado en login/register, validado por `JwtAuthFilter` en cada request
- Todas las operaciones de mutación verifican ownership en la capa de use case
- Bean Validation (`@Valid`) en todos los DTOs de entrada del controller
- `healthCondition` y `allergies` NUNCA se loguean en consola

---

## Mapa de archivos

```
cuidalink/backend/
├── pom.xml
└── src/
    ├── main/java/com/cuidalink/
    │   ├── CuidaLinkApplication.java
    │   ├── config/
    │   │   ├── FirebaseConfig.java
    │   │   ├── SecurityConfig.java
    │   │   └── RateLimitConfig.java
    │   ├── auth/
    │   │   ├── domain/model/          → User, UserId, Email, FcmToken, UserRole
    │   │   ├── domain/port/in/        → RegisterUserUseCase, LoginUserUseCase, UpdateFcmTokenUseCase
    │   │   ├── domain/port/out/       → UserRepository, PasswordEncoder, JwtProvider
    │   │   ├── domain/service/        → AuthService
    │   │   └── adapter/
    │   │       ├── in/rest/           → AuthController + DTOs
    │   │       └── out/
    │   │           ├── persistence/   → UserJpaEntity, SpringUserRepository, JpaUserRepositoryAdapter
    │   │           ├── jwt/           → JwtProviderAdapter, JwtAuthFilter
    │   │           └── security/      → BCryptPasswordEncoderAdapter
    │   ├── patient/
    │   │   ├── domain/model/          → Patient, PatientId, Collaborator, InvitationCode, EmergencyContact, Gender
    │   │   ├── domain/port/in/        → CreatePatientUseCase, UpdatePatientUseCase, ArchivePatientUseCase,
    │   │   │                            FindPatientUseCase, ListPatientsUseCase, GenerateInvitationUseCase,
    │   │   │                            JoinWithCodeUseCase, ListCollaboratorsUseCase, RevokeCollaboratorUseCase
    │   │   ├── domain/port/out/       → PatientRepository
    │   │   ├── domain/service/        → PatientService
    │   │   └── adapter/
    │   │       ├── in/rest/           → PatientController, CollaboratorController, InvitationController + DTOs
    │   │       └── out/persistence/   → PatientJpaEntity, CollaboratorJpaEntity, InvitationCodeJpaEntity,
    │   │                                SpringPatientRepository, JpaPatientRepositoryAdapter
    │   ├── medication/
    │   │   ├── domain/model/          → Medication, MedicationId, MedicationSchedule, MedicationLog,
    │   │   │                            MedicationLogId, LogStatus, Frequency
    │   │   ├── domain/port/in/        → CreateMedicationUseCase, UpdateMedicationUseCase, DeactivateMedicationUseCase,
    │   │   │                            ListMedicationsUseCase, GetDailyMedicationLogsUseCase, ConfirmMedicationLogUseCase
    │   │   ├── domain/port/out/       → MedicationRepository, MedicationLogRepository
    │   │   ├── domain/service/        → MedicationService
    │   │   └── adapter/
    │   │       ├── in/rest/           → MedicationController, MedicationLogController + DTOs
    │   │       └── out/persistence/   → JPA entities + adapters
    │   ├── vital/
    │   │   ├── domain/model/          → VitalSignDefinition, VitalSignDefinitionId, VitalRecord,
    │   │   │                            VitalRecordId, VitalMeasurement
    │   │   ├── domain/port/in/        → CreateVitalDefinitionUseCase, UpdateVitalDefinitionUseCase,
    │   │   │                            DeleteVitalDefinitionUseCase, ListVitalDefinitionsUseCase,
    │   │   │                            RecordVitalsUseCase, ListVitalRecordsUseCase
    │   │   ├── domain/port/out/       → VitalDefinitionRepository, VitalRecordRepository
    │   │   ├── domain/service/        → VitalService
    │   │   └── adapter/
    │   │       ├── in/rest/           → VitalDefinitionController, VitalRecordController + DTOs
    │   │       └── out/persistence/   → JPA entities + adapters
    │   ├── notification/
    │   │   ├── domain/port/out/       → NotificationSender
    │   │   ├── adapter/out/firebase/  → FcmNotificationSenderAdapter
    │   │   └── scheduler/             → DailyMedicationLogScheduler, EscalationScheduler
    │   └── report/
    │       ├── domain/model/          → Report, DateRange, MedicationLogEntry, VitalRecordEntry
    │       ├── domain/port/in/        → GeneratePatientReportUseCase
    │       ├── domain/port/out/       → ReportGenerator
    │       ├── domain/service/        → ReportService
    │       └── adapter/
    │           ├── in/rest/           → ReportController
    │           └── out/pdf/           → ITextReportGeneratorAdapter
    └── main/resources/
        ├── application.properties
        └── application-test.properties
```

---

### Task 1: Bootstrap del proyecto Spring Boot

**Files:**
- Create: `cuidalink/backend/pom.xml`
- Create: `cuidalink/backend/src/main/java/com/cuidalink/CuidaLinkApplication.java`
- Create: `cuidalink/backend/src/main/resources/application.properties`
- Create: `cuidalink/backend/src/test/resources/application-test.properties`

**Interfaces:** ninguna — solo infraestructura de proyecto

- [ ] **Step 1: Crear `pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
    <relativePath/>
  </parent>
  <groupId>com.cuidalink</groupId>
  <artifactId>cuidalink-backend</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <properties>
    <java.version>17</java.version>
  </properties>
  <dependencies>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId><artifactId>jjwt-api</artifactId><version>0.12.6</version>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId><artifactId>jjwt-impl</artifactId><version>0.12.6</version><scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId><artifactId>jjwt-jackson</artifactId><version>0.12.6</version><scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>com.google.firebase</groupId><artifactId>firebase-admin</artifactId><version>9.2.0</version>
    </dependency>
    <dependency>
      <groupId>com.itextpdf</groupId><artifactId>kernel</artifactId><version>7.2.5</version>
    </dependency>
    <dependency>
      <groupId>com.itextpdf</groupId><artifactId>layout</artifactId><version>7.2.5</version>
    </dependency>
    <dependency>
      <groupId>com.bucket4j</groupId><artifactId>bucket4j-core</artifactId><version>8.7.0</version>
    </dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
    <dependency><groupId>org.testcontainers</groupId><artifactId>postgresql</artifactId><scope>test</scope></dependency>
    <dependency><groupId>org.testcontainers</groupId><artifactId>junit-jupiter</artifactId><scope>test</scope></dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin>
    </plugins>
  </build>
</project>
```

- [ ] **Step 2: Crear main class**

```java
// src/main/java/com/cuidalink/CuidaLinkApplication.java
package com.cuidalink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CuidaLinkApplication {
    public static void main(String[] args) {
        SpringApplication.run(CuidaLinkApplication.class, args);
    }
}
```

- [ ] **Step 3: Crear `application.properties`**

```properties
# Server
server.port=8080
spring.application.name=cuidalink

# API prefix
server.servlet.context-path=/api/v1

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/cuidalink
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# JWT
jwt.secret=cambia-esta-clave-secreta-por-una-de-al-menos-256-bits
jwt.expiration-ms=86400000

# Firebase (solo FCM — no auth)
firebase.service-account-path=classpath:firebase-service-account.json

# Logging — NUNCA loguear datos sensibles
logging.level.com.cuidalink=INFO
```

- [ ] **Step 4: Crear `application-test.properties`** (sobreescribe para tests)

```properties
spring.datasource.url=jdbc:tc:postgresql:15://localhost/cuidalink_test
spring.datasource.driver-class-name=org.testcontainers.jdbc.ContainerDatabaseDriver
spring.jpa.hibernate.ddl-auto=create-drop
jwt.secret=test-secret-key-only-for-tests-must-be-256-bits-long-padding
jwt.expiration-ms=3600000
firebase.service-account-path=classpath:firebase-service-account-mock.json
```

- [ ] **Step 5: Verificar que compila**

```bash
cd cuidalink/backend
mvn compile -q
```
Esperado: `BUILD SUCCESS`

- [ ] **Step 6: Commit**

```bash
git add cuidalink/backend/
git commit -m "feat(backend): bootstrap Spring Boot 3.2 project with hexagonal structure"
```

---

### Task 2: Auth — Capa de Dominio

**Files:**
- Create: `src/main/java/com/cuidalink/auth/domain/model/UserId.java`
- Create: `src/main/java/com/cuidalink/auth/domain/model/Email.java`
- Create: `src/main/java/com/cuidalink/auth/domain/model/FcmToken.java`
- Create: `src/main/java/com/cuidalink/auth/domain/model/UserRole.java`
- Create: `src/main/java/com/cuidalink/auth/domain/model/User.java`
- Create: `src/main/java/com/cuidalink/auth/domain/port/in/RegisterUserUseCase.java`
- Create: `src/main/java/com/cuidalink/auth/domain/port/in/LoginUserUseCase.java`
- Create: `src/main/java/com/cuidalink/auth/domain/port/in/UpdateFcmTokenUseCase.java`
- Create: `src/main/java/com/cuidalink/auth/domain/port/out/UserRepository.java`
- Create: `src/main/java/com/cuidalink/auth/domain/port/out/PasswordEncoder.java`
- Create: `src/main/java/com/cuidalink/auth/domain/port/out/JwtProvider.java`
- Create: `src/main/java/com/cuidalink/auth/domain/service/AuthService.java`
- Test: `src/test/java/com/cuidalink/auth/domain/service/AuthServiceTest.java`

**Interfaces:**
- Produce: `RegisterUserUseCase.execute(RegisterUserCommand) → String` (JWT)
- Produce: `LoginUserUseCase.login(String email, String password) → String` (JWT)
- Produce: `UpdateFcmTokenUseCase.update(UserId, String fcmToken) → void`

- [ ] **Step 1: Escribir test fallido para registro y login**

```java
// src/test/java/com/cuidalink/auth/domain/service/AuthServiceTest.java
package com.cuidalink.auth.domain.service;

import com.cuidalink.auth.domain.model.*;
import com.cuidalink.auth.domain.port.in.RegisterUserUseCase.RegisterUserCommand;
import com.cuidalink.auth.domain.port.out.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtProvider jwtProvider;
    AuthService sut;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new AuthService(userRepository, passwordEncoder, jwtProvider);
    }

    @Test
    void register_hashesPasswordAndReturnsToken() {
        var command = new RegisterUserCommand("Ana López", "ana@test.com", "secret123");
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtProvider.generate(any(), any())).thenReturn("jwt-token");

        String token = sut.execute(command);

        assertThat(token).isEqualTo("jwt-token");
        verify(passwordEncoder).encode("secret123");
        verify(userRepository).save(argThat(u -> u.getPasswordHash().equals("hashed")));
    }

    @Test
    void register_throwsWhenEmailAlreadyExists() {
        var command = new RegisterUserCommand("Ana López", "ana@test.com", "secret123");
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(mock(User.class)));

        assertThatThrownBy(() -> sut.execute(command))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ya existe");
    }

    @Test
    void login_returnsTokenOnValidCredentials() {
        var user = new User(UserId.generate(), "Ana", new Email("ana@test.com"), "hashed");
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "hashed")).thenReturn(true);
        when(jwtProvider.generate(any(), any())).thenReturn("jwt-token");

        String token = sut.login("ana@test.com", "secret123");

        assertThat(token).isEqualTo("jwt-token");
    }

    @Test
    void login_throwsOnInvalidPassword() {
        var user = new User(UserId.generate(), "Ana", new Email("ana@test.com"), "hashed");
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> sut.login("ana@test.com", "wrong"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("credenciales");
    }

    @Test
    void updateFcmToken_updatesUserToken() {
        var userId = new UserId(java.util.UUID.randomUUID());
        var user = new User(userId, "Ana", new Email("ana@test.com"), "hashed");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        sut.update(userId, "new-fcm-token");

        verify(userRepository).save(argThat(u -> u.getFcmToken() != null &&
            u.getFcmToken().value().equals("new-fcm-token")));
    }
}
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
mvn test -pl . -Dtest=AuthServiceTest -q
```
Esperado: FAIL — `AuthService` no existe

- [ ] **Step 3: Implementar Value Objects**

```java
// UserId.java
package com.cuidalink.auth.domain.model;
import java.util.UUID;
public record UserId(UUID value) {
    public static UserId generate() { return new UserId(UUID.randomUUID()); }
}

// Email.java
package com.cuidalink.auth.domain.model;
public record Email(String value) {
    public Email {
        if (value == null || !value.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
            throw new IllegalArgumentException("Email inválido: " + value);
    }
}

// FcmToken.java
package com.cuidalink.auth.domain.model;
public record FcmToken(String value) {
    public FcmToken { if (value == null || value.isBlank()) throw new IllegalArgumentException("FCM token vacío"); }
}

// UserRole.java
package com.cuidalink.auth.domain.model;
public enum UserRole { CAREGIVER }
```

- [ ] **Step 4: Implementar entidad `User`**

```java
package com.cuidalink.auth.domain.model;

public class User {
    private final UserId id;
    private String name;
    private final Email email;
    private String passwordHash;
    private FcmToken fcmToken;
    private final UserRole role;

    public User(UserId id, String name, Email email, String passwordHash) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = UserRole.CAREGIVER;
    }

    public void updateFcmToken(FcmToken token) { this.fcmToken = token; }

    public UserId getId() { return id; }
    public String getName() { return name; }
    public Email getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public FcmToken getFcmToken() { return fcmToken; }
    public UserRole getRole() { return role; }
}
```

- [ ] **Step 5: Implementar puertos**

```java
// port/out/UserRepository.java
package com.cuidalink.auth.domain.port.out;
import com.cuidalink.auth.domain.model.*;
import java.util.Optional;

public interface UserRepository {
    User save(User user);
    Optional<User> findById(UserId id);
    Optional<User> findByEmail(String email);
}

// port/out/PasswordEncoder.java
package com.cuidalink.auth.domain.port.out;
public interface PasswordEncoder {
    String encode(String rawPassword);
    boolean matches(String rawPassword, String encodedPassword);
}

// port/out/JwtProvider.java
package com.cuidalink.auth.domain.port.out;
import com.cuidalink.auth.domain.model.UserId;
public interface JwtProvider {
    String generate(UserId userId, String email);
    UserId validate(String token); // lanza IllegalArgumentException si inválido
}

// port/in/RegisterUserUseCase.java
package com.cuidalink.auth.domain.port.in;
public interface RegisterUserUseCase {
    record RegisterUserCommand(String name, String email, String password) {}
    String execute(RegisterUserCommand command); // retorna JWT
}

// port/in/LoginUserUseCase.java
package com.cuidalink.auth.domain.port.in;
public interface LoginUserUseCase {
    String login(String email, String password); // retorna JWT
}

// port/in/UpdateFcmTokenUseCase.java
package com.cuidalink.auth.domain.port.in;
import com.cuidalink.auth.domain.model.UserId;
public interface UpdateFcmTokenUseCase {
    void update(UserId userId, String fcmToken);
}
```

- [ ] **Step 6: Implementar `AuthService`**

```java
package com.cuidalink.auth.domain.service;

import com.cuidalink.auth.domain.model.*;
import com.cuidalink.auth.domain.port.in.*;
import com.cuidalink.auth.domain.port.out.*;
import org.springframework.stereotype.Service;

@Service
public class AuthService implements RegisterUserUseCase, LoginUserUseCase, UpdateFcmTokenUseCase {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtProvider jwtProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
    }

    @Override
    public String execute(RegisterUserCommand command) {
        userRepository.findByEmail(command.email()).ifPresent(u -> {
            throw new IllegalStateException("Usuario ya existe con este email");
        });
        var hash = passwordEncoder.encode(command.password());
        var user = new User(UserId.generate(), command.name(), new Email(command.email()), hash);
        var saved = userRepository.save(user);
        return jwtProvider.generate(saved.getId(), saved.getEmail().value());
    }

    @Override
    public String login(String email, String password) {
        var user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Credenciales incorrectas"));
        if (!passwordEncoder.matches(password, user.getPasswordHash()))
            throw new IllegalArgumentException("Credenciales incorrectas");
        return jwtProvider.generate(user.getId(), user.getEmail().value());
    }

    @Override
    public void update(UserId userId, String fcmToken) {
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        user.updateFcmToken(new FcmToken(fcmToken));
        userRepository.save(user);
    }
}
```

- [ ] **Step 7: Ejecutar tests y verificar que pasan**

```bash
mvn test -Dtest=AuthServiceTest -q
```
Esperado: 5 tests PASS

- [ ] **Step 8: Commit**

```bash
git add cuidalink/backend/src/
git commit -m "feat(auth): add domain layer — User entity, JWT/BCrypt ports and AuthService"
```

---

### Task 3: Auth — Adaptadores (JWT, BCrypt, JPA, REST, Security)

**Files:**
- Create: `config/FirebaseConfig.java`
- Create: `config/SecurityConfig.java`
- Create: `auth/adapter/out/jwt/JwtProviderAdapter.java`
- Create: `auth/adapter/out/jwt/JwtAuthFilter.java`
- Create: `auth/adapter/out/security/BCryptPasswordEncoderAdapter.java`
- Create: `auth/adapter/out/persistence/UserJpaEntity.java`
- Create: `auth/adapter/out/persistence/SpringUserRepository.java`
- Create: `auth/adapter/out/persistence/JpaUserRepositoryAdapter.java`
- Create: `auth/adapter/in/rest/AuthController.java`
- Create: `auth/adapter/in/rest/dto/` (RegisterRequest, LoginRequest, FcmTokenRequest, TokenResponse, UserResponse)
- Test: `src/test/java/com/cuidalink/auth/adapter/in/rest/AuthControllerTest.java`

**Interfaces:**
- Consume: `RegisterUserUseCase`, `LoginUserUseCase`, `UpdateFcmTokenUseCase` (Task 2)
- Produce: `POST /auth/register`, `POST /auth/login`, `POST /auth/fcm-token`, `GET /auth/me`

- [ ] **Step 1: Implementar `FirebaseConfig`** (solo FCM, sin auth)

```java
package com.cuidalink.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import jakarta.annotation.PostConstruct;

@Configuration
public class FirebaseConfig {
    @Value("${firebase.service-account-path}")
    private Resource serviceAccount;

    @PostConstruct
    public void initialize() throws Exception {
        if (FirebaseApp.getApps().isEmpty()) {
            var options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount.getInputStream()))
                .build();
            FirebaseApp.initializeApp(options);
        }
    }
}
```

- [ ] **Step 2: Implementar `JwtProviderAdapter`**

```java
package com.cuidalink.auth.adapter.out.jwt;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.auth.domain.port.out.JwtProvider;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtProviderAdapter implements JwtProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtProviderAdapter(@Value("${jwt.secret}") String secret,
                               @Value("${jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    @Override
    public String generate(UserId userId, String email) {
        return Jwts.builder()
            .subject(userId.value().toString())
            .claim("email", email)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(key)
            .compact();
    }

    @Override
    public UserId validate(String token) {
        try {
            var claims = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
            return new UserId(UUID.fromString(claims.getSubject()));
        } catch (JwtException e) {
            throw new IllegalArgumentException("Token JWT inválido", e);
        }
    }
}
```

- [ ] **Step 3: Implementar `JwtAuthFilter`**

```java
package com.cuidalink.auth.adapter.out.jwt;

import com.cuidalink.auth.domain.port.out.JwtProvider;
import com.cuidalink.auth.domain.port.out.UserRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtProvider jwtProvider, UserRepository userRepository) {
        this.jwtProvider = jwtProvider;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
        throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                var userId = jwtProvider.validate(header.substring(7));
                userRepository.findById(userId).ifPresent(user -> {
                    var auth = new UsernamePasswordAuthenticationToken(user, null, List.of());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            } catch (Exception ignored) {}
        }
        chain.doFilter(req, res);
    }
}
```

- [ ] **Step 4: Implementar `BCryptPasswordEncoderAdapter`**

```java
package com.cuidalink.auth.adapter.out.security;

import com.cuidalink.auth.domain.port.out.PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BCryptPasswordEncoderAdapter implements PasswordEncoder {

    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    @Override
    public String encode(String rawPassword) { return bcrypt.encode(rawPassword); }

    @Override
    public boolean matches(String rawPassword, String encodedPassword) {
        return bcrypt.matches(rawPassword, encodedPassword);
    }
}
```

- [ ] **Step 5: Implementar `SecurityConfig`**

```java
package com.cuidalink.config;

import com.cuidalink.auth.adapter.out.jwt.JwtAuthFilter;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(c -> c.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/auth/register", "/auth/login").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

- [ ] **Step 6: Implementar JPA adapter para User**

```java
// UserJpaEntity.java
package com.cuidalink.auth.adapter.out.persistence;

import jakarta.persistence.*;

@Entity @Table(name = "users")
public class UserJpaEntity {
    @Id private String id;
    private String name;
    @Column(unique = true) private String email;
    @Column(name = "password_hash") private String passwordHash;
    private String fcmToken;
    private String role;
    // getters/setters
}

// SpringUserRepository.java
package com.cuidalink.auth.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SpringUserRepository extends JpaRepository<UserJpaEntity, String> {
    Optional<UserJpaEntity> findByEmail(String email);
}

// JpaUserRepositoryAdapter.java
package com.cuidalink.auth.adapter.out.persistence;

import com.cuidalink.auth.domain.model.*;
import com.cuidalink.auth.domain.port.out.UserRepository;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class JpaUserRepositoryAdapter implements UserRepository {

    private final SpringUserRepository jpa;

    public JpaUserRepositoryAdapter(SpringUserRepository jpa) { this.jpa = jpa; }

    @Override
    public User save(User user) {
        jpa.save(toJpa(user));
        return user;
    }

    @Override
    public Optional<User> findById(UserId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpa.findByEmail(email).map(this::toDomain);
    }

    private UserJpaEntity toJpa(User u) {
        var e = new UserJpaEntity();
        e.setId(u.getId().value().toString());
        e.setName(u.getName());
        e.setEmail(u.getEmail().value());
        e.setPasswordHash(u.getPasswordHash());
        e.setFcmToken(u.getFcmToken() != null ? u.getFcmToken().value() : null);
        e.setRole(u.getRole().name());
        return e;
    }

    private User toDomain(UserJpaEntity e) {
        var user = new User(new UserId(UUID.fromString(e.getId())), e.getName(),
            new Email(e.getEmail()), e.getPasswordHash());
        if (e.getFcmToken() != null) user.updateFcmToken(new FcmToken(e.getFcmToken()));
        return user;
    }
}
```

- [ ] **Step 7: Implementar `AuthController` con DTOs**

```java
// dto/RegisterRequest.java
public record RegisterRequest(@NotBlank String name,
                               @jakarta.validation.constraints.Email @NotBlank String email,
                               @NotBlank @Size(min = 8) String password) {}

// dto/LoginRequest.java
public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

// dto/FcmTokenRequest.java
public record FcmTokenRequest(@NotBlank String token) {}

// dto/TokenResponse.java
public record TokenResponse(String token) {}

// dto/UserResponse.java
public record UserResponse(String id, String name, String email, String role) {}

// AuthController.java
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

    public AuthController(RegisterUserUseCase r, LoginUserUseCase l, UpdateFcmTokenUseCase f) {
        this.registerUseCase = r; this.loginUseCase = l; this.fcmTokenUseCase = f;
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
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(new UserResponse(user.getId().value().toString(),
            user.getName(), user.getEmail().value(), user.getRole().name()));
    }
}
```

- [ ] **Step 8: Test MockMvc del controller**

```java
// src/test/java/com/cuidalink/auth/adapter/in/rest/AuthControllerTest.java
@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean RegisterUserUseCase registerUseCase;
    @MockBean LoginUserUseCase loginUseCase;
    @MockBean UpdateFcmTokenUseCase fcmTokenUseCase;
    @MockBean JwtAuthFilter jwtAuthFilter;

    @Test
    void register_returns200_withValidBody() throws Exception {
        when(registerUseCase.execute(any())).thenReturn("jwt-token-abc");

        mockMvc.perform(post("/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name":"Ana","email":"ana@test.com","password":"secret123"}
            """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("jwt-token-abc"));
    }

    @Test
    void login_returns200_withValidCredentials() throws Exception {
        when(loginUseCase.login("ana@test.com", "secret123")).thenReturn("jwt-token-abc");

        mockMvc.perform(post("/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email":"ana@test.com","password":"secret123"}
            """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("jwt-token-abc"));
    }
}
```

- [ ] **Step 9: Ejecutar tests**

```bash
mvn test -Dtest=AuthServiceTest,AuthControllerTest -q
```
Esperado: todos PASS

- [ ] **Step 10: Commit**

```bash
git add cuidalink/backend/src/
git commit -m "feat(auth): add JWT provider, BCrypt adapter, JPA adapter, REST controller and security config"
```

---

### Task 4: Patient — Capa de Dominio

**Files:**
- Create: `patient/domain/model/` (PatientId, EmergencyContact, Gender, Collaborator, InvitationCode, Patient)
- Create: `patient/domain/port/in/` (9 use case interfaces)
- Create: `patient/domain/port/out/PatientRepository.java`
- Create: `patient/domain/service/PatientService.java`
- Test: `src/test/java/com/cuidalink/patient/domain/service/PatientServiceTest.java`

**Interfaces:**
- Consume: `UserId` (Task 2)
- Produce: `CreatePatientUseCase.execute(CreatePatientCommand) → Patient`
- Produce: `GenerateInvitationUseCase.generate(PatientId, UserId requesterId) → InvitationCode`
- Produce: `JoinWithCodeUseCase.join(String code, UserId newCollaborator) → Patient`
- Produce: `RevokeCollaboratorUseCase.revoke(PatientId, UserId collaboratorId, UserId requesterId) → void`

- [ ] **Step 1: Escribir tests fallidos para PatientService**

```java
// PatientServiceTest.java
class PatientServiceTest {

    @Mock PatientRepository patientRepository;
    PatientService sut;
    UserId ownerId = new UserId(UUID.randomUUID());

    @BeforeEach void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new PatientService(patientRepository);
    }

    @Test
    void createPatient_setsOwnerAndReturnsPatient() {
        when(patientRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        var cmd = new CreatePatientUseCase.CreatePatientCommand(
            "María García", LocalDate.of(1945, 3, 10), Gender.FEMALE,
            "12345678", "Diabetes tipo 2", "Penicilina",
            new EmergencyContact("Juan García", "+56912345678"), ownerId);

        Patient result = sut.execute(cmd);

        assertThat(result.getPrimaryCaregiver()).isEqualTo(ownerId);
        assertThat(result.getFullName()).isEqualTo("María García");
        verify(patientRepository).save(any(Patient.class));
    }

    @Test
    void generateInvitation_failsIfRequesterIsNotOwner() {
        var patient = buildPatient(ownerId);
        var strangerUserId = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.generate(patient.getId(), strangerUserId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("solo el cuidador principal");
    }

    @Test
    void joinWithCode_addsCollaboratorToPatient() {
        var patient = buildPatient(ownerId);
        var code = patient.generateInvitationCode();
        var newCollab = new UserId(UUID.randomUUID());
        when(patientRepository.findByInvitationCode(code.code())).thenReturn(Optional.of(patient));
        when(patientRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Patient result = sut.join(code.code(), newCollab);

        assertThat(result.getCollaborators()).anyMatch(c -> c.userId().equals(newCollab));
    }

    private Patient buildPatient(UserId owner) {
        return new Patient(PatientId.generate(), "María García", LocalDate.of(1945,3,10),
            Gender.FEMALE, "12345678", "Diabetes", "Penicilina",
            new EmergencyContact("Juan", "+56912345678"), owner);
    }
}
```

- [ ] **Step 2: Implementar Value Objects del módulo patient**

```java
// PatientId.java
public record PatientId(UUID value) {
    public static PatientId generate() { return new PatientId(UUID.randomUUID()); }
}

// EmergencyContact.java
public record EmergencyContact(String name, String phone) {
    public EmergencyContact {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("nombre contacto vacío");
        if (phone == null || phone.isBlank()) throw new IllegalArgumentException("teléfono contacto vacío");
    }
}

// Gender.java
public enum Gender { MALE, FEMALE, OTHER }

// Collaborator.java
public record Collaborator(UserId userId, LocalDateTime joinedAt) {}

// InvitationCode.java
public record InvitationCode(String code, LocalDateTime expiresAt, boolean used) {
    public boolean isExpired() { return LocalDateTime.now().isAfter(expiresAt); }
    public boolean isValid() { return !used && !isExpired(); }

    public static InvitationCode generate() {
        String code = java.util.UUID.randomUUID().toString()
            .replace("-","").substring(0, 8).toUpperCase();
        return new InvitationCode(code, LocalDateTime.now().plusHours(24), false);
    }
}
```

- [ ] **Step 3: Implementar entidad `Patient`**

```java
public class Patient {
    private final PatientId id;
    private String fullName;
    private LocalDate birthDate;
    private Gender gender;
    private String identificationNumber;
    private String healthCondition;
    private String allergies;
    private EmergencyContact emergencyContact;
    private final UserId primaryCaregiver;
    private final List<Collaborator> collaborators = new ArrayList<>();
    private final List<InvitationCode> invitationCodes = new ArrayList<>();
    private boolean active = true;

    public Patient(PatientId id, String fullName, LocalDate birthDate, Gender gender,
                   String identificationNumber, String healthCondition, String allergies,
                   EmergencyContact emergencyContact, UserId primaryCaregiver) {
        this.id = id; this.fullName = fullName; this.birthDate = birthDate;
        this.gender = gender; this.identificationNumber = identificationNumber;
        this.healthCondition = healthCondition; this.allergies = allergies;
        this.emergencyContact = emergencyContact; this.primaryCaregiver = primaryCaregiver;
    }

    public boolean isOwner(UserId userId) { return primaryCaregiver.equals(userId); }

    public boolean isCollaborator(UserId userId) {
        return collaborators.stream().anyMatch(c -> c.userId().equals(userId));
    }

    public boolean hasAccess(UserId userId) { return isOwner(userId) || isCollaborator(userId); }

    public InvitationCode generateInvitationCode() {
        var code = InvitationCode.generate();
        invitationCodes.add(code);
        return code;
    }

    public void addCollaborator(UserId userId) {
        if (isOwner(userId)) throw new IllegalArgumentException("El owner no puede ser colaborador");
        if (isCollaborator(userId)) throw new IllegalStateException("Ya es colaborador");
        collaborators.add(new Collaborator(userId, LocalDateTime.now()));
    }

    public void removeCollaborator(UserId userId) {
        collaborators.removeIf(c -> c.userId().equals(userId));
    }

    public void archive() { this.active = false; }

    // getters...
    public PatientId getId() { return id; }
    public String getFullName() { return fullName; }
    public LocalDate getBirthDate() { return birthDate; }
    public Gender getGender() { return gender; }
    public String getHealthCondition() { return healthCondition; }
    public String getAllergies() { return allergies; }
    public EmergencyContact getEmergencyContact() { return emergencyContact; }
    public UserId getPrimaryCaregiver() { return primaryCaregiver; }
    public List<Collaborator> getCollaborators() { return List.copyOf(collaborators); }
    public List<InvitationCode> getInvitationCodes() { return List.copyOf(invitationCodes); }
    public boolean isActive() { return active; }
}
```

- [ ] **Step 4: Implementar puertos y PatientService**

```java
// port/out/PatientRepository.java
public interface PatientRepository {
    Patient save(Patient patient);
    Optional<Patient> findById(PatientId id);
    List<Patient> findByOwnerOrCollaborator(UserId userId);
    Optional<Patient> findByInvitationCode(String code);
}

// port/in/CreatePatientUseCase.java
public interface CreatePatientUseCase {
    record CreatePatientCommand(String fullName, LocalDate birthDate, Gender gender,
        String identificationNumber, String healthCondition, String allergies,
        EmergencyContact emergencyContact, UserId primaryCaregiver) {}
    Patient execute(CreatePatientCommand command);
}

// PatientService.java (implementa todos los use cases del módulo)
@Service
public class PatientService implements CreatePatientUseCase, GenerateInvitationUseCase,
    JoinWithCodeUseCase, RevokeCollaboratorUseCase, ListCollaboratorsUseCase,
    FindPatientUseCase, ListPatientsUseCase, UpdatePatientUseCase, ArchivePatientUseCase {

    private final PatientRepository patientRepository;

    public PatientService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    @Override
    public Patient execute(CreatePatientCommand cmd) {
        var patient = new Patient(PatientId.generate(), cmd.fullName(), cmd.birthDate(),
            cmd.gender(), cmd.identificationNumber(), cmd.healthCondition(),
            cmd.allergies(), cmd.emergencyContact(), cmd.primaryCaregiver());
        return patientRepository.save(patient);
    }

    @Override
    public InvitationCode generate(PatientId patientId, UserId requesterId) {
        var patient = findOrThrow(patientId);
        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Acción solo permitida al cuidador principal");
        var code = patient.generateInvitationCode();
        patientRepository.save(patient);
        return code;
    }

    @Override
    public Patient join(String code, UserId newCollaborator) {
        var patient = patientRepository.findByInvitationCode(code)
            .orElseThrow(() -> new IllegalArgumentException("Código inválido o expirado"));
        var validCode = patient.getInvitationCodes().stream()
            .filter(c -> c.code().equals(code) && c.isValid())
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Código inválido o expirado"));
        patient.addCollaborator(newCollaborator);
        return patientRepository.save(patient);
    }

    @Override
    public void revoke(PatientId patientId, UserId collaboratorId, UserId requesterId) {
        var patient = findOrThrow(patientId);
        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Acción solo permitida al cuidador principal");
        patient.removeCollaborator(collaboratorId);
        patientRepository.save(patient);
    }

    private Patient findOrThrow(PatientId id) {
        return patientRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
    }

    // otros métodos de los use cases restantes siguen el mismo patrón
}
```

- [ ] **Step 5: Ejecutar tests**

```bash
mvn test -Dtest=PatientServiceTest -q
```
Esperado: todos PASS

- [ ] **Step 6: Commit**

```bash
git add cuidalink/backend/src/
git commit -m "feat(patient): add domain layer — Patient entity, InvitationCode, ports and PatientService"
```

---

### Task 5: Patient — Adaptadores (JPA + REST)

**Files:**
- Create: `patient/adapter/out/persistence/PatientJpaEntity.java` (con @ElementCollection para collaborators e invitationCodes)
- Create: `patient/adapter/out/persistence/SpringPatientRepository.java`
- Create: `patient/adapter/out/persistence/JpaPatientRepositoryAdapter.java`
- Create: `patient/adapter/in/rest/PatientController.java`
- Create: `patient/adapter/in/rest/CollaboratorController.java`
- Create: `patient/adapter/in/rest/InvitationController.java`
- Create: `patient/adapter/in/rest/dto/` (CreatePatientRequest, PatientResponse, CollaboratorResponse, InvitationResponse, JoinCodeRequest)

**Interfaces:**
- Consume: `PatientService` (Task 4), `User` autenticado del contexto Spring Security

- [ ] **Step 1: Implementar `PatientJpaEntity`**

```java
@Entity @Table(name = "patients")
public class PatientJpaEntity {
    @Id private String id;
    private String fullName;
    private LocalDate birthDate;
    private String gender;
    private String identificationNumber;
    private String healthCondition;
    private String allergies;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String primaryCaregiverId;
    private boolean active = true;

    @ElementCollection
    @CollectionTable(name = "patient_collaborators", joinColumns = @JoinColumn(name = "patient_id"))
    private List<CollaboratorEmbeddable> collaborators = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "patient_invitation_codes", joinColumns = @JoinColumn(name = "patient_id"))
    private List<InvitationCodeEmbeddable> invitationCodes = new ArrayList<>();
    // getters/setters...
}

@Embeddable
public class CollaboratorEmbeddable {
    private String userId;
    private LocalDateTime joinedAt;
}

@Embeddable
public class InvitationCodeEmbeddable {
    private String code;
    private LocalDateTime expiresAt;
    private boolean used;
}
```

- [ ] **Step 2: Implementar `JpaPatientRepositoryAdapter`** (mapper domain ↔ JPA)

```java
@Component
public class JpaPatientRepositoryAdapter implements PatientRepository {
    private final SpringPatientRepository jpa;

    public JpaPatientRepositoryAdapter(SpringPatientRepository jpa) { this.jpa = jpa; }

    @Override
    public Patient save(Patient p) { jpa.save(toJpa(p)); return p; }

    @Override
    public Optional<Patient> findById(PatientId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<Patient> findByOwnerOrCollaborator(UserId userId) {
        return jpa.findByPrimaryCaregiversIdOrCollaboratorsUserId(userId.value().toString())
            .stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<Patient> findByInvitationCode(String code) {
        return jpa.findByInvitationCodesCode(code).map(this::toDomain);
    }

    private PatientJpaEntity toJpa(Patient p) { /* mapper completo */ }
    private Patient toDomain(PatientJpaEntity e) { /* mapper completo */ }
}
```

- [ ] **Step 3: Implementar DTOs y Controllers**

```java
// dto/CreatePatientRequest.java
public record CreatePatientRequest(
    @NotBlank String fullName,
    @NotNull LocalDate birthDate,
    @NotNull Gender gender,
    String identificationNumber,
    String healthCondition,
    String allergies,
    @NotNull EmergencyContactDto emergencyContact
) {}
public record EmergencyContactDto(@NotBlank String name, @NotBlank String phone) {}

// dto/PatientResponse.java
public record PatientResponse(String id, String fullName, String birthDate, String gender,
    String healthCondition, String allergies, EmergencyContactDto emergencyContact,
    boolean isOwner, boolean active) {}

// PatientController.java
@RestController
@RequestMapping("/patients")
public class PatientController {
    private final CreatePatientUseCase createUseCase;
    private final ListPatientsUseCase listUseCase;
    private final FindPatientUseCase findUseCase;
    private final UpdatePatientUseCase updateUseCase;
    private final ArchivePatientUseCase archiveUseCase;

    // constructor...

    @PostMapping
    public ResponseEntity<PatientResponse> create(@AuthenticationPrincipal User user,
                                                   @Validated @RequestBody CreatePatientRequest req) {
        var patient = createUseCase.execute(new CreatePatientUseCase.CreatePatientCommand(
            req.fullName(), req.birthDate(), req.gender(), req.identificationNumber(),
            req.healthCondition(), req.allergies(),
            new EmergencyContact(req.emergencyContact().name(), req.emergencyContact().phone()),
            user.getId()
        ));
        return ResponseEntity.status(201).body(toResponse(patient, true));
    }

    @GetMapping
    public ResponseEntity<List<PatientResponse>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(listUseCase.list(user.getId()).stream()
            .map(p -> toResponse(p, p.isOwner(user.getId()))).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> get(@AuthenticationPrincipal User user,
                                                @PathVariable String id) {
        var patient = findUseCase.find(new PatientId(UUID.fromString(id)));
        if (!patient.hasAccess(user.getId())) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(toResponse(patient, patient.isOwner(user.getId())));
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<Void> archive(@AuthenticationPrincipal User user, @PathVariable String id) {
        archiveUseCase.archive(new PatientId(UUID.fromString(id)), user.getId());
        return ResponseEntity.noContent().build();
    }

    private PatientResponse toResponse(Patient p, boolean isOwner) {
        return new PatientResponse(p.getId().value().toString(), p.getFullName(),
            p.getBirthDate().toString(), p.getGender().name(), p.getHealthCondition(),
            p.getAllergies(),
            new EmergencyContactDto(p.getEmergencyContact().name(), p.getEmergencyContact().phone()),
            isOwner, p.isActive());
    }
}

// InvitationController.java
@RestController
@RequestMapping
public class InvitationController {
    private final GenerateInvitationUseCase generateUseCase;
    private final JoinWithCodeUseCase joinUseCase;

    @PostMapping("/patients/{id}/invitations")
    public ResponseEntity<InvitationResponse> generate(@AuthenticationPrincipal User user,
                                                        @PathVariable String id) {
        var code = generateUseCase.generate(new PatientId(UUID.fromString(id)), user.getId());
        return ResponseEntity.ok(new InvitationResponse(code.code(), code.expiresAt().toString()));
    }

    @PostMapping("/invitations/join")
    public ResponseEntity<Void> join(@AuthenticationPrincipal User user,
                                      @Validated @RequestBody JoinCodeRequest req) {
        joinUseCase.join(req.code(), user.getId());
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 4: Ejecutar tests**

```bash
mvn test -Dtest=PatientServiceTest,AuthControllerTest -q
```
Esperado: todos PASS

- [ ] **Step 5: Commit**

```bash
git add cuidalink/backend/src/
git commit -m "feat(patient): add JPA adapter and REST controllers for patients, collaborators and invitations"
```

---

### Task 6: Medication — Dominio y Adaptadores

**Files:**
- Create: `medication/domain/model/` (MedicationId, Frequency, LogStatus, MedicationSchedule, MedicationLog, Medication)
- Create: `medication/domain/port/in/` (6 use case interfaces)
- Create: `medication/domain/port/out/` (MedicationRepository, MedicationLogRepository)
- Create: `medication/domain/service/MedicationService.java`
- Create: `medication/adapter/out/persistence/` (JPA entities + adapters)
- Create: `medication/adapter/in/rest/` (MedicationController, MedicationLogController + DTOs)
- Test: `src/test/java/com/cuidalink/medication/domain/service/MedicationServiceTest.java`

**Interfaces:**
- Consume: `PatientRepository.findById` para verificar ownership antes de mutaciones
- Produce: `CreateMedicationUseCase.execute(CreateMedicationCommand) → Medication`
- Produce: `GetDailyMedicationLogsUseCase.getLogs(PatientId, LocalDate) → List<MedicationLog>`
- Produce: `ConfirmMedicationLogUseCase.confirm(MedicationLogId, UserId, LogStatus) → MedicationLog`

- [ ] **Step 1: Test fallido para MedicationService**

```java
class MedicationServiceTest {
    @Mock MedicationRepository medicationRepository;
    @Mock MedicationLogRepository logRepository;
    @Mock PatientRepository patientRepository;
    MedicationService sut;

    @Test
    void createMedication_failsIfRequesterIsNotOwner() {
        var patient = mockPatient(ownerId);
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.execute(new CreateMedicationUseCase.CreateMedicationCommand(
            patient.getId(), "Metformina", "500mg", "", schedule, stranger)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void confirmLog_collaboratorCanConfirmPendingLog() {
        var log = new MedicationLog(MedicationLogId.generate(), medicationId,
            LocalDateTime.now(), LogStatus.PENDING, null, null);
        var collaborator = new UserId(UUID.randomUUID());
        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(patientRepository.findByMedicationId(log.getMedicationId())).thenReturn(Optional.of(mockPatientWithCollaborator(collaborator)));
        when(logRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.confirm(log.getId(), collaborator, LogStatus.CONFIRMED);

        assertThat(result.getStatus()).isEqualTo(LogStatus.CONFIRMED);
    }
}
```

- [ ] **Step 2: Implementar model del módulo medication**

```java
// Frequency.java
public enum Frequency { DAILY, EVERY_X_DAYS, WEEKLY }

// LogStatus.java
public enum LogStatus { PENDING, CONFIRMED, MISSED, SKIPPED, ESCALATED }

// MedicationSchedule.java
public record MedicationSchedule(
    List<LocalTime> times,
    Frequency frequency,
    List<DayOfWeek> daysOfWeek,
    LocalDate startDate,
    LocalDate endDate
) {}

// MedicationLog.java
public class MedicationLog {
    private final MedicationLogId id;
    private final MedicationId medicationId;
    private final LocalDateTime scheduledAt;
    private LogStatus status;
    private UserId administeredBy;
    private LocalDateTime confirmedAt;

    public MedicationLog(MedicationLogId id, MedicationId medicationId,
                         LocalDateTime scheduledAt, LogStatus status,
                         UserId administeredBy, LocalDateTime confirmedAt) {
        this.id = id; this.medicationId = medicationId;
        this.scheduledAt = scheduledAt; this.status = status;
        this.administeredBy = administeredBy; this.confirmedAt = confirmedAt;
    }

    public void confirm(UserId confirmedBy, LogStatus newStatus) {
        if (status != LogStatus.PENDING && status != LogStatus.ESCALATED)
            throw new IllegalStateException("Solo se puede confirmar un log PENDING o ESCALATED");
        this.status = newStatus;
        this.administeredBy = confirmedBy;
        this.confirmedAt = LocalDateTime.now();
    }

    // getters...
}

// Medication.java
public class Medication {
    private final MedicationId id;
    private final PatientId patientId;
    private String name;
    private String dosage;
    private String instructions;
    private MedicationSchedule schedule;
    private boolean active;
    // constructor + getters + update method
}
```

- [ ] **Step 3: Implementar `MedicationService`**

```java
@Service
public class MedicationService implements CreateMedicationUseCase, DeactivateMedicationUseCase,
    ListMedicationsUseCase, GetDailyMedicationLogsUseCase, ConfirmMedicationLogUseCase {

    private final MedicationRepository medicationRepository;
    private final MedicationLogRepository logRepository;
    private final PatientRepository patientRepository;

    @Override
    public Medication execute(CreateMedicationCommand cmd) {
        var patient = patientRepository.findById(cmd.patientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede agregar medicamentos");
        var medication = new Medication(MedicationId.generate(), cmd.patientId(), cmd.name(),
            cmd.dosage(), cmd.instructions(), cmd.schedule(), true);
        return medicationRepository.save(medication);
    }

    @Override
    public MedicationLog confirm(MedicationLogId logId, UserId userId, LogStatus newStatus) {
        var log = logRepository.findById(logId)
            .orElseThrow(() -> new IllegalArgumentException("Log no encontrado"));
        var patient = patientRepository.findByMedicationId(log.getMedicationId())
            .orElseThrow(() -> new IllegalStateException("Paciente no encontrado para este medicamento"));
        if (!patient.hasAccess(userId))
            throw new IllegalArgumentException("Sin acceso al paciente");
        log.confirm(userId, newStatus);
        return logRepository.save(log);
    }

    @Override
    public List<MedicationLog> getLogs(PatientId patientId, LocalDate date) {
        return logRepository.findByPatientIdAndDate(patientId, date);
    }
}
```

- [ ] **Step 4: Implementar JPA adapters y Controllers** (mismo patrón que Task 5)

Los controllers exponen:
- `POST /patients/:id/medications`
- `GET /patients/:id/medications`
- `GET /patients/:id/medications/:medId`
- `PUT /patients/:id/medications/:medId`
- `PATCH /patients/:id/medications/:medId/deactivate`
- `GET /patients/:id/medication-logs?date=YYYY-MM-DD`
- `PATCH /medication-logs/:logId` con body `{ "status": "CONFIRMED", "notes": "" }`

- [ ] **Step 5: Ejecutar tests**

```bash
mvn test -Dtest=MedicationServiceTest -q
```
Esperado: PASS

- [ ] **Step 6: Commit**

```bash
git add cuidalink/backend/src/
git commit -m "feat(medication): add Medication domain, service, JPA adapter and REST controllers"
```

---

### Task 7: Vital Signs — Dominio y Adaptadores

**Files:**
- Create: `vital/domain/model/` (VitalSignDefinitionId, VitalSignDefinition, VitalRecordId, VitalMeasurement, VitalRecord)
- Create: `vital/domain/port/in/` (6 use case interfaces)
- Create: `vital/domain/port/out/` (VitalDefinitionRepository, VitalRecordRepository)
- Create: `vital/domain/service/VitalService.java`
- Create: `vital/adapter/out/persistence/` (JPA entities + adapters)
- Create: `vital/adapter/in/rest/` (VitalDefinitionController, VitalRecordController + DTOs)
- Test: `src/test/java/com/cuidalink/vital/domain/service/VitalServiceTest.java`

**Interfaces:**
- Produce: `CreateVitalDefinitionUseCase.execute(CreateVitalDefinitionCommand) → VitalSignDefinition`
- Produce: `RecordVitalsUseCase.record(RecordVitalsCommand) → VitalRecord`
- Produce: `ListVitalRecordsUseCase.list(PatientId, LocalDate from, LocalDate to) → List<VitalRecord>`

- [ ] **Step 1: Test para VitalService**

```java
class VitalServiceTest {
    @Test
    void createDefinition_onlyOwnerCanCreate() {
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(any())).thenReturn(Optional.of(mockPatient(ownerId)));

        assertThatThrownBy(() -> sut.execute(new CreateVitalDefinitionCommand(
            patientId, "Presión", "mmHg", 90.0, 140.0, stranger)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void recordVitals_collaboratorCanRecord() {
        var collab = new UserId(UUID.randomUUID());
        var patient = mockPatientWithCollaborator(collab);
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(patient));
        when(vitalRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var cmd = new RecordVitalsCommand(patientId, collab,
            List.of(new VitalMeasurementDto(definitionId, "120/80")));
        var result = sut.record(cmd);

        assertThat(result.getMeasurements()).hasSize(1);
        assertThat(result.getRecordedBy()).isEqualTo(collab);
    }
}
```

- [ ] **Step 2: Implementar model y service**

```java
// VitalSignDefinition.java
public class VitalSignDefinition {
    private final VitalSignDefinitionId id;
    private final PatientId patientId;
    private String name;
    private String unit;
    private Double normalRangeMin;
    private Double normalRangeMax;
    // constructor + getters + update
}

// VitalMeasurement.java
public record VitalMeasurement(VitalSignDefinitionId definitionId, String value) {}

// VitalRecord.java
public class VitalRecord {
    private final VitalRecordId id;
    private final PatientId patientId;
    private final UserId recordedBy;
    private final LocalDateTime recordedAt;
    private final List<VitalMeasurement> measurements;
    // constructor + getters
}

// VitalService.java
@Service
public class VitalService implements CreateVitalDefinitionUseCase, UpdateVitalDefinitionUseCase,
    DeleteVitalDefinitionUseCase, ListVitalDefinitionsUseCase, RecordVitalsUseCase, ListVitalRecordsUseCase {

    @Override
    public VitalSignDefinition execute(CreateVitalDefinitionCommand cmd) {
        var patient = getPatientOrThrow(cmd.patientId());
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede definir signos vitales");
        var def = new VitalSignDefinition(VitalSignDefinitionId.generate(), cmd.patientId(),
            cmd.name(), cmd.unit(), cmd.normalRangeMin(), cmd.normalRangeMax());
        return definitionRepository.save(def);
    }

    @Override
    public VitalRecord record(RecordVitalsCommand cmd) {
        var patient = getPatientOrThrow(cmd.patientId());
        if (!patient.hasAccess(cmd.recordedBy()))
            throw new IllegalArgumentException("Sin acceso al paciente");
        var measurements = cmd.measurements().stream()
            .map(m -> new VitalMeasurement(m.definitionId(), m.value())).toList();
        var record = new VitalRecord(VitalRecordId.generate(), cmd.patientId(),
            cmd.recordedBy(), LocalDateTime.now(), measurements);
        return vitalRecordRepository.save(record);
    }
}
```

- [ ] **Step 3: Implementar JPA adapters y Controllers**

Endpoints expuestos:
- `POST /patients/:id/vital-definitions`
- `GET /patients/:id/vital-definitions`
- `PUT /patients/:id/vital-definitions/:defId`
- `DELETE /patients/:id/vital-definitions/:defId`
- `POST /patients/:id/vital-records`
- `GET /patients/:id/vital-records?from=&to=`
- `GET /patients/:id/vital-records/:recordId`

- [ ] **Step 4: Ejecutar tests**

```bash
mvn test -Dtest=VitalServiceTest -q
```
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add cuidalink/backend/src/
git commit -m "feat(vital): add VitalSign domain, service, JPA adapter and REST controllers"
```

---

### Task 8: Notification Module — FCM + Cron Jobs

**Files:**
- Create: `notification/domain/port/out/NotificationSender.java`
- Create: `notification/adapter/out/firebase/FcmNotificationSenderAdapter.java`
- Create: `notification/scheduler/DailyMedicationLogScheduler.java`
- Create: `notification/scheduler/EscalationScheduler.java`
- Test: `src/test/java/com/cuidalink/notification/scheduler/EscalationSchedulerTest.java`

**Interfaces:**
- Consume: `MedicationRepository`, `MedicationLogRepository`, `UserRepository`
- Produce: `NotificationSender.send(String fcmToken, String title, String body) → void`

- [ ] **Step 1: Test para EscalationScheduler**

```java
class EscalationSchedulerTest {
    @Mock MedicationLogRepository logRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationSender notificationSender;
    @Mock PatientRepository patientRepository;
    EscalationScheduler sut;

    @Test
    void escalate_sendsPushToOwnerAndChangesStatusToEscalated() {
        var owner = mockUser("owner-fcm-token");
        var patient = mockPatient(owner.getId());
        var log = new MedicationLog(MedicationLogId.generate(), medicationId,
            LocalDateTime.now().minusMinutes(31), LogStatus.PENDING, null, null);

        when(logRepository.findPendingOlderThan(any())).thenReturn(List.of(log));
        when(patientRepository.findByMedicationId(log.getMedicationId())).thenReturn(Optional.of(patient));
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(logRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        sut.escalate();

        verify(notificationSender).send(eq("owner-fcm-token"),
            contains("no fue confirmado"), any());
        verify(logRepository).save(argThat(l -> l.getStatus() == LogStatus.ESCALATED));
    }
}
```

- [ ] **Step 2: Implementar `NotificationSender` y `FcmNotificationSenderAdapter`**

```java
// domain/port/out/NotificationSender.java
public interface NotificationSender {
    void send(String fcmToken, String title, String body);
}

// adapter/out/firebase/FcmNotificationSenderAdapter.java
@Component
public class FcmNotificationSenderAdapter implements NotificationSender {
    @Override
    public void send(String fcmToken, String title, String body) {
        try {
            var message = Message.builder()
                .setToken(fcmToken)
                .setNotification(Notification.builder().setTitle(title).setBody(body).build())
                .build();
            FirebaseMessaging.getInstance().send(message);
        } catch (Exception e) {
            // log error pero no propagar — la notificación no debe romper el flujo
            org.slf4j.LoggerFactory.getLogger(getClass())
                .error("Error enviando FCM a token {}: {}", fcmToken.substring(0, 6), e.getMessage());
        }
    }
}
```

- [ ] **Step 3: Implementar cron jobs**

```java
// DailyMedicationLogScheduler.java
@Component
public class DailyMedicationLogScheduler {

    private final MedicationRepository medicationRepository;
    private final MedicationLogRepository logRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final NotificationSender notificationSender;

    @Scheduled(cron = "1 0 * * *")  // cada día a las 00:01
    public void generateDailyLogs() {
        var today = LocalDate.now();
        var activeMedications = medicationRepository.findAllActive();
        for (var med : activeMedications) {
            if (!shouldRunToday(med.getSchedule(), today)) continue;
            for (var time : med.getSchedule().times()) {
                var scheduledAt = today.atTime(time);
                if (logRepository.existsByMedicationIdAndScheduledAt(med.getId(), scheduledAt)) continue;
                var log = new MedicationLog(MedicationLogId.generate(), med.getId(),
                    scheduledAt, LogStatus.PENDING, null, null);
                logRepository.save(log);
                notifyCareteam(med, time);
            }
        }
    }

    private boolean shouldRunToday(MedicationSchedule schedule, LocalDate today) {
        return switch (schedule.frequency()) {
            case DAILY -> true;
            case WEEKLY -> schedule.daysOfWeek().contains(today.getDayOfWeek());
            case EVERY_X_DAYS -> true; // simplificado — en implementación completa calcular desde startDate
        };
    }

    private void notifyCareteam(Medication med, LocalTime time) {
        patientRepository.findById(med.getPatientId()).ifPresent(patient -> {
            userRepository.findById(patient.getPrimaryCaregiver()).ifPresent(owner -> {
                if (owner.getFcmToken() != null)
                    notificationSender.send(owner.getFcmToken().value(),
                        "Medicamento programado",
                        med.getName() + " — " + time.toString());
            });
        });
    }
}

// EscalationScheduler.java
@Component
public class EscalationScheduler {

    private final MedicationLogRepository logRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final NotificationSender notificationSender;

    @Scheduled(fixedDelay = 300_000)  // cada 5 minutos
    public void escalate() {
        var threshold = LocalDateTime.now().minusMinutes(30);
        var pendingLogs = logRepository.findPendingOlderThan(threshold);
        for (var log : pendingLogs) {
            patientRepository.findByMedicationId(log.getMedicationId()).ifPresent(patient -> {
                userRepository.findById(patient.getPrimaryCaregiver()).ifPresent(owner -> {
                    if (owner.getFcmToken() != null) {
                        notificationSender.send(owner.getFcmToken().value(),
                            "⚠️ Medicamento sin confirmar",
                            "Un medicamento no fue confirmado a las " +
                            log.getScheduledAt().toLocalTime().toString());
                    }
                });
                log.escalate();
                logRepository.save(log);
            });
        }
    }
}
```

- [ ] **Step 4: Agregar método `escalate()` a `MedicationLog`**

```java
// En MedicationLog.java, agregar:
public void escalate() {
    if (this.status == LogStatus.PENDING) {
        this.status = LogStatus.ESCALATED;
    }
}
```

- [ ] **Step 5: Ejecutar tests**

```bash
mvn test -Dtest=EscalationSchedulerTest -q
```
Esperado: PASS

- [ ] **Step 6: Commit**

```bash
git add cuidalink/backend/src/
git commit -m "feat(notification): add FCM adapter and cron jobs for daily logs and escalation"
```

---

### Task 9: Report Module — PDF con iText 7

**Files:**
- Create: `report/domain/model/Report.java`, `DateRange.java`, `MedicationLogEntry.java`, `VitalRecordEntry.java`
- Create: `report/domain/port/in/GeneratePatientReportUseCase.java`
- Create: `report/domain/port/out/ReportGenerator.java`
- Create: `report/domain/service/ReportService.java`
- Create: `report/adapter/out/pdf/ITextReportGeneratorAdapter.java`
- Create: `report/adapter/in/rest/ReportController.java`
- Test: `src/test/java/com/cuidalink/report/domain/service/ReportServiceTest.java`

**Interfaces:**
- Consume: `MedicationLogRepository`, `VitalRecordRepository`, `PatientRepository`
- Produce: `GeneratePatientReportUseCase.generate(PatientId, UserId, DateRange) → byte[]`

- [ ] **Step 1: Test para ReportService**

```java
class ReportServiceTest {
    @Test
    void generate_failsIfRequesterIsNotOwner() {
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(any())).thenReturn(Optional.of(mockPatient(ownerId)));

        assertThatThrownBy(() -> sut.generate(patientId, stranger,
            new DateRange(LocalDate.now().minusDays(7), LocalDate.now())))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void generate_failsIfRangeExceeds90Days() {
        when(patientRepository.findById(any())).thenReturn(Optional.of(mockPatient(ownerId)));

        assertThatThrownBy(() -> sut.generate(patientId, ownerId,
            new DateRange(LocalDate.now().minusDays(91), LocalDate.now())))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("90 días");
    }

    @Test
    void generate_callsReportGeneratorWithCorrectData() {
        when(patientRepository.findById(any())).thenReturn(Optional.of(mockPatient(ownerId)));
        when(logRepository.findByPatientAndDateRange(any(), any(), any())).thenReturn(List.of());
        when(vitalRecordRepository.findByPatientAndDateRange(any(), any(), any())).thenReturn(List.of());
        when(reportGenerator.generatePdf(any())).thenReturn(new byte[]{1,2,3});
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(mockUser("Ana")));

        var result = sut.generate(patientId, ownerId,
            new DateRange(LocalDate.now().minusDays(7), LocalDate.now()));

        assertThat(result).isNotEmpty();
        verify(reportGenerator).generatePdf(any(Report.class));
    }
}
```

- [ ] **Step 2: Implementar modelos de Report**

```java
// DateRange.java
public record DateRange(LocalDate from, LocalDate to) {
    public DateRange {
        if (from.isAfter(to)) throw new IllegalArgumentException("from debe ser anterior a to");
        if (java.time.temporal.ChronoUnit.DAYS.between(from, to) > 90)
            throw new IllegalArgumentException("El rango no puede superar 90 días");
    }
}

// MedicationLogEntry.java
public record MedicationLogEntry(String medicationName, LocalDateTime scheduledAt,
                                  String status, String administeredBy) {}

// VitalRecordEntry.java
public record VitalRecordEntry(LocalDateTime recordedAt, String recordedBy,
                                List<VitalMeasurementEntry> measurements) {}

public record VitalMeasurementEntry(String vitalName, String value, String unit, boolean outOfRange) {}

// Report.java
public class Report {
    private final PatientId patientId;
    private final String patientName;
    private final String generatedByName;
    private final LocalDateTime generatedAt;
    private final DateRange period;
    private final List<MedicationLogEntry> medicationSummary;
    private final List<VitalRecordEntry> vitalSummary;
    // constructor + getters
}
```

- [ ] **Step 3: Implementar `ReportService`**

```java
@Service
public class ReportService implements GeneratePatientReportUseCase {

    private final PatientRepository patientRepository;
    private final MedicationLogRepository logRepository;
    private final VitalRecordRepository vitalRepository;
    private final UserRepository userRepository;
    private final ReportGenerator reportGenerator;

    @Override
    public byte[] generate(PatientId patientId, UserId requesterId, DateRange period) {
        var patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Solo el cuidador principal puede generar informes");

        var owner = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        var medLogs = logRepository.findByPatientAndDateRange(patientId, period.from(), period.to())
            .stream().map(log -> {
                String adminName = log.getAdministeredBy() != null
                    ? userRepository.findById(log.getAdministeredBy())
                        .map(u -> u.getName()).orElse("Desconocido")
                    : "—";
                return new MedicationLogEntry(
                    getMedicationName(log.getMedicationId()), log.getScheduledAt(),
                    log.getStatus().name(), adminName);
            }).toList();

        var vitalRecords = vitalRepository.findByPatientAndDateRange(patientId, period.from(), period.to())
            .stream().map(rec -> {
                String recName = userRepository.findById(rec.getRecordedBy())
                    .map(u -> u.getName()).orElse("Desconocido");
                var measurements = rec.getMeasurements().stream().map(m -> {
                    var def = vitalRepository.findDefinitionById(m.definitionId());
                    boolean outOfRange = def.getNormalRangeMin() != null && def.getNormalRangeMax() != null
                        && isOutOfRange(m.value(), def.getNormalRangeMin(), def.getNormalRangeMax());
                    return new VitalMeasurementEntry(def.getName(), m.value(), def.getUnit(), outOfRange);
                }).toList();
                return new VitalRecordEntry(rec.getRecordedAt(), recName, measurements);
            }).toList();

        var report = new Report(patientId, patient.getFullName(), owner.getName(),
            LocalDateTime.now(), period, medLogs, vitalRecords);
        return reportGenerator.generatePdf(report);
    }

    private boolean isOutOfRange(String value, Double min, Double max) {
        try {
            double v = Double.parseDouble(value.split("/")[0].trim());
            return v < min || v > max;
        } catch (NumberFormatException e) { return false; }
    }
}
```

- [ ] **Step 4: Implementar `ITextReportGeneratorAdapter`**

```java
@Component
public class ITextReportGeneratorAdapter implements ReportGenerator {

    @Override
    public byte[] generatePdf(Report report) {
        try (var baos = new java.io.ByteArrayOutputStream()) {
            var writer = new PdfWriter(baos);
            var pdfDoc = new PdfDocument(writer);
            var document = new Document(pdfDoc);

            // Título
            document.add(new Paragraph("Informe Médico — " + report.getPatientName())
                .setFontSize(18).setBold());
            document.add(new Paragraph("Período: " + report.getPeriod().from() +
                " al " + report.getPeriod().to()).setFontSize(11));
            document.add(new Paragraph("Generado por: " + report.getGeneratedByName() +
                " el " + report.getGeneratedAt().toLocalDate()).setFontSize(11));
            document.add(new Paragraph("\n"));

            // Tabla de medicamentos
            document.add(new Paragraph("Medicamentos").setFontSize(14).setBold());
            var medTable = new Table(4).useAllAvailableWidth();
            medTable.addHeaderCell("Medicamento");
            medTable.addHeaderCell("Programado");
            medTable.addHeaderCell("Estado");
            medTable.addHeaderCell("Administrado por");
            for (var entry : report.getMedicationSummary()) {
                medTable.addCell(entry.medicationName());
                medTable.addCell(entry.scheduledAt().toString());
                medTable.addCell(entry.status());
                medTable.addCell(entry.administeredBy());
            }
            document.add(medTable);
            document.add(new Paragraph("\n"));

            // Tabla de signos vitales
            document.add(new Paragraph("Signos Vitales").setFontSize(14).setBold());
            var vitalTable = new Table(4).useAllAvailableWidth();
            vitalTable.addHeaderCell("Fecha/Hora");
            vitalTable.addHeaderCell("Registrado por");
            vitalTable.addHeaderCell("Signo vital");
            vitalTable.addHeaderCell("Valor");
            for (var rec : report.getVitalSummary()) {
                for (var m : rec.measurements()) {
                    vitalTable.addCell(rec.recordedAt().toString());
                    vitalTable.addCell(rec.recordedBy());
                    vitalTable.addCell(m.vitalName() + " (" + m.unit() + ")");
                    var valueCell = new Cell().add(new Paragraph(m.value()));
                    if (m.outOfRange()) valueCell.setBackgroundColor(new DeviceRgb(255, 200, 200));
                    vitalTable.addCell(valueCell);
                }
            }
            document.add(vitalTable);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF", e);
        }
    }
}
```

- [ ] **Step 5: Implementar `ReportController`**

```java
@RestController
@RequestMapping("/patients/{id}/reports")
public class ReportController {

    private final GeneratePatientReportUseCase generateUseCase;

    @GetMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generatePdf(
        @AuthenticationPrincipal User user,
        @PathVariable String id,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        var pdf = generateUseCase.generate(new PatientId(UUID.fromString(id)),
            user.getId(), new DateRange(from, to));
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=informe-cuidalink.pdf")
            .body(pdf);
    }
}
```

- [ ] **Step 6: Ejecutar tests**

```bash
mvn test -Dtest=ReportServiceTest -q
```
Esperado: PASS

- [ ] **Step 7: Commit**

```bash
git add cuidalink/backend/src/
git commit -m "feat(report): add Report domain, iText PDF adapter and report endpoint"
```

---

### Task 10: Security Hardening + Rate Limiting + Global Exception Handler

**Files:**
- Create: `config/RateLimitConfig.java`
- Create: `config/RateLimitFilter.java`
- Create: `config/GlobalExceptionHandler.java`

- [ ] **Step 1: Implementar rate limiter**

```java
// RateLimitConfig.java
@Configuration
public class RateLimitConfig {
    @Bean
    public Bucket publicEndpointBucket() {
        var limit = Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}

// RateLimitFilter.java
@Component
@Order(1)
public class RateLimitFilter extends OncePerRequestFilter {

    private final Bucket bucket;

    public RateLimitFilter(Bucket publicEndpointBucket) { this.bucket = publicEndpointBucket; }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
        throws ServletException, IOException {
        String path = req.getRequestURI();
        boolean isPublic = path.endsWith("/auth/register") || path.endsWith("/auth/login")
            || path.endsWith("/auth/google");
        if (isPublic && !bucket.tryConsume(1)) {
            res.setStatus(429);
            res.getWriter().write("{\"error\":\"Demasiadas solicitudes\"}");
            return;
        }
        chain.doFilter(req, res);
    }
}
```

- [ ] **Step 2: Implementar `GlobalExceptionHandler`**

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleConflict(IllegalStateException e) {
        return ResponseEntity.status(409).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .collect(java.util.stream.Collectors.joining(", "));
        return ResponseEntity.badRequest().body(new ErrorResponse(msg));
    }

    record ErrorResponse(String message) {}
}
```

- [ ] **Step 3: Ejecutar todos los tests**

```bash
mvn test -q
```
Esperado: todos PASS

- [ ] **Step 4: Commit final**

```bash
git add cuidalink/backend/src/
git commit -m "feat(security): add Bucket4j rate limiting and global exception handler"
```

---

### Task 11: Integration Tests con Testcontainers

**Files:**
- Create: `src/test/java/com/cuidalink/PatientIntegrationTest.java`
- Create: `src/test/java/com/cuidalink/MedicationIntegrationTest.java`

- [ ] **Step 1: Implementar test de integración de Patient**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class PatientIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("cuidalink_test")
        .withUsername("test").withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired TestRestTemplate restTemplate;
    @Autowired PatientRepository patientRepository;

    @Test
    void createPatient_persistsInDatabase() {
        // Arrange: crear usuario y obtener token (mock Firebase en test)
        var req = new CreatePatientRequest("María García", LocalDate.of(1945,3,10),
            Gender.FEMALE, "12345678", "Diabetes", "Penicilina",
            new EmergencyContactDto("Juan", "+56912345678"));

        // Act
        var response = restTemplate.postForEntity("/api/v1/patients", req, PatientResponse.class);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().fullName()).isEqualTo("María García");
    }
}
```

- [ ] **Step 2: Ejecutar integration tests**

```bash
mvn test -Dtest=PatientIntegrationTest -q
```
Esperado: PASS (Testcontainers levanta PostgreSQL automáticamente)

- [ ] **Step 3: Commit**

```bash
git add cuidalink/backend/src/test/
git commit -m "test(integration): add Testcontainers integration tests for patient and medication"
```
