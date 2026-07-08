// backend/src/test/java/com/cuidalink/notification/scheduler/CareTaskReminderSchedulerTest.java
package com.cuidalink.notification.scheduler;

import com.cuidalink.auth.domain.model.*;
import com.cuidalink.auth.domain.port.out.UserRepository;
import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.notification.domain.port.out.NotificationSender;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CareTaskReminderSchedulerTest {

    @Mock CareTaskLogRepository logRepository;
    @Mock CareTaskRepository taskRepository;
    @Mock PatientRepository patientRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationSender notificationSender;
    CareTaskReminderScheduler sut;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new CareTaskReminderScheduler(logRepository, taskRepository, patientRepository, userRepository, notificationSender);
    }

    @Test
    void sendReminders_sendsPushWhenReminderActive() {
        var owner = mockUser("owner-fcm-token");
        var patient = mockPatient(owner.getId());
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(DayOfWeek.MONDAY), LocalDate.now(), null);
        var task = new CareTask(CareTaskId.generate(), patient.getId(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, true, true);
        var log = new CareTaskLog(CareTaskLogId.generate(), task.getId(), patient.getId(),
            LocalDateTime.now().withSecond(0).withNano(0), CareTaskLogStatus.PENDING, null, null);

        when(logRepository.findPendingAt(any())).thenReturn(List.of(log));
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));

        sut.sendReminders();

        verify(notificationSender).send(eq("owner-fcm-token"), contains("Tarea pendiente"), any());
    }

    @Test
    void sendReminders_doesNotSendWhenReminderInactive() {
        var owner = mockUser("owner-fcm-token");
        var patient = mockPatient(owner.getId());
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(DayOfWeek.MONDAY), LocalDate.now(), null);
        var task = new CareTask(CareTaskId.generate(), patient.getId(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, false, true);
        var log = new CareTaskLog(CareTaskLogId.generate(), task.getId(), patient.getId(),
            LocalDateTime.now().withSecond(0).withNano(0), CareTaskLogStatus.PENDING, null, null);

        when(logRepository.findPendingAt(any())).thenReturn(List.of(log));
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        sut.sendReminders();

        verify(notificationSender, never()).send(any(), any(), any());
    }

    private User mockUser(String fcmTokenValue) {
        var userId = UserId.generate();
        var user = new User(userId, "Owner Test", new Email("owner@test.com"), "firebase-uid-" + userId.value());
        user.updateFcmToken(new FcmToken(fcmTokenValue));
        return user;
    }

    private Patient mockPatient(UserId ownerId) {
        return new Patient(PatientId.generate(), "Paciente Test",
            LocalDate.of(1945, 3, 10), Gender.FEMALE, "12345678",
            "Calle Test 123", "Fonasa", "O+",
            "Diabetes", "Ninguna",
            new EmergencyContact("Contacto", "+56912345678"), ownerId);
    }
}
