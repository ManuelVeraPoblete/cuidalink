package com.cuidalink.caretask.domain.model;

import java.util.UUID;

public record CareTaskLogId(UUID value) {
    public static CareTaskLogId generate() { return new CareTaskLogId(UUID.randomUUID()); }
}
