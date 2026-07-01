package com.cuidalink.vital.domain.model;

import java.util.UUID;

public record VitalSignDefinitionId(UUID value) {
    public static VitalSignDefinitionId generate() { return new VitalSignDefinitionId(UUID.randomUUID()); }
}
