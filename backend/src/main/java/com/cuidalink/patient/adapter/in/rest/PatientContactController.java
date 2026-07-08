package com.cuidalink.patient.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.patient.adapter.in.rest.dto.*;
import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientContactCategory;
import com.cuidalink.patient.domain.model.PatientContactId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.in.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{patientId}/contacts")
public class PatientContactController {

    private final CreatePatientContactUseCase createUseCase;
    private final UpdatePatientContactUseCase updateUseCase;
    private final ListPatientContactsUseCase listUseCase;

    public PatientContactController(CreatePatientContactUseCase createUseCase,
                                    UpdatePatientContactUseCase updateUseCase,
                                    ListPatientContactsUseCase listUseCase) {
        this.createUseCase = createUseCase;
        this.updateUseCase = updateUseCase;
        this.listUseCase = listUseCase;
    }

    @PostMapping
    public ResponseEntity<PatientContactResponse> create(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @Validated @RequestBody CreatePatientContactRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var contact = createUseCase.execute(new CreatePatientContactUseCase.CreatePatientContactCommand(
            patId, req.name(), PatientContactCategory.valueOf(req.category()), req.relationship(),
            req.phone(), req.email(), req.note(), req.priority(), user.getId()));
        return ResponseEntity.status(201).body(toResponse(contact));
    }

    @GetMapping
    public ResponseEntity<List<PatientContactResponse>> list(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId) {
        var patId = new PatientId(UUID.fromString(patientId));
        return ResponseEntity.ok(listUseCase.list(patId, user.getId())
            .stream().map(this::toResponse).toList());
    }

    @PutMapping("/{contactId}")
    public ResponseEntity<PatientContactResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String contactId,
            @Validated @RequestBody UpdatePatientContactRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var contact = updateUseCase.execute(new UpdatePatientContactUseCase.UpdatePatientContactCommand(
            patId, new PatientContactId(UUID.fromString(contactId)), req.name(),
            PatientContactCategory.valueOf(req.category()), req.relationship(), req.phone(),
            req.email(), req.note(), req.priority(), user.getId()));
        return ResponseEntity.ok(toResponse(contact));
    }

    private PatientContactResponse toResponse(PatientContact c) {
        return new PatientContactResponse(
            c.getId().value().toString(),
            c.getPatientId().value().toString(),
            c.getName(),
            c.getCategory().name(),
            c.getRelationship(),
            c.getPhone(),
            c.getEmail(),
            c.getNote(),
            c.isPriority()
        );
    }
}
