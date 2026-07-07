package com.cuidalink.caretask.domain.model;

import java.util.UUID;

public record CareTaskId(UUID value) {
    public static CareTaskId generate() { return new CareTaskId(UUID.randomUUID()); }
}
