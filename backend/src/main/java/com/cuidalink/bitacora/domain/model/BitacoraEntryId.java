package com.cuidalink.bitacora.domain.model;

import java.util.UUID;

public record BitacoraEntryId(UUID value) {
    public static BitacoraEntryId generate() { return new BitacoraEntryId(UUID.randomUUID()); }
}
