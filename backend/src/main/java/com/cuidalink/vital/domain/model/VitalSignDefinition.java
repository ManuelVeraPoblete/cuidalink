package com.cuidalink.vital.domain.model;

import com.cuidalink.patient.domain.model.PatientId;

public class VitalSignDefinition {

    private final VitalSignDefinitionId id;
    private final PatientId patientId;
    private String name;
    private String unit;
    private Double normalRangeMin;
    private Double normalRangeMax;

    public VitalSignDefinition(VitalSignDefinitionId id, PatientId patientId, String name,
                               String unit, Double normalRangeMin, Double normalRangeMax) {
        this.id = id;
        this.patientId = patientId;
        this.name = name;
        this.unit = unit;
        this.normalRangeMin = normalRangeMin;
        this.normalRangeMax = normalRangeMax;
    }

    public void update(String name, String unit, Double normalRangeMin, Double normalRangeMax) {
        this.name = name;
        this.unit = unit;
        this.normalRangeMin = normalRangeMin;
        this.normalRangeMax = normalRangeMax;
    }

    public VitalSignDefinitionId getId() { return id; }
    public PatientId getPatientId() { return patientId; }
    public String getName() { return name; }
    public String getUnit() { return unit; }
    public Double getNormalRangeMin() { return normalRangeMin; }
    public Double getNormalRangeMax() { return normalRangeMax; }
}
