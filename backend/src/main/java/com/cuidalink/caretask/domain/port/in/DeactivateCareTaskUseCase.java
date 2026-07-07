package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTaskId;

public interface DeactivateCareTaskUseCase {
    void deactivate(CareTaskId taskId, UserId requesterId);
}
