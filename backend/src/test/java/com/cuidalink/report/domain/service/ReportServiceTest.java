package com.cuidalink.report.domain.service;

import com.cuidalink.auth.domain.model.Email;
import com.cuidalink.auth.domain.model.User;
import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.auth.domain.port.out.UserRepository;
import com.cuidalink.medication.domain.port.out.MedicationLogRepository;
import com.cuidalink.medication.domain.port.out.MedicationRepository;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import com.cuidalink.report.domain.model.DateRange;
import com.cuidalink.report.domain.model.Report;
import com.cuidalink.report.domain.port.out.ReportGenerator;
import com.cuidalink.vital.domain.port.out.VitalDefinitionRepository;
import com.cuidalink.vital.domain.port.out.VitalRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ReportServiceTest {

    @Mock PatientRepository patientRepository;
    @Mock MedicationLogRepository logRepository;
    @Mock MedicationRepository medicationRepository;
    @Mock VitalRecordRepository vitalRecordRepository;
    @Mock VitalDefinitionRepository vitalDefinitionRepository;
    @Mock UserRepository userRepository;
    @Mock ReportGenerator reportGenerator;

    ReportService sut;

    UserId ownerId = new UserId(UUID.randomUUID());
    PatientId patientId = PatientId.generate();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new ReportService(patientRepository, logRepository, medicationRepository,
            vitalRecordRepository, vitalDefinitionRepository, userRepository, reportGenerator);
    }

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
        when(reportGenerator.generatePdf(any())).thenReturn(new byte[]{1, 2, 3});
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(mockUser("Ana")));

        var result = sut.generate(patientId, ownerId,
            new DateRange(LocalDate.now().minusDays(7), LocalDate.now()));

        assertThat(result).isNotEmpty();
        verify(reportGenerator).generatePdf(any(Report.class));
    }

    // ---- Helpers ----

    private Patient mockPatient(UserId owner) {
        return new Patient(patientId, "Paciente Test", LocalDate.of(1950, 1, 1),
            Gender.FEMALE, "12345678", "Calle Test 123", "Fonasa", "O+",
            "Diabetes", "Ninguna",
            new EmergencyContact("Familiar", "+56912345678"), owner);
    }

    private User mockUser(String name) {
        return new User(ownerId, name, new Email("ana@test.com"), "firebase-uid-123");
    }
}
