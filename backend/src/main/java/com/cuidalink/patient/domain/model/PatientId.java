package com.cuidalink.patient.domain.model;

import java.util.UUID;

public record PatientId(UUID value) {
    public static PatientId generate() { return new PatientId(UUID.randomUUID()); }
}
