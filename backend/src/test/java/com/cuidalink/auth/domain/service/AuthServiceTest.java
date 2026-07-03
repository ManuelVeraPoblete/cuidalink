// src/test/java/com/cuidalink/auth/domain/service/AuthServiceTest.java
package com.cuidalink.auth.domain.service;

import com.cuidalink.auth.domain.model.*;
import com.cuidalink.auth.domain.port.in.RegisterUserUseCase.RegisterUserCommand;
import com.cuidalink.auth.domain.port.in.UpdateProfileUseCase;
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

    @Test
    void updateProfile_updatesAllFieldsAndReturnsUser() {
        var userId = new UserId(java.util.UUID.randomUUID());
        var user = new User(userId, "Ana", new Email("ana@test.com"), "hashed");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var command = new UpdateProfileUseCase.UpdateProfileCommand(
            "Ana López", "ana@test.com", "+56912345678", "Av. Siempre Viva 123",
            "Cuidado geriátrico", "5 años");

        var updated = sut.execute(userId, command);

        assertThat(updated.getName()).isEqualTo("Ana López");
        assertThat(updated.getPhone()).isEqualTo("+56912345678");
        assertThat(updated.getAddress()).isEqualTo("Av. Siempre Viva 123");
        assertThat(updated.getSpecialty()).isEqualTo("Cuidado geriátrico");
        assertThat(updated.getExperience()).isEqualTo("5 años");
        verify(userRepository).save(user);
    }

    @Test
    void updateProfile_allowsKeepingSameEmail() {
        var userId = new UserId(java.util.UUID.randomUUID());
        var user = new User(userId, "Ana", new Email("ana@test.com"), "hashed");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var command = new UpdateProfileUseCase.UpdateProfileCommand(
            "Ana", "ana@test.com", null, null, null, null);

        var updated = sut.execute(userId, command);

        assertThat(updated.getEmail().value()).isEqualTo("ana@test.com");
        verify(userRepository, never()).findByEmail(any());
    }

    @Test
    void updateProfile_throwsWhenEmailUsedByAnotherUser() {
        var userId = new UserId(java.util.UUID.randomUUID());
        var user = new User(userId, "Ana", new Email("ana@test.com"), "hashed");
        var otherUser = new User(new UserId(java.util.UUID.randomUUID()), "Pedro",
            new Email("pedro@test.com"), "hashed2");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.findByEmail("pedro@test.com")).thenReturn(Optional.of(otherUser));

        var command = new UpdateProfileUseCase.UpdateProfileCommand(
            "Ana", "pedro@test.com", null, null, null, null);

        assertThatThrownBy(() -> sut.execute(userId, command))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ya está en uso");
    }
}
