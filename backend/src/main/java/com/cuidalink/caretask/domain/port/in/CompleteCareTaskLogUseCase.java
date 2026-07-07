package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.caretask.domain.model.CareTaskLogId;

public interface CompleteCareTaskLogUseCase {
    CareTaskLog complete(CareTaskLogId logId, UserId requesterId);
}
