package com.cuidalink;

import com.cuidalink.auth.adapter.in.rest.dto.RegisterRequest;
import com.cuidalink.auth.adapter.in.rest.dto.TokenResponse;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.adapter.in.rest.dto.CreatePatientRequest;
import com.cuidalink.patient.adapter.in.rest.dto.EmergencyContactDto;
import com.cuidalink.patient.adapter.in.rest.dto.InvitationResponse;
import com.cuidalink.patient.adapter.in.rest.dto.PatientResponse;
import com.cuidalink.patient.domain.model.Gender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class PatientIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("cuidalink_test")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }

    @Autowired
    TestRestTemplate restTemplate;

    @MockBean
    NotificationSender notificationSender;

    private HttpHeaders authHeaders;

    @BeforeEach
    void setUp() {
        // Use unique email per test to avoid DB conflicts
        String email = "patient-caregiver-" + UUID.randomUUID() + "@test.com";
        var registerReq = new RegisterRequest("Test Caregiver", email, "password123");
        var registerResp = restTemplate.postForEntity("/api/v1/auth/register", registerReq, TokenResponse.class);
        assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String jwt = registerResp.getBody().token();

        authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(jwt);
    }

    @Test
    void createPatient_persistsInDatabase() {
        var req = new CreatePatientRequest(
            "María García",
            LocalDate.of(1945, 3, 10),
            Gender.FEMALE,
            "12345678",
            "Av. Providencia 123",
            "Fonasa",
            "O+",
            "Diabetes",
            "Penicilina",
            new EmergencyContactDto("Juan García", "+56912345678")
        );

        var entity = new HttpEntity<>(req, authHeaders);
        var response = restTemplate.postForEntity("/api/v1/patients", entity, PatientResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().fullName()).isEqualTo("María García");
        assertThat(response.getBody().isOwner()).isTrue();
        assertThat(response.getBody().active()).isTrue();
    }

    @Test
    void generateInvitationCode_returnsCode() {
        // First create a patient
        var createReq = new CreatePatientRequest(
            "Juan Pérez",
            LocalDate.of(1960, 6, 15),
            Gender.MALE,
            "87654321",
            "Calle Los Leones 456",
            "Isapre Cruz Blanca",
            "A+",
            null,
            null,
            new EmergencyContactDto("María Pérez", "+56987654321")
        );
        var createEntity = new HttpEntity<>(createReq, authHeaders);
        var createResp = restTemplate.postForEntity("/api/v1/patients", createEntity, PatientResponse.class);
        assertThat(createResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String patientId = createResp.getBody().id();

        // Generate invitation code
        var inviteEntity = new HttpEntity<>(null, authHeaders);
        var inviteResp = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/invitations",
            inviteEntity,
            InvitationResponse.class
        );

        assertThat(inviteResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(inviteResp.getBody()).isNotNull();
        assertThat(inviteResp.getBody().code()).hasSize(8);
    }
}
