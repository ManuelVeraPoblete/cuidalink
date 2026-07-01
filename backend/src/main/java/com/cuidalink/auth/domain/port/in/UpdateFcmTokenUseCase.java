package com.cuidalink.auth.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;

public interface UpdateFcmTokenUseCase {
    void update(UserId userId, String fcmToken);
}
