package com.cuidalink.vital.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.adapter.in.rest.dto.*;
import com.cuidalink.vital.domain.model.VitalSignDefinition;
import com.cuidalink.vital.domain.model.VitalSignDefinitionId;
import com.cuidalink.vital.domain.port.in.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{patientId}/vital-definitions")
public class VitalDefinitionController {

    private final CreateVitalDefinitionUseCase createUseCase;
    private final UpdateVitalDefinitionUseCase updateUseCase;
    private final DeleteVitalDefinitionUseCase deleteUseCase;
    private final ListVitalDefinitionsUseCase listUseCase;

    public VitalDefinitionController(CreateVitalDefinitionUseCase createUseCase,
                                     UpdateVitalDefinitionUseCase updateUseCase,
                                     DeleteVitalDefinitionUseCase deleteUseCase,
                                     ListVitalDefinitionsUseCase listUseCase) {
        this.createUseCase = createUseCase;
        this.updateUseCase = updateUseCase;
        this.deleteUseCase = deleteUseCase;
        this.listUseCase = listUseCase;
    }

    @PostMapping
    public ResponseEntity<VitalDefinitionResponse> create(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @Validated @RequestBody CreateVitalDefinitionRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var def = createUseCase.execute(new CreateVitalDefinitionUseCase.CreateVitalDefinitionCommand(
            patId, req.name(), req.unit(), req.normalRangeMin(), req.normalRangeMax(), user.getId()));
        return ResponseEntity.status(201).body(toResponse(def));
    }

    @GetMapping
    public ResponseEntity<List<VitalDefinitionResponse>> list(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId) {
        var patId = new PatientId(UUID.fromString(patientId));
        return ResponseEntity.ok(listUseCase.list(patId, user.getId())
            .stream().map(this::toResponse).toList());
    }

    @PutMapping("/{defId}")
    public ResponseEntity<VitalDefinitionResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String defId,
            @Validated @RequestBody UpdateVitalDefinitionRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var def = updateUseCase.execute(new UpdateVitalDefinitionUseCase.UpdateVitalDefinitionCommand(
            patId,
            new VitalSignDefinitionId(UUID.fromString(defId)),
            req.name(), req.unit(), req.normalRangeMin(), req.normalRangeMax(),
            user.getId()));
        return ResponseEntity.ok(toResponse(def));
    }

    @DeleteMapping("/{defId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String defId) {
        var patId = new PatientId(UUID.fromString(patientId));
        deleteUseCase.delete(
            new VitalSignDefinitionId(UUID.fromString(defId)), patId, user.getId());
        return ResponseEntity.noContent().build();
    }

    // ---- Helpers ----

    private VitalDefinitionResponse toResponse(VitalSignDefinition def) {
        return new VitalDefinitionResponse(
            def.getId().value().toString(),
            def.getPatientId().value().toString(),
            def.getName(),
            def.getUnit(),
            def.getNormalRangeMin(),
            def.getNormalRangeMax()
        );
    }
}
