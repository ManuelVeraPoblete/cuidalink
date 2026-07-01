package com.cuidalink.medication.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.medication.adapter.in.rest.dto.ConfirmLogRequest;
import com.cuidalink.medication.adapter.in.rest.dto.MedicationLogResponse;
import com.cuidalink.medication.domain.model.LogStatus;
import com.cuidalink.medication.domain.model.MedicationLog;
import com.cuidalink.medication.domain.model.MedicationLogId;
import com.cuidalink.medication.domain.port.in.ConfirmMedicationLogUseCase;
import com.cuidalink.medication.domain.port.in.GetDailyMedicationLogsUseCase;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
public class MedicationLogController {

    private final GetDailyMedicationLogsUseCase logsUseCase;
    private final ConfirmMedicationLogUseCase confirmUseCase;

    public MedicationLogController(GetDailyMedicationLogsUseCase logsUseCase,
                                   ConfirmMedicationLogUseCase confirmUseCase) {
        this.logsUseCase = logsUseCase;
        this.confirmUseCase = confirmUseCase;
    }

    @GetMapping("/patients/{patientId}/medication-logs")
    public ResponseEntity<List<MedicationLogResponse>> getDailyLogs(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        var logs = logsUseCase.getLogs(
            new PatientId(UUID.fromString(patientId)), date, user.getId());
        return ResponseEntity.ok(logs.stream().map(this::toResponse).toList());
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
        return ResponseEntity.ok(toResponse(log));
    }

    private MedicationLogResponse toResponse(MedicationLog log) {
        return new MedicationLogResponse(
            log.getId().value().toString(),
            log.getMedicationId().value().toString(),
            log.getScheduledAt().toString(),
            log.getStatus().name(),
            log.getAdministeredBy() != null ? log.getAdministeredBy().value().toString() : null,
            log.getConfirmedAt() != null ? log.getConfirmedAt().toString() : null
        );
    }
}
