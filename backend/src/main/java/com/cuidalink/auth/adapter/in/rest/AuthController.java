package com.cuidalink.auth.adapter.in.rest;

import com.cuidalink.auth.adapter.in.rest.dto.*;
import com.cuidalink.auth.domain.model.User;
import com.cuidalink.auth.domain.port.in.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final RegisterUserUseCase registerUseCase;
    private final LoginUserUseCase loginUseCase;
    private final UpdateFcmTokenUseCase fcmTokenUseCase;
    private final UpdateProfileUseCase updateProfileUseCase;

    public AuthController(RegisterUserUseCase r, LoginUserUseCase l, UpdateFcmTokenUseCase f,
                           UpdateProfileUseCase u) {
        this.registerUseCase = r;
        this.loginUseCase = l;
        this.fcmTokenUseCase = f;
        this.updateProfileUseCase = u;
    }

    @PostMapping("/register")
    public ResponseEntity<TokenResponse> register(@Validated @RequestBody RegisterRequest req) {
        String token = registerUseCase.execute(
            new RegisterUserUseCase.RegisterUserCommand(req.name(), req.email(), req.password()));
        return ResponseEntity.ok(new TokenResponse(token));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Validated @RequestBody LoginRequest req) {
        String token = loginUseCase.login(req.email(), req.password());
        return ResponseEntity.ok(new TokenResponse(token));
    }

    @PostMapping("/fcm-token")
    public ResponseEntity<Void> updateFcmToken(@AuthenticationPrincipal User user,
                                                @Validated @RequestBody FcmTokenRequest req) {
        fcmTokenUseCase.update(user.getId(), req.token());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(toResponse(user));
    }

    @PatchMapping("/me")
    public ResponseEntity<AuthResponse> updateMe(@AuthenticationPrincipal User user,
                                                  @Validated @RequestBody UpdateProfileRequest req) {
        var updated = updateProfileUseCase.execute(user.getId(),
            new UpdateProfileUseCase.UpdateProfileCommand(
                req.name(), req.email(), req.phone(), req.address(), req.specialty(), req.experience()));
        return ResponseEntity.ok(toResponse(updated));
    }

    private AuthResponse toResponse(User u) {
        return new AuthResponse(u.getId().value().toString(), u.getName(), u.getEmail().value(),
            u.getRole().name(), u.getPhone(), u.getAddress(), u.getSpecialty(), u.getExperience());
    }
}
