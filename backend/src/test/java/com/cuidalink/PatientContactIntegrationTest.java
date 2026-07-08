package com.cuidalink;

import com.cuidalink.auth.adapter.in.rest.dto.RegisterRequest;
import com.cuidalink.auth.adapter.in.rest.dto.TokenResponse;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.adapter.in.rest.dto.CreatePatientRequest;
import com.cuidalink.patient.adapter.in.rest.dto.EmergencyContactDto;
import com.cuidalink.patient.adapter.in.rest.dto.PatientResponse;
import com.cuidalink.patient.adapter.in.rest.dto.CreatePatientContactRequest;
import com.cuidalink.patient.adapter.in.rest.dto.PatientContactResponse;
import com.cuidalink.patient.adapter.in.rest.dto.UpdatePatientContactRequest;
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
class PatientContactIntegrationTest {

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
        String email = "contact-caregiver-" + UUID.randomUUID() + "@test.com";

        var registerReq = new RegisterRequest("Contact Caregiver", email, "password123");
        var registerResp = restTemplate.postForEntity("/api/v1/auth/register", registerReq, TokenResponse.class);
        assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String jwt = registerResp.getBody().token();

        authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(jwt);

        var patientReq = new CreatePatientRequest(
            "Contact Patient", LocalDate.of(1955, 5, 20), Gender.FEMALE, "22222222",
            "Calle Contact 100", "Fonasa", "AB+", null, null,
            new EmergencyContactDto("Emergency Contact", "+56911111111")
        );
        var patientEntity = new HttpEntity<>(patientReq, authHeaders);
        var patientResp = restTemplate.postForEntity("/api/v1/patients", patientEntity, PatientResponse.class);
        assertThat(patientResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        patientId = patientResp.getBody().id();
    }

    @Test
    void createContact_persistsAndReturnsCreated() {
        var req = new CreatePatientContactRequest(
            "Ana Martínez", "FAMILY", "Hija", "+56912345678", "ana@email.com", null, false);

        var entity = new HttpEntity<>(req, authHeaders);
        var response = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/contacts", entity, PatientContactResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().name()).isEqualTo("Ana Martínez");
        assertThat(response.getBody().category()).isEqualTo("FAMILY");
        assertThat(response.getBody().patientId()).isEqualTo(patientId);
    }

    @Test
    void listContacts_afterCreate_returnsList() {
        var req = new CreatePatientContactRequest(
            "Dr. Pablo Rojas", "DOCTOR", "Médico tratante", "+56987654321",
            "pablo.rojas@clinica.cl", null, false);
        var entity = new HttpEntity<>(req, authHeaders);
        restTemplate.postForEntity("/api/v1/patients/" + patientId + "/contacts", entity, PatientContactResponse.class);

        var listResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/contacts",
            HttpMethod.GET, new HttpEntity<>(authHeaders), PatientContactResponse[].class);

        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResp.getBody()).hasSizeGreaterThanOrEqualTo(1);
    }

    @Test
    void updateContact_changesFields() {
        var createReq = new CreatePatientContactRequest(
            "Luis Martínez", "EMERGENCY", "Hermano", "+56955551111", null,
            "Llamar primero en caso de urgencia", true);
        var createEntity = new HttpEntity<>(createReq, authHeaders);
        var created = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/contacts", createEntity, PatientContactResponse.class);
        String contactId = created.getBody().id();

        var updateReq = new UpdatePatientContactRequest(
            "Luis A. Martínez", "EMERGENCY", "Hermano", "+56955551111", null,
            "Llamar primero en caso de urgencia", true);
        var updateEntity = new HttpEntity<>(updateReq, authHeaders);
        var updateResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/contacts/" + contactId,
            HttpMethod.PUT, updateEntity, PatientContactResponse.class);

        assertThat(updateResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResp.getBody().name()).isEqualTo("Luis A. Martínez");
    }
}
