package com.cuidalink.patient.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.adapter.in.rest.dto.CollaboratorResponse;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.in.ListCollaboratorsUseCase;
import com.cuidalink.patient.domain.port.in.RevokeCollaboratorUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{patientId}/collaborators")
public class CollaboratorController {

    private final ListCollaboratorsUseCase listUseCase;
    private final RevokeCollaboratorUseCase revokeUseCase;

    public CollaboratorController(ListCollaboratorsUseCase listUseCase,
                                  RevokeCollaboratorUseCase revokeUseCase) {
        this.listUseCase = listUseCase;
        this.revokeUseCase = revokeUseCase;
    }

    @GetMapping
    public ResponseEntity<List<CollaboratorResponse>> list(@AuthenticationPrincipal User user,
                                                           @PathVariable String patientId) {
        System.out.println(">>> IN  GET /patients/" + patientId + "/collaborators");
        var collaborators = listUseCase.listCollaborators(
            new PatientId(UUID.fromString(patientId)), user.getId());
        System.out.println(">>> OUT GET /patients/" + patientId + "/collaborators -> 200 count=" + collaborators.size());
        return ResponseEntity.ok(collaborators.stream()
            .map(c -> new CollaboratorResponse(
                c.userId().value().toString(),
                c.joinedAt().toString()))
            .toList());
    }

    @DeleteMapping("/{collaboratorId}")
    public ResponseEntity<Void> revoke(@AuthenticationPrincipal User user,
                                       @PathVariable String patientId,
                                       @PathVariable String collaboratorId) {
        System.out.println(">>> IN  DELETE /patients/" + patientId + "/collaborators/" + collaboratorId);
        revokeUseCase.revoke(
            new PatientId(UUID.fromString(patientId)),
            new UserId(UUID.fromString(collaboratorId)),
            user.getId()
        );
        System.out.println(">>> OUT DELETE /patients/" + patientId + "/collaborators/" + collaboratorId + " -> 204");
        return ResponseEntity.noContent().build();
    }
}
