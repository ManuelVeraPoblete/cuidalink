package com.cuidalink.medication.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.MedicationId;

public interface DeactivateMedicationUseCase {
    void deactivate(MedicationId medicationId, UserId requesterId);
}
