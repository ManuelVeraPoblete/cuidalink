package com.cuidalink.patient.domain.model;

public class PatientContact {

    private final PatientContactId id;
    private final PatientId patientId;
    private String name;
    private PatientContactCategory category;
    private String relationship;
    private String phone;
    private String email;
    private String note;
    private boolean priority;

    public PatientContact(PatientContactId id, PatientId patientId, String name,
                          PatientContactCategory category, String relationship, String phone,
                          String email, String note, boolean priority) {
        this.id = id;
        this.patientId = patientId;
        this.name = name;
        this.category = category;
        this.relationship = relationship;
        this.phone = phone;
        this.email = email;
        this.note = note;
        this.priority = priority;
    }

    public void update(String name, PatientContactCategory category, String relationship,
                       String phone, String email, String note, boolean priority) {
        this.name = name;
        this.category = category;
        this.relationship = relationship;
        this.phone = phone;
        this.email = email;
        this.note = note;
        this.priority = priority;
    }

    public PatientContactId getId() { return id; }
    public PatientId getPatientId() { return patientId; }
    public String getName() { return name; }
    public PatientContactCategory getCategory() { return category; }
    public String getRelationship() { return relationship; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getNote() { return note; }
    public boolean isPriority() { return priority; }
}
