package com.cuidalink.notification.scheduler;

import com.cuidalink.auth.domain.model.*;
import com.cuidalink.auth.domain.port.out.UserRepository;
import com.cuidalink.medication.domain.model.*;
import com.cuidalink.medication.domain.port.out.MedicationLogRepository;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class EscalationSchedulerTest {

    @Mock MedicationLogRepository logRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationSender notificationSender;
    @Mock PatientRepository patientRepository;
    EscalationScheduler sut;

    MedicationId medicationId = MedicationId.generate();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new EscalationScheduler(logRepository, patientRepository, userRepository, notificationSender);
    }

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
            contains("sin confirmar"), any());
        verify(logRepository).save(argThat(l -> l.getStatus() == LogStatus.ESCALATED));
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
