package com.cuidalink.patient.adapter.out.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "patient_contacts")
public class PatientContactJpaEntity {

    @Id
    private String id;
    private String patientId;
    private String name;
    private String category;
    private String relationship;
    private String phone;
    private String email;
    @Column(columnDefinition = "TEXT")
    private String note;
    private boolean priority;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public boolean isPriority() { return priority; }
    public void setPriority(boolean priority) { this.priority = priority; }
}
