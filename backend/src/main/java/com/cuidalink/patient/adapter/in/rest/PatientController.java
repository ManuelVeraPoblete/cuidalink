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
        System.out.println(">>> IN  POST /patients userId=" + user.getId().value());
        // Nota: no se loguean healthCondition/allergies del body (regla de negocio, CLAUDE.md).
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
        System.out.println(">>> OUT POST /patients -> 201 id=" + patient.getId().value());
        return ResponseEntity.status(201).body(toResponse(patient, true));
    }

    @GetMapping
    public ResponseEntity<List<PatientResponse>> list(@AuthenticationPrincipal User user) {
        System.out.println(">>> IN  GET /patients userId=" + user.getId().value());
        var patients = listUseCase.listPatients(user.getId());
        System.out.println(">>> OUT GET /patients -> 200 count=" + patients.size());
        return ResponseEntity.ok(patients.stream()
            .map(p -> toResponse(p, p.isOwner(user.getId())))
            .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> get(@AuthenticationPrincipal User user,
                                               @PathVariable String id) {
        System.out.println(">>> IN  GET /patients/" + id);
        var patient = findUseCase.findPatient(new PatientId(UUID.fromString(id)), user.getId());
        System.out.println(">>> OUT GET /patients/" + id + " -> 200");
        return ResponseEntity.ok(toResponse(patient, patient.isOwner(user.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientResponse> update(@AuthenticationPrincipal User user,
                                                  @PathVariable String id,
                                                  @Validated @RequestBody UpdatePatientRequest req) {
        System.out.println(">>> IN  PUT /patients/" + id);
        // Nota: no se loguean healthCondition/allergies del body (regla de negocio, CLAUDE.md).
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
        System.out.println(">>> OUT PUT /patients/" + id + " -> 200");
        return ResponseEntity.ok(toResponse(patient, true));
    }

    @PatchMapping("/{id}/archive")
    public ResponseEntity<Void> archive(@AuthenticationPrincipal User user,
                                        @PathVariable String id) {
        System.out.println(">>> IN  PATCH /patients/" + id + "/archive");
        archiveUseCase.archivePatient(new PatientId(UUID.fromString(id)), user.getId());
        System.out.println(">>> OUT PATCH /patients/" + id + "/archive -> 204");
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
