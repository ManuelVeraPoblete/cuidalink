package com.cuidalink;

import com.cuidalink.auth.adapter.in.rest.dto.RegisterRequest;
import com.cuidalink.auth.adapter.in.rest.dto.TokenResponse;
import com.cuidalink.medication.adapter.in.rest.dto.CreateMedicationRequest;
import com.cuidalink.medication.adapter.in.rest.dto.MedicationLogResponse;
import com.cuidalink.medication.adapter.in.rest.dto.MedicationResponse;
import com.cuidalink.medication.adapter.in.rest.dto.MedicationScheduleDto;
import com.cuidalink.medication.domain.model.Frequency;
import com.cuidalink.medication.domain.model.LogStatus;
import com.cuidalink.medication.domain.model.MedicationId;
import com.cuidalink.medication.domain.model.MedicationLog;
import com.cuidalink.medication.domain.model.MedicationLogId;
import com.cuidalink.medication.domain.port.out.MedicationLogRepository;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.adapter.in.rest.dto.CreatePatientRequest;
import com.cuidalink.patient.adapter.in.rest.dto.EmergencyContactDto;
import com.cuidalink.patient.adapter.in.rest.dto.PatientResponse;
import com.cuidalink.patient.domain.model.Gender;
import com.cuidalink.patient.domain.model.PatientId;
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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class MedicationIntegrationTest {

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

    @Autowired
    MedicationLogRepository medicationLogRepository;

    private HttpHeaders authHeaders;
    private String patientId;

    @BeforeEach
    void setUp() {
        String email = "med-caregiver-" + UUID.randomUUID() + "@test.com";

        // Register caregiver — returns JWT token
        var registerReq = new RegisterRequest("Med Caregiver", email, "password123");
        var registerResp = restTemplate.postForEntity("/api/v1/auth/register", registerReq, TokenResponse.class);
        assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String jwt = registerResp.getBody().token();

        authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(jwt);

        // Create patient for this caregiver
        var patientReq = new CreatePatientRequest(
            "Patient For Meds",
            LocalDate.of(1950, 1, 1),
            Gender.MALE,
            "11111111",
            "Calle Test 789",
            "Fonasa",
            "B+",
            null,
            null,
            new EmergencyContactDto("Contact", "+56900000000")
        );
        var patientEntity = new HttpEntity<>(patientReq, authHeaders);
        var patientResp = restTemplate.postForEntity("/api/v1/patients", patientEntity, PatientResponse.class);
        assertThat(patientResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        patientId = patientResp.getBody().id();
    }

    @Test
    void createMedication_returnsCreated() {
        var schedule = new MedicationScheduleDto(
            List.of(LocalTime.of(8, 0), LocalTime.of(20, 0)),
            Frequency.DAILY,
            List.of(),
            LocalDate.now(),
            LocalDate.now().plusMonths(3),
            null
        );
        var req = new CreateMedicationRequest(
            "Metformina",
            "500mg",
            "Tomar con alimentos",
            schedule
        );

        var entity = new HttpEntity<>(req, authHeaders);
        var response = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/medications",
            entity,
            MedicationResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().name()).isEqualTo("Metformina");
        assertThat(response.getBody().dosage()).isEqualTo("500mg");
        assertThat(response.getBody().active()).isTrue();
        assertThat(response.getBody().patientId()).isEqualTo(patientId);
    }

    @Test
    void listMedications_afterCreate_returnsList() {
        var schedule = new MedicationScheduleDto(
            List.of(LocalTime.of(9, 0)),
            Frequency.DAILY,
            List.of(),
            LocalDate.now(),
            null,
            null
        );
        var req = new CreateMedicationRequest("Aspirina", "100mg", null, schedule);
        var entity = new HttpEntity<>(req, authHeaders);
        restTemplate.postForEntity("/api/v1/patients/" + patientId + "/medications", entity, MedicationResponse.class);

        // List medications
        var listResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/medications",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders),
            MedicationResponse[].class
        );

        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResp.getBody()).isNotNull();
        assertThat(listResp.getBody()).hasSizeGreaterThanOrEqualTo(1);
    }

    @Test
    void getDailyLogs_includesMedicationDetails() {
        var schedule = new MedicationScheduleDto(
            List.of(LocalTime.of(8, 0)),
            Frequency.DAILY,
            List.of(),
            LocalDate.now(),
            null,
            null
        );
        var medReq = new CreateMedicationRequest("Paracetamol", "1 tableta", "Después del desayuno", schedule);
        var medEntity = new HttpEntity<>(medReq, authHeaders);
        var medResp = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/medications", medEntity, MedicationResponse.class);
        assertThat(medResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(medResp.getBody().type()).isEqualTo("TABLET");
        var medicationId = new MedicationId(UUID.fromString(medResp.getBody().id()));

        var scheduledAt = LocalDateTime.now().withHour(8).withMinute(0).withSecond(0).withNano(0);
        medicationLogRepository.save(new MedicationLog(
            MedicationLogId.generate(), medicationId, new PatientId(UUID.fromString(patientId)),
            scheduledAt, LogStatus.PENDING, null, null));

        var logsResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/medication-logs?date=" + LocalDate.now(),
            HttpMethod.GET,
            new HttpEntity<>(authHeaders),
            MedicationLogResponse[].class
        );

        assertThat(logsResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(logsResp.getBody()).hasSize(1);
        var log = logsResp.getBody()[0];
        assertThat(log.medicationName()).isEqualTo("Paracetamol");
        assertThat(log.dosage()).isEqualTo("1 tableta");
        assertThat(log.instructions()).isEqualTo("Después del desayuno");
        assertThat(log.type()).isEqualTo("TABLET");
    }
}
