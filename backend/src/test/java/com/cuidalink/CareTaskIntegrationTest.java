package com.cuidalink;

import com.cuidalink.auth.adapter.in.rest.dto.RegisterRequest;
import com.cuidalink.auth.adapter.in.rest.dto.TokenResponse;
import com.cuidalink.caretask.adapter.in.rest.dto.CareTaskLogResponse;
import com.cuidalink.caretask.adapter.in.rest.dto.CareTaskResponse;
import com.cuidalink.caretask.adapter.in.rest.dto.CareTaskScheduleDto;
import com.cuidalink.caretask.adapter.in.rest.dto.CreateCareTaskRequest;
import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class CareTaskIntegrationTest {

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
    CareTaskLogRepository careTaskLogRepository;

    private HttpHeaders authHeaders;
    private String patientId;

    @BeforeEach
    void setUp() {
        String email = "task-caregiver-" + UUID.randomUUID() + "@test.com";

        var registerReq = new RegisterRequest("Task Caregiver", email, "password123");
        var registerResp = restTemplate.postForEntity("/api/v1/auth/register", registerReq, TokenResponse.class);
        assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String jwt = registerResp.getBody().token();

        authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(jwt);

        var patientReq = new CreatePatientRequest(
            "Patient For Tasks",
            LocalDate.of(1950, 1, 1),
            Gender.MALE,
            "22222222",
            "Calle Test 456",
            "Fonasa",
            "A+",
            null,
            null,
            new EmergencyContactDto("Contact", "+56900000001")
        );
        var patientEntity = new HttpEntity<>(patientReq, authHeaders);
        var patientResp = restTemplate.postForEntity("/api/v1/patients", patientEntity, PatientResponse.class);
        assertThat(patientResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        patientId = patientResp.getBody().id();
    }

    @Test
    void createTask_returnsCreated() {
        var schedule = new CareTaskScheduleDto(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY), null, null);
        var req = new CreateCareTaskRequest("Tomar presión", "Registrar resultado", schedule, CareTaskPriority.HIGH, true);

        var entity = new HttpEntity<>(req, authHeaders);
        var response = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/tasks", entity, CareTaskResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().name()).isEqualTo("Tomar presión");
        assertThat(response.getBody().priority()).isEqualTo("HIGH");
        assertThat(response.getBody().active()).isTrue();
        assertThat(response.getBody().patientId()).isEqualTo(patientId);
    }

    @Test
    void listTasks_afterCreate_returnsList() {
        var schedule = new CareTaskScheduleDto(
            LocalTime.of(8, 0), CareTaskScheduleType.DATE_RANGE,
            List.of(), LocalDate.now(), LocalDate.now().plusDays(7));
        var req = new CreateCareTaskRequest("Dar desayuno", "Servir dieta indicada", schedule, CareTaskPriority.MEDIUM, false);
        var entity = new HttpEntity<>(req, authHeaders);
        restTemplate.postForEntity("/api/v1/patients/" + patientId + "/tasks", entity, CareTaskResponse.class);

        var listResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/tasks",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders),
            CareTaskResponse[].class
        );

        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResp.getBody()).hasSizeGreaterThanOrEqualTo(1);
    }

    @Test
    void getDailyLogs_thenComplete_marksLogDone() {
        var schedule = new CareTaskScheduleDto(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(LocalDate.now().getDayOfWeek()), null, null);
        var taskReq = new CreateCareTaskRequest("Ejercicios de movilidad", "Realizar por 15 minutos", schedule, CareTaskPriority.LOW, true);
        var taskEntity = new HttpEntity<>(taskReq, authHeaders);
        var taskResp = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/tasks", taskEntity, CareTaskResponse.class);
        assertThat(taskResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        var taskId = new CareTaskId(UUID.fromString(taskResp.getBody().id()));

        var scheduledAt = LocalDateTime.now().withHour(9).withMinute(0).withSecond(0).withNano(0);
        careTaskLogRepository.save(new CareTaskLog(
            CareTaskLogId.generate(), taskId, new PatientId(UUID.fromString(patientId)),
            scheduledAt, CareTaskLogStatus.PENDING, null, null));

        var logsResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/task-logs?date=" + LocalDate.now(),
            HttpMethod.GET,
            new HttpEntity<>(authHeaders),
            CareTaskLogResponse[].class
        );
        assertThat(logsResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(logsResp.getBody()).hasSize(1);
        var logId = logsResp.getBody()[0].id();
        assertThat(logsResp.getBody()[0].taskName()).isEqualTo("Ejercicios de movilidad");
        assertThat(logsResp.getBody()[0].status()).isEqualTo("PENDING");

        var completeResp = restTemplate.exchange(
            "/api/v1/task-logs/" + logId + "/complete",
            HttpMethod.PATCH,
            new HttpEntity<>(authHeaders),
            CareTaskLogResponse.class
        );

        assertThat(completeResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completeResp.getBody().status()).isEqualTo("DONE");
    }
}
