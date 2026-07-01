package com.cuidalink;

import com.cuidalink.auth.adapter.in.rest.dto.RegisterRequest;
import com.cuidalink.auth.adapter.in.rest.dto.TokenResponse;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.adapter.in.rest.dto.CreatePatientRequest;
import com.cuidalink.patient.adapter.in.rest.dto.EmergencyContactDto;
import com.cuidalink.patient.adapter.in.rest.dto.PatientResponse;
import com.cuidalink.patient.domain.model.Gender;
import com.cuidalink.vital.adapter.in.rest.dto.CreateVitalDefinitionRequest;
import com.cuidalink.vital.adapter.in.rest.dto.VitalDefinitionResponse;
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
class VitalIntegrationTest {

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
    private String patientId;

    @BeforeEach
    void setUp() {
        String email = "vital-caregiver-" + UUID.randomUUID() + "@test.com";

        // Register caregiver — returns JWT token
        var registerReq = new RegisterRequest("Vital Caregiver", email, "password123");
        var registerResp = restTemplate.postForEntity("/api/v1/auth/register", registerReq, TokenResponse.class);
        assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String jwt = registerResp.getBody().token();

        authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(jwt);

        // Create patient
        var patientReq = new CreatePatientRequest(
            "Vital Patient",
            LocalDate.of(1955, 5, 20),
            Gender.FEMALE,
            "22222222",
            "Calle Vital 100",
            "Fonasa",
            "AB+",
            null,
            null,
            new EmergencyContactDto("Emergency Contact", "+56911111111")
        );
        var patientEntity = new HttpEntity<>(patientReq, authHeaders);
        var patientResp = restTemplate.postForEntity("/api/v1/patients", patientEntity, PatientResponse.class);
        assertThat(patientResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        patientId = patientResp.getBody().id();
    }

    @Test
    void createVitalDefinition_persistsAndReturnsCreated() {
        var req = new CreateVitalDefinitionRequest(
            "Presión Arterial Sistólica",
            "mmHg",
            90.0,
            140.0
        );

        var entity = new HttpEntity<>(req, authHeaders);
        var response = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/vital-definitions",
            entity,
            VitalDefinitionResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().name()).isEqualTo("Presión Arterial Sistólica");
        assertThat(response.getBody().unit()).isEqualTo("mmHg");
        assertThat(response.getBody().normalRangeMin()).isEqualTo(90.0);
        assertThat(response.getBody().normalRangeMax()).isEqualTo(140.0);
        assertThat(response.getBody().patientId()).isEqualTo(patientId);
    }

    @Test
    void listVitalDefinitions_afterCreate_returnsList() {
        var req = new CreateVitalDefinitionRequest("Glucosa en Sangre", "mg/dL", 70.0, 110.0);
        var entity = new HttpEntity<>(req, authHeaders);
        restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/vital-definitions",
            entity,
            VitalDefinitionResponse.class
        );

        var listResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/vital-definitions",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders),
            VitalDefinitionResponse[].class
        );

        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResp.getBody()).isNotNull();
        assertThat(listResp.getBody()).hasSizeGreaterThanOrEqualTo(1);
    }
}
