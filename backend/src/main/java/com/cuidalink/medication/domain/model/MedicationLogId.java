package com.cuidalink.medication.domain.model;

import java.util.UUID;

public record MedicationLogId(UUID value) {
    public static MedicationLogId generate() { return new MedicationLogId(UUID.randomUUID()); }
}
