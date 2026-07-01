package com.cuidalink.vital.domain.model;

import java.util.UUID;

public record VitalRecordId(UUID value) {
    public static VitalRecordId generate() { return new VitalRecordId(UUID.randomUUID()); }
}
