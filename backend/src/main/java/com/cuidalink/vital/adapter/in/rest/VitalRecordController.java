package com.cuidalink.vital.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.adapter.in.rest.dto.*;
import com.cuidalink.vital.domain.model.VitalRecord;
import com.cuidalink.vital.domain.model.VitalRecordId;
import com.cuidalink.vital.domain.model.VitalSignDefinitionId;
import com.cuidalink.vital.domain.port.in.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{patientId}/vital-records")
public class VitalRecordController {

    private final RecordVitalsUseCase recordUseCase;
    private final ListVitalRecordsUseCase listUseCase;
    private final GetVitalRecordUseCase getUseCase;

    public VitalRecordController(RecordVitalsUseCase recordUseCase,
                                 ListVitalRecordsUseCase listUseCase,
                                 GetVitalRecordUseCase getUseCase) {
        this.recordUseCase = recordUseCase;
        this.listUseCase = listUseCase;
        this.getUseCase = getUseCase;
    }

    @PostMapping
    public ResponseEntity<VitalRecordResponse> record(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @Validated @RequestBody RecordVitalsRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var measurements = req.measurements().stream()
            .map(m -> new RecordVitalsUseCase.VitalMeasurementDto(
                new VitalSignDefinitionId(UUID.fromString(m.definitionId())), m.value()))
            .toList();
        var record = recordUseCase.record(new RecordVitalsUseCase.RecordVitalsCommand(
            patId, user.getId(), measurements));
        return ResponseEntity.status(201).body(toResponse(record));
    }

    @GetMapping
    public ResponseEntity<List<VitalRecordResponse>> list(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        var patId = new PatientId(UUID.fromString(patientId));
        return ResponseEntity.ok(listUseCase.list(patId, from, to, user.getId())
            .stream().map(this::toResponse).toList());
    }

    @GetMapping("/{recordId}")
    public ResponseEntity<VitalRecordResponse> getById(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String recordId) {
        var patId = new PatientId(UUID.fromString(patientId));
        var record = getUseCase.getById(
            patId, new VitalRecordId(UUID.fromString(recordId)), user.getId());
        return ResponseEntity.ok(toResponse(record));
    }

    // ---- Helpers ----

    private VitalRecordResponse toResponse(VitalRecord r) {
        var measurementResponses = r.getMeasurements().stream()
            .map(m -> new VitalMeasurementResponse(
                m.definitionId().value().toString(), m.value()))
            .toList();
        return new VitalRecordResponse(
            r.getId().value().toString(),
            r.getPatientId().value().toString(),
            r.getRecordedBy().value().toString(),
            r.getRecordedAt().toString(),
            measurementResponses
        );
    }
}
