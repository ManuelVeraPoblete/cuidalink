package com.cuidalink.bitacora.adapter.in.rest.dto;

public record BitacoraEntryResponse(
    String id,
    String patientId,
    String authorId,
    String type,
    String note,
    String recordedAt
) {}
