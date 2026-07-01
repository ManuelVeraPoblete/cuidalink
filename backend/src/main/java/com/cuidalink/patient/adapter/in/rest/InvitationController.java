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
        var code = generateUseCase.generate(new PatientId(UUID.fromString(id)), user.getId());
        return ResponseEntity.ok(new InvitationResponse(code.code(), code.expiresAt().toString()));
    }

    @PostMapping("/invitations/join")
    public ResponseEntity<Void> join(@AuthenticationPrincipal User user,
                                     @Validated @RequestBody JoinCodeRequest req) {
        joinUseCase.join(req.code(), user.getId());
        return ResponseEntity.noContent().build();
    }
}
