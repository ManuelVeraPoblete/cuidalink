package com.cuidalink.patient.domain.model;

import java.util.UUID;

public record PatientContactId(UUID value) {
    public static PatientContactId generate() { return new PatientContactId(UUID.randomUUID()); }
}
