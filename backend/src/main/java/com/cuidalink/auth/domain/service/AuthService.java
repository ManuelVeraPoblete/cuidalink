package com.cuidalink.auth.domain.service;

import com.cuidalink.auth.domain.model.*;
import com.cuidalink.auth.domain.port.in.*;
import com.cuidalink.auth.domain.port.out.*;
import org.springframework.stereotype.Service;

@Service
public class AuthService implements RegisterUserUseCase, LoginUserUseCase, UpdateFcmTokenUseCase, UpdateProfileUseCase {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtProvider jwtProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
    }

    @Override
    public String execute(RegisterUserCommand command) {
        userRepository.findByEmail(command.email()).ifPresent(u -> {
            throw new IllegalStateException("Usuario ya existe con este email");
        });
        var hash = passwordEncoder.encode(command.password());
        var user = new User(UserId.generate(), command.name(), new Email(command.email()), hash);
        var saved = userRepository.save(user);
        return jwtProvider.generate(saved.getId(), saved.getEmail().value());
    }

    @Override
    public String login(String email, String password) {
        System.out.println(">>> AuthService.login email=" + email);
        var user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("credenciales incorrectas"));
        System.out.println(">>> Usuario encontrado hash=" + user.getPasswordHash());
        boolean matches = passwordEncoder.matches(password, user.getPasswordHash());
        System.out.println(">>> passwordEncoder.matches=" + matches);
        if (!matches) throw new IllegalArgumentException("credenciales incorrectas");
        String token = jwtProvider.generate(user.getId(), user.getEmail().value());
        System.out.println(">>> Token generado OK");
        return token;
    }

    @Override
    public void update(UserId userId, String fcmToken) {
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        user.updateFcmToken(new FcmToken(fcmToken));
        userRepository.save(user);
    }

    @Override
    public User execute(UserId userId, UpdateProfileCommand command) {
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        if (!command.email().equals(user.getEmail().value())) {
            userRepository.findByEmail(command.email()).ifPresent(existing -> {
                if (!existing.getId().equals(userId)) {
                    throw new IllegalStateException("Este correo ya está en uso");
                }
            });
        }
        user.updateProfile(command.name(), new Email(command.email()), command.phone(),
            command.address(), command.specialty(), command.experience());
        return userRepository.save(user);
    }
}
