package com.cuidalink.auth.adapter.out.persistence;

import com.cuidalink.auth.domain.model.*;
import com.cuidalink.auth.domain.port.out.UserRepository;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class JpaUserRepositoryAdapter implements UserRepository {

    private final SpringUserRepository jpa;

    public JpaUserRepositoryAdapter(SpringUserRepository jpa) { this.jpa = jpa; }

    @Override
    public User save(User user) {
        jpa.save(toJpa(user));
        return user;
    }

    @Override
    public Optional<User> findById(UserId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpa.findByEmail(email).map(this::toDomain);
    }

    private UserJpaEntity toJpa(User u) {
        var e = new UserJpaEntity();
        e.setId(u.getId().value().toString());
        e.setName(u.getName());
        e.setEmail(u.getEmail().value());
        e.setPasswordHash(u.getPasswordHash());
        e.setFcmToken(u.getFcmToken() != null ? u.getFcmToken().value() : null);
        e.setRole(u.getRole().name());
        e.setPhone(u.getPhone());
        e.setAddress(u.getAddress());
        e.setSpecialty(u.getSpecialty());
        e.setExperience(u.getExperience());
        return e;
    }

    private User toDomain(UserJpaEntity e) {
        var user = new User(
            new UserId(UUID.fromString(e.getId())),
            e.getName(),
            new Email(e.getEmail()),
            e.getPasswordHash(),
            UserRole.valueOf(e.getRole())
        );
        if (e.getFcmToken() != null) user.updateFcmToken(new FcmToken(e.getFcmToken()));
        user.updateProfile(e.getName(), new Email(e.getEmail()), e.getPhone(), e.getAddress(),
            e.getSpecialty(), e.getExperience());
        return user;
    }
}
