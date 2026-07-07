package com.cuidalink.caretask.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.in.CreateCareTaskUseCase;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CareTaskServiceTest {

    @Mock CareTaskRepository taskRepository;
    @Mock CareTaskLogRepository logRepository;
    @Mock PatientRepository patientRepository;
    CareTaskService sut;

    UserId ownerId = new UserId(UUID.randomUUID());
    CareTaskSchedule schedule = new CareTaskSchedule(
        LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
        List.of(DayOfWeek.MONDAY), LocalDate.now(), null
    );

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new CareTaskService(taskRepository, logRepository, patientRepository);
    }

    @Test
    void createTask_failsIfRequesterIsNotOwner() {
        var patient = buildPatient(ownerId);
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.execute(new CreateCareTaskUseCase.CreateCareTaskCommand(
            patient.getId(), "Tomar presión", "Registrar resultado", schedule,
            CareTaskPriority.MEDIUM, true, stranger)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createTask_ownerCanCreateTask() {
        var patient = buildPatient(ownerId);
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.execute(new CreateCareTaskUseCase.CreateCareTaskCommand(
            patient.getId(), "Tomar presión", "Registrar resultado", schedule,
            CareTaskPriority.MEDIUM, true, ownerId));

        assertThat(result.getName()).isEqualTo("Tomar presión");
        assertThat(result.getPatientId()).isEqualTo(patient.getId());
        assertThat(result.isActive()).isTrue();
        verify(taskRepository).save(any(CareTask.class));
    }

    @Test
    void listTasks_failsIfUserHasNoAccess() {
        var patient = buildPatient(ownerId);
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.listTasks(patient.getId(), stranger))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void completeLog_collaboratorCanCompletePendingLog() {
        var collaborator = new UserId(UUID.randomUUID());
        var patient = buildPatientWithCollaborator(ownerId, collaborator);
        var taskId = CareTaskId.generate();
        var log = new CareTaskLog(CareTaskLogId.generate(), taskId, patient.getId(),
            LocalDateTime.now(), CareTaskLogStatus.PENDING, null, null);

        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(logRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.complete(log.getId(), collaborator);

        assertThat(result.getStatus()).isEqualTo(CareTaskLogStatus.DONE);
        assertThat(result.getCompletedBy()).isEqualTo(collaborator);
        assertThat(result.getCompletedAt()).isNotNull();
    }

    @Test
    void completeLog_failsIfUserHasNoAccess() {
        var stranger = new UserId(UUID.randomUUID());
        var patient = buildPatient(ownerId);
        var taskId = CareTaskId.generate();
        var log = new CareTaskLog(CareTaskLogId.generate(), taskId, patient.getId(),
            LocalDateTime.now(), CareTaskLogStatus.PENDING, null, null);

        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.complete(log.getId(), stranger))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("acceso");
    }

    @Test
    void completeLog_failsIfAlreadyDone() {
        var patient = buildPatient(ownerId);
        var taskId = CareTaskId.generate();
        var log = new CareTaskLog(CareTaskLogId.generate(), taskId, patient.getId(),
            LocalDateTime.now(), CareTaskLogStatus.DONE, ownerId, LocalDateTime.now());

        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.complete(log.getId(), ownerId))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void deactivate_failsIfRequesterIsNotOwner() {
        var stranger = new UserId(UUID.randomUUID());
        var patient = buildPatient(ownerId);
        var task = new CareTask(CareTaskId.generate(), patient.getId(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, true, true);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.deactivate(task.getId(), stranger))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private Patient buildPatient(UserId owner) {
        return new Patient(PatientId.generate(), "María García", LocalDate.of(1945, 3, 10),
            Gender.FEMALE, "12345678", "Calle Test 123", "Fonasa", "O+",
            "Diabetes", "Penicilina",
            new EmergencyContact("Juan", "+56912345678"), owner);
    }

    private Patient buildPatientWithCollaborator(UserId owner, UserId collaborator) {
        var patient = buildPatient(owner);
        patient.addCollaborator(collaborator);
        return patient;
    }
}
