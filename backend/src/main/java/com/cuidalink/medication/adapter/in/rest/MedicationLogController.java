package com.cuidalink.medication.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.medication.adapter.in.rest.dto.ConfirmLogRequest;
import com.cuidalink.medication.adapter.in.rest.dto.MedicationLogResponse;
import com.cuidalink.medication.domain.model.LogStatus;
import com.cuidalink.medication.domain.model.Medication;
import com.cuidalink.medication.domain.model.MedicationId;
import com.cuidalink.medication.domain.model.MedicationLog;
import com.cuidalink.medication.domain.model.MedicationLogId;
import com.cuidalink.medication.domain.port.in.ConfirmMedicationLogUseCase;
import com.cuidalink.medication.domain.port.in.GetDailyMedicationLogsUseCase;
import com.cuidalink.medication.domain.port.in.GetMedicationUseCase;
import com.cuidalink.medication.domain.port.in.ListMedicationsUseCase;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
public class MedicationLogController {

    private final GetDailyMedicationLogsUseCase logsUseCase;
    private final ConfirmMedicationLogUseCase confirmUseCase;
    private final ListMedicationsUseCase listMedicationsUseCase;
    private final GetMedicationUseCase getMedicationUseCase;

    public MedicationLogController(GetDailyMedicationLogsUseCase logsUseCase,
                                   ConfirmMedicationLogUseCase confirmUseCase,
                                   ListMedicationsUseCase listMedicationsUseCase,
                                   GetMedicationUseCase getMedicationUseCase) {
        this.logsUseCase = logsUseCase;
        this.confirmUseCase = confirmUseCase;
        this.listMedicationsUseCase = listMedicationsUseCase;
        this.getMedicationUseCase = getMedicationUseCase;
    }

    @GetMapping("/patients/{patientId}/medication-logs")
    public ResponseEntity<List<MedicationLogResponse>> getDailyLogs(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        var patId = new PatientId(UUID.fromString(patientId));
        var logs = logsUseCase.getLogs(patId, date, user.getId());
        var medicationsById = listMedicationsUseCase.listMedications(patId, user.getId())
            .stream().collect(Collectors.toMap(Medication::getId, Function.identity()));
        return ResponseEntity.ok(logs.stream().map(log -> toResponse(log, medicationsById)).toList());
    }

    @PatchMapping("/medication-logs/{logId}")
    public ResponseEntity<MedicationLogResponse> confirm(
            @AuthenticationPrincipal User user,
            @PathVariable String logId,
            @Validated @RequestBody ConfirmLogRequest req) {
        var log = confirmUseCase.confirm(
            new MedicationLogId(UUID.fromString(logId)),
            user.getId(),
            req.status()
        );
        var medication = getMedicationUseCase.getMedication(log.getPatientId(), log.getMedicationId(), user.getId());
        return ResponseEntity.ok(toResponse(log, Map.of(medication.getId(), medication)));
    }

    private MedicationLogResponse toResponse(MedicationLog log, Map<MedicationId, Medication> medicationsById) {
        var medication = medicationsById.get(log.getMedicationId());
        return new MedicationLogResponse(
            log.getId().value().toString(),
            log.getMedicationId().value().toString(),
            medication.getName(),
            medication.getDosage(),
            medication.getInstructions(),
            medication.getType().name(),
            log.getScheduledAt().toString(),
            log.getStatus().name(),
            log.getAdministeredBy() != null ? log.getAdministeredBy().value().toString() : null,
            log.getConfirmedAt() != null ? log.getConfirmedAt().toString() : null
        );
    }
}
