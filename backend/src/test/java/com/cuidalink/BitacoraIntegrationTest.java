package com.cuidalink;

import com.cuidalink.auth.adapter.in.rest.dto.RegisterRequest;
import com.cuidalink.auth.adapter.in.rest.dto.TokenResponse;
import com.cuidalink.bitacora.adapter.in.rest.dto.BitacoraEntryResponse;
import com.cuidalink.bitacora.adapter.in.rest.dto.CreateBitacoraEntryRequest;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.adapter.in.rest.dto.CreatePatientRequest;
import com.cuidalink.patient.adapter.in.rest.dto.EmergencyContactDto;
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
class BitacoraIntegrationTest {

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
        String email = "bitacora-caregiver-" + UUID.randomUUID() + "@test.com";

        var registerReq = new RegisterRequest("Bitacora Caregiver", email, "password123");
        var registerResp = restTemplate.postForEntity("/api/v1/auth/register", registerReq, TokenResponse.class);
        assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String jwt = registerResp.getBody().token();

        authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(jwt);

        var patientReq = new CreatePatientRequest(
            "Bitacora Patient",
            LocalDate.of(1950, 3, 10),
            Gender.FEMALE,
            "33333333",
            "Calle Bitácora 200",
            "Fonasa",
            "O+",
            null,
            null,
            new EmergencyContactDto("Emergency Contact", "+56922222222")
        );
        var patientEntity = new HttpEntity<>(patientReq, authHeaders);
        var patientResp = restTemplate.postForEntity("/api/v1/patients", patientEntity, PatientResponse.class);
        assertThat(patientResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        patientId = patientResp.getBody().id();
    }

    @Test
    void createEntry_asOwner_persistsWithTypeEntry() {
        var req = new CreateBitacoraEntryRequest("Paciente durmió bien durante la noche");
        var entity = new HttpEntity<>(req, authHeaders);

        var response = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/bitacora-entries", entity, BitacoraEntryResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().type()).isEqualTo("ENTRY");
        assertThat(response.getBody().note()).isEqualTo("Paciente durmió bien durante la noche");
        assertThat(response.getBody().patientId()).isEqualTo(patientId);
    }

    @Test
    void listEntries_filtersByDateRange() {
        var req = new CreateBitacoraEntryRequest("Control de rutina");
        restTemplate.postForEntity("/api/v1/patients/" + patientId + "/bitacora-entries",
            new HttpEntity<>(req, authHeaders), BitacoraEntryResponse.class);

        var today = LocalDate.now();

        var withinRange = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/bitacora-entries?from=" + today + "&to=" + today,
            HttpMethod.GET, new HttpEntity<>(authHeaders), BitacoraEntryResponse[].class);
        assertThat(withinRange.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(withinRange.getBody()).hasSizeGreaterThanOrEqualTo(1);

        var pastOnly = today.minusDays(30);
        var beforeRange = today.minusDays(10);
        var outsideRange = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/bitacora-entries?from=" + pastOnly + "&to=" + beforeRange,
            HttpMethod.GET, new HttpEntity<>(authHeaders), BitacoraEntryResponse[].class);
        assertThat(outsideRange.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(outsideRange.getBody()).isEmpty();
    }
}
