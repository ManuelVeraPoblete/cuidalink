package com.cuidalink.auth.domain.port.in;

public interface LoginUserUseCase {
    String login(String email, String password); // retorna JWT
}
