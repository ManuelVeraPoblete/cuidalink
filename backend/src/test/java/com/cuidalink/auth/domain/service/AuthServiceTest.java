// src/test/java/com/cuidalink/auth/domain/service/AuthServiceTest.java
package com.cuidalink.auth.domain.service;

import com.cuidalink.auth.domain.model.*;
import com.cuidalink.auth.domain.port.in.RegisterUserUseCase.RegisterUserCommand;
import com.cuidalink.auth.domain.port.out.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtProvider jwtProvider;
    AuthService sut;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new AuthService(userRepository, passwordEncoder, jwtProvider);
    }

    @Test
    void register_hashesPasswordAndReturnsToken() {
        var command = new RegisterUserCommand("Ana López", "ana@test.com", "secret123");
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtProvider.generate(any(), any())).thenReturn("jwt-token");

        String token = sut.execute(command);

        assertThat(token).isEqualTo("jwt-token");
        verify(passwordEncoder).encode("secret123");
        verify(userRepository).save(argThat(u -> u.getPasswordHash().equals("hashed")));
    }

    @Test
    void register_throwsWhenEmailAlreadyExists() {
        var command = new RegisterUserCommand("Ana López", "ana@test.com", "secret123");
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(mock(User.class)));

        assertThatThrownBy(() -> sut.execute(command))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ya existe");
    }

    @Test
    void login_returnsTokenOnValidCredentials() {
        var user = new User(UserId.generate(), "Ana", new Email("ana@test.com"), "hashed");
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "hashed")).thenReturn(true);
        when(jwtProvider.generate(any(), any())).thenReturn("jwt-token");

        String token = sut.login("ana@test.com", "secret123");

        assertThat(token).isEqualTo("jwt-token");
    }

    @Test
    void login_throwsOnInvalidPassword() {
        var user = new User(UserId.generate(), "Ana", new Email("ana@test.com"), "hashed");
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> sut.login("ana@test.com", "wrong"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("credenciales");
    }

    @Test
    void updateFcmToken_updatesUserToken() {
        var userId = new UserId(java.util.UUID.randomUUID());
        var user = new User(userId, "Ana", new Email("ana@test.com"), "hashed");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        sut.update(userId, "new-fcm-token");

        verify(userRepository).save(argThat(u -> u.getFcmToken() != null &&
            u.getFcmToken().value().equals("new-fcm-token")));
    }
}
