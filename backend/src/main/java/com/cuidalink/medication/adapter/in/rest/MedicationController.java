package com.cuidalink.medication.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.medication.adapter.in.rest.dto.*;
import com.cuidalink.medication.domain.model.*;
import com.cuidalink.medication.domain.port.in.*;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{patientId}/medications")
public class MedicationController {

    private final CreateMedicationUseCase createUseCase;
    private final ListMedicationsUseCase listUseCase;
    private final GetMedicationUseCase getUseCase;
    private final UpdateMedicationUseCase updateUseCase;
    private final DeactivateMedicationUseCase deactivateUseCase;

    public MedicationController(CreateMedicationUseCase createUseCase,
                                ListMedicationsUseCase listUseCase,
                                GetMedicationUseCase getUseCase,
                                UpdateMedicationUseCase updateUseCase,
                                DeactivateMedicationUseCase deactivateUseCase) {
        this.createUseCase = createUseCase;
        this.listUseCase = listUseCase;
        this.getUseCase = getUseCase;
        this.updateUseCase = updateUseCase;
        this.deactivateUseCase = deactivateUseCase;
    }

    @PostMapping
    public ResponseEntity<MedicationResponse> create(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @Validated @RequestBody CreateMedicationRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var medication = createUseCase.execute(new CreateMedicationUseCase.CreateMedicationCommand(
            patId,
            req.name(),
            req.dosage(),
            req.instructions() != null ? req.instructions() : "",
            toScheduleDomain(req.schedule()),
            user.getId()
        ));
        return ResponseEntity.status(201).body(toResponse(medication));
    }

    @GetMapping
    public ResponseEntity<List<MedicationResponse>> list(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId) {
        var patId = new PatientId(UUID.fromString(patientId));
        return ResponseEntity.ok(listUseCase.listMedications(patId, user.getId())
            .stream().map(this::toResponse).toList());
    }

    @GetMapping("/{medId}")
    public ResponseEntity<MedicationResponse> get(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String medId) {
        var patId = new PatientId(UUID.fromString(patientId));
        var medication = getUseCase.getMedication(
            patId, new MedicationId(UUID.fromString(medId)), user.getId());
        return ResponseEntity.ok(toResponse(medication));
    }

    @PutMapping("/{medId}")
    public ResponseEntity<MedicationResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String medId,
            @Validated @RequestBody UpdateMedicationRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var medication = updateUseCase.updateMedication(new UpdateMedicationUseCase.UpdateMedicationCommand(
            patId,
            new MedicationId(UUID.fromString(medId)),
            req.name(),
            req.dosage(),
            req.instructions() != null ? req.instructions() : "",
            toScheduleDomain(req.schedule()),
            user.getId()
        ));
        return ResponseEntity.ok(toResponse(medication));
    }

    @PatchMapping("/{medId}/deactivate")
    public ResponseEntity<Void> deactivate(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String medId) {
        deactivateUseCase.deactivate(new MedicationId(UUID.fromString(medId)), user.getId());
        return ResponseEntity.noContent().build();
    }

    // ---- Helpers ----

    private MedicationSchedule toScheduleDomain(MedicationScheduleDto dto) {
        boolean hasExplicitTimes = dto.times() != null && !dto.times().isEmpty();
        if (!hasExplicitTimes && dto.startTime() != null && dto.frequencyHours() != null) {
            return MedicationSchedule.fromDailyInterval(
                dto.startTime(), dto.frequencyHours(), dto.startDate(), dto.endDate());
        }
        return new MedicationSchedule(
            dto.times() != null ? dto.times() : List.of(),
            dto.frequency(),
            dto.daysOfWeek() != null ? dto.daysOfWeek() : List.of(),
            dto.startDate(),
            dto.endDate(),
            dto.intervalDays()
        );
    }

    private MedicationResponse toResponse(Medication m) {
        MedicationScheduleDto schedDto = null;
        if (m.getSchedule() != null) {
            var s = m.getSchedule();
            schedDto = new MedicationScheduleDto(
                s.times(), s.frequency(), s.daysOfWeek(), s.startDate(), s.endDate(), s.intervalDays(),
                s.startTime(), s.frequencyHours()
            );
        }
        return new MedicationResponse(
            m.getId().value().toString(),
            m.getPatientId().value().toString(),
            m.getName(),
            m.getDosage(),
            m.getInstructions(),
            m.getType().name(),
            schedDto,
            m.isActive()
        );
    }
}
