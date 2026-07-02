package com.cuidalink.auth.domain.port.out;

import com.cuidalink.auth.domain.model.UserId;

public interface JwtProvider {
    String generate(UserId userId, String email);
    UserId validate(String token); // lanza IllegalArgumentException si inválido
}
