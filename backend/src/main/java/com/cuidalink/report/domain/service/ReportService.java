package com.cuidalink.report.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.port.out.MedicationLogRepository;
import com.cuidalink.medication.domain.port.out.MedicationRepository;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import com.cuidalink.report.domain.model.*;
import com.cuidalink.report.domain.port.in.GeneratePatientReportUseCase;
import com.cuidalink.report.domain.port.out.ReportGenerator;
import com.cuidalink.vital.domain.port.out.VitalDefinitionRepository;
import com.cuidalink.vital.domain.port.out.VitalRecordRepository;
import com.cuidalink.auth.domain.port.out.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ReportService implements GeneratePatientReportUseCase {

    private final PatientRepository patientRepository;
    private final MedicationLogRepository logRepository;
    private final MedicationRepository medicationRepository;
    private final VitalRecordRepository vitalRepository;
    private final VitalDefinitionRepository vitalDefinitionRepository;
    private final UserRepository userRepository;
    private final ReportGenerator reportGenerator;

    public ReportService(PatientRepository patientRepository,
                         MedicationLogRepository logRepository,
                         MedicationRepository medicationRepository,
                         VitalRecordRepository vitalRepository,
                         VitalDefinitionRepository vitalDefinitionRepository,
                         UserRepository userRepository,
                         ReportGenerator reportGenerator) {
        this.patientRepository = patientRepository;
        this.logRepository = logRepository;
        this.medicationRepository = medicationRepository;
        this.vitalRepository = vitalRepository;
        this.vitalDefinitionRepository = vitalDefinitionRepository;
        this.userRepository = userRepository;
        this.reportGenerator = reportGenerator;
    }

    @Override
    public byte[] generate(PatientId patientId, UserId requesterId, DateRange period) {
        var patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));

        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Solo el cuidador principal puede generar informes");

        var owner = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        var medLogs = logRepository.findByPatientAndDateRange(patientId, period.from(), period.to())
            .stream().map(log -> {
                String medName = medicationRepository.findById(log.getMedicationId())
                    .map(m -> m.getName())
                    .orElse("Medicamento desconocido");
                String adminName = log.getAdministeredBy() != null
                    ? userRepository.findById(log.getAdministeredBy())
                        .map(u -> u.getName()).orElse("Desconocido")
                    : "—";
                return new MedicationLogEntry(medName, log.getScheduledAt(),
                    log.getStatus().name(), adminName);
            }).toList();

        var vitalRecords = vitalRepository.findByPatientAndDateRange(patientId, period.from(), period.to())
            .stream().map(rec -> {
                String recName = userRepository.findById(rec.getRecordedBy())
                    .map(u -> u.getName()).orElse("Desconocido");
                var measurements = rec.getMeasurements().stream().map(m -> {
                    var defOpt = vitalDefinitionRepository.findById(m.definitionId());
                    String vitalName = defOpt.map(d -> d.getName())
                        .orElse(m.definitionId().value().toString());
                    String unit = defOpt.map(d -> d.getUnit()).orElse("");
                    boolean outOfRange = defOpt.map(d -> {
                        if (d.getNormalRangeMin() != null && d.getNormalRangeMax() != null)
                            return isOutOfRange(m.value(), d.getNormalRangeMin(), d.getNormalRangeMax());
                        return false;
                    }).orElse(false);
                    return new VitalMeasurementEntry(vitalName, m.value(), unit, outOfRange);
                }).toList();
                return new VitalRecordEntry(rec.getRecordedAt(), recName, measurements);
            }).toList();

        var report = new Report(patientId, patient.getFullName(), owner.getName(),
            LocalDateTime.now(), period, medLogs, vitalRecords);

        return reportGenerator.generatePdf(report);
    }

    private boolean isOutOfRange(String value, Double min, Double max) {
        try {
            double v = Double.parseDouble(value.split("/")[0].trim());
            return v < min || v > max;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
