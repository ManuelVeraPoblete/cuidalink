package com.cuidalink.medication.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.*;
import com.cuidalink.medication.domain.port.in.*;
import com.cuidalink.medication.domain.port.out.MedicationLogRepository;
import com.cuidalink.medication.domain.port.out.MedicationRepository;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class MedicationService implements
    CreateMedicationUseCase,
    DeactivateMedicationUseCase,
    ListMedicationsUseCase,
    GetMedicationUseCase,
    UpdateMedicationUseCase,
    GetDailyMedicationLogsUseCase,
    ConfirmMedicationLogUseCase {

    private final MedicationRepository medicationRepository;
    private final MedicationLogRepository logRepository;
    private final PatientRepository patientRepository;

    public MedicationService(MedicationRepository medicationRepository,
                             MedicationLogRepository logRepository,
                             PatientRepository patientRepository) {
        this.medicationRepository = medicationRepository;
        this.logRepository = logRepository;
        this.patientRepository = patientRepository;
    }

    @Override
    public Medication execute(CreateMedicationCommand cmd) {
        var patient = patientRepository.findById(cmd.patientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede agregar medicamentos");
        var medication = new Medication(
            MedicationId.generate(), cmd.patientId(), cmd.name(),
            cmd.dosage(), cmd.instructions(), cmd.schedule(), true
        );
        return medicationRepository.save(medication);
    }

    @Override
    public void deactivate(MedicationId medicationId, UserId requesterId) {
        var medication = medicationRepository.findById(medicationId)
            .orElseThrow(() -> new IllegalArgumentException("Medicamento no encontrado"));
        var patient = patientRepository.findById(medication.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Solo el cuidador principal puede desactivar medicamentos");
        medication.deactivate();
        medicationRepository.save(medication);
    }

    @Override
    public List<Medication> listMedications(PatientId patientId, UserId requesterId) {
        var patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return medicationRepository.findByPatientId(patientId);
    }

    @Override
    public Medication getMedication(PatientId patientId, MedicationId medicationId, UserId requesterId) {
        var medication = medicationRepository.findById(medicationId)
            .orElseThrow(() -> new IllegalArgumentException("Medicamento no encontrado"));
        if (!medication.getPatientId().equals(patientId))
            throw new IllegalArgumentException("Medicación no pertenece al paciente indicado");
        var patient = patientRepository.findById(medication.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return medication;
    }

    @Override
    public Medication updateMedication(UpdateMedicationCommand cmd) {
        var medication = medicationRepository.findById(cmd.medicationId())
            .orElseThrow(() -> new IllegalArgumentException("Medicamento no encontrado"));
        if (!medication.getPatientId().equals(cmd.patientId()))
            throw new IllegalArgumentException("Medicación no pertenece al paciente indicado");
        var patient = patientRepository.findById(medication.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede actualizar medicamentos");
        medication.update(cmd.name(), cmd.dosage(), cmd.instructions(), cmd.schedule());
        return medicationRepository.save(medication);
    }

    @Override
    public List<MedicationLog> getLogs(PatientId patientId, LocalDate date, UserId requesterId) {
        var patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return logRepository.findByPatientIdAndDate(patientId, date);
    }

    @Override
    public MedicationLog confirm(MedicationLogId logId, UserId userId, LogStatus newStatus) {
        var log = logRepository.findById(logId)
            .orElseThrow(() -> new IllegalArgumentException("Log no encontrado"));
        var medication = medicationRepository.findById(log.getMedicationId())
            .orElseThrow(() -> new IllegalArgumentException("Medicamento no encontrado"));
        var patient = patientRepository.findById(medication.getPatientId())
            .orElseThrow(() -> new IllegalStateException("Paciente no encontrado para este medicamento"));
        if (!patient.hasAccess(userId))
            throw new IllegalArgumentException("Sin acceso al paciente");
        log.confirm(userId, newStatus);
        return logRepository.save(log);
    }
}
