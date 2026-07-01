package com.cuidalink.vital.adapter.in.rest.dto;

public record VitalDefinitionResponse(
    String id,
    String patientId,
    String name,
    String unit,
    Double normalRangeMin,
    Double normalRangeMax
) {}
