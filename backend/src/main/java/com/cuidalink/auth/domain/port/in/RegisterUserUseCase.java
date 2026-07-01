package com.cuidalink.auth.domain.port.in;

public interface RegisterUserUseCase {
    record RegisterUserCommand(String name, String email, String password) {}
    String execute(RegisterUserCommand command); // retorna JWT
}
