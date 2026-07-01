package com.cuidalink.auth.domain.port.in;

import com.cuidalink.auth.domain.model.User;

public interface AuthenticateUserUseCase {
    User authenticate(String firebaseIdToken);
}
