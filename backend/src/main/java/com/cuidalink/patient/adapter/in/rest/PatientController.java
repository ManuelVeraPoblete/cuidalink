package com.cuidalink.patient.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.patient.adapter.in.rest.dto.*;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.in.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients")
public class PatientController {

    private final CreatePatientUseCase createUseCase;
    private final ListPatientsUseCase listUseCase;
    private final FindPatientUseCase findUseCase;
    private final UpdatePatientUseCase updateUseCase;
    private final ArchivePatientUseCase archiveUseCase;

    public PatientController(CreatePatientUseCase createUseCase,
                             ListPatientsUseCase listUseCase,
                             FindPatientUseCase findUseCase,
                             UpdatePatientUseCase updateUseCase,
                             ArchivePatientUseCase archiveUseCase) {
        this.createUseCase = createUseCase;
        this.listUseCase = listUseCase;
        this.findUseCase = findUseCase;
        this.updateUseCase = updateUseCase;
        this.archiveUseCase = archiveUseCase;
    }

    @PostMapping
    public ResponseEntity<PatientResponse> create(@AuthenticationPrincipal User user,
                                                  @Validated @RequestBody CreatePatientRequest req) {
        var patient = createUseCase.execute(new CreatePatientUseCase.CreatePatientCommand(
            req.fullName(),
            req.birthDate(),
            req.gender(),
            req.identificationNumber(),
            req.address(),
            req.healthInsurance(),
            req.bloodType(),
            req.healthCondition(),
            req.allergies(),
            new EmergencyContact(req.emergencyContact().name(), req.emergencyContact().phone()),
            user.getId()
        ));
        return ResponseEntity.status(201).body(toResponse(patient, true));
    }

    @GetMapping
    public ResponseEntity<List<PatientResponse>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(listUseCase.listPatients(user.getId()).stream()
            .map(p -> toResponse(p, p.isOwner(user.getId())))
            .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> get(@AuthenticationPrincipal User user,
                                               @PathVariable String id) {
        var patient = findUseCase.findPatient(new PatientId(UUID.fromString(id)), user.getId());
        return ResponseEntity.ok(toResponse(patient, patient.isOwner(user.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientResponse> update(@AuthenticationPrincipal User user,
                                                  @PathVariable String id,
                                                  @Validated @RequestBody UpdatePatientRequest req) {
        var patient = updateUseCase.updatePatient(new UpdatePatientUseCase.UpdatePatientCommand(
            new PatientId(UUID.fromString(id)),
            req.fullName(),
            req.birthDate(),
            req.gender(),
            req.identificationNumber(),
            req.address(),
            req.healthInsurance(),
            req.bloodType(),
            req.healthCondition(),
            req.allergies(),
            new EmergencyContact(req.emergencyContact().name(), req.emergencyContact().phone()),
            user.getId()
        ));
        return ResponseEntity.ok(toResponse(patient, true));
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<Void> archive(@AuthenticationPrincipal User user,
                                        @PathVariable String id) {
        archiveUseCase.archivePatient(new PatientId(UUID.fromString(id)), user.getId());
        return ResponseEntity.noContent().build();
    }

    private PatientResponse toResponse(Patient p, boolean isOwner) {
        return new PatientResponse(
            p.getId().value().toString(),
            p.getFullName(),
            p.getBirthDate().toString(),
            p.getGender().name(),
            p.getIdentificationNumber(),
            p.getAddress(),
            p.getHealthInsurance(),
            p.getBloodType(),
            new EmergencyContactDto(p.getEmergencyContact().name(), p.getEmergencyContact().phone()),
            isOwner,
            p.isActive()
        );
    }
}
