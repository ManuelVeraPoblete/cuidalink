package com.cuidalink.vital.adapter.out.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "vital_definitions")
public class VitalDefinitionJpaEntity {

    @Id
    private String id;
    private String patientId;
    private String name;
    private String unit;
    private Double normalRangeMin;
    private Double normalRangeMax;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Double getNormalRangeMin() { return normalRangeMin; }
    public void setNormalRangeMin(Double normalRangeMin) { this.normalRangeMin = normalRangeMin; }

    public Double getNormalRangeMax() { return normalRangeMax; }
    public void setNormalRangeMax(Double normalRangeMax) { this.normalRangeMax = normalRangeMax; }
}
