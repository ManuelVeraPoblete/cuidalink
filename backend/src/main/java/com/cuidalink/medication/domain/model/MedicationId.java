package com.cuidalink.medication.domain.model;

import java.util.UUID;

public record MedicationId(UUID value) {
    public static MedicationId generate() { return new MedicationId(UUID.randomUUID()); }
}
