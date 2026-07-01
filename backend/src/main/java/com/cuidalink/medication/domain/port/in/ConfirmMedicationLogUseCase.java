package com.cuidalink.medication.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.LogStatus;
import com.cuidalink.medication.domain.model.MedicationLog;
import com.cuidalink.medication.domain.model.MedicationLogId;

public interface ConfirmMedicationLogUseCase {
    MedicationLog confirm(MedicationLogId logId, UserId userId, LogStatus newStatus);
}
