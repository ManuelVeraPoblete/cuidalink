package com.cuidalink.auth.domain.port.in;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.auth.domain.model.UserId;

public interface UpdateProfileUseCase {
    User execute(UserId userId, UpdateProfileCommand command);

    record UpdateProfileCommand(String name, String email, String phone, String address,
                                 String specialty, String experience) {}
}
