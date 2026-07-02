package com.cuidalink.auth.domain.port.out;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.auth.domain.model.UserId;

import java.util.Optional;

public interface UserRepository {
    User save(User user);
    Optional<User> findById(UserId id);
    Optional<User> findByEmail(String email);
}
