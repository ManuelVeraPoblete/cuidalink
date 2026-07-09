package com.cuidalink.patient.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.patient.adapter.in.rest.dto.InvitationResponse;
import com.cuidalink.patient.adapter.in.rest.dto.JoinCodeRequest;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.in.GenerateInvitationUseCase;
import com.cuidalink.patient.domain.port.in.JoinWithCodeUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
public class InvitationController {

    private final GenerateInvitationUseCase generateUseCase;
    private final JoinWithCodeUseCase joinUseCase;

    public InvitationController(GenerateInvitationUseCase generateUseCase,
                                JoinWithCodeUseCase joinUseCase) {
        this.generateUseCase = generateUseCase;
        this.joinUseCase = joinUseCase;
    }

    @PostMapping("/patients/{id}/invitations")
    public ResponseEntity<InvitationResponse> generate(@AuthenticationPrincipal User user,
                                                       @PathVariable String id) {
        System.out.println(">>> IN  POST /patients/" + id + "/invitations");
        // Nota: no se loguea el código de invitación generado (es de un solo uso, equivalente a una credencial).
        var code = generateUseCase.generate(new PatientId(UUID.fromString(id)), user.getId());
        System.out.println(">>> OUT POST /patients/" + id + "/invitations -> 200");
        return ResponseEntity.ok(new InvitationResponse(code.code(), code.expiresAt().toString()));
    }

    @PostMapping("/invitations/join")
    public ResponseEntity<Void> join(@AuthenticationPrincipal User user,
                                     @Validated @RequestBody JoinCodeRequest req) {
        System.out.println(">>> IN  POST /invitations/join userId=" + user.getId().value());
        // Nota: no se loguea el código de invitación recibido (es de un solo uso, equivalente a una credencial).
        joinUseCase.join(req.code(), user.getId());
        System.out.println(">>> OUT POST /invitations/join -> 204");
        return ResponseEntity.noContent().build();
    }
}
