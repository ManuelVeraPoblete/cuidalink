package com.cuidalink.bitacora.domain.model;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDateTime;

public class BitacoraEntry {

    private final BitacoraEntryId id;
    private final PatientId patientId;
    private final UserId authorId;
    private final BitacoraEntryType type;
    private final String note;
    private final LocalDateTime recordedAt;

    public BitacoraEntry(BitacoraEntryId id, PatientId patientId, UserId authorId,
                         BitacoraEntryType type, String note, LocalDateTime recordedAt) {
        this.id = id;
        this.patientId = patientId;
        this.authorId = authorId;
        this.type = type;
        this.note = note;
        this.recordedAt = recordedAt;
    }

    public BitacoraEntryId getId() { return id; }
    public PatientId getPatientId() { return patientId; }
    public UserId getAuthorId() { return authorId; }
    public BitacoraEntryType getType() { return type; }
    public String getNote() { return note; }
    public LocalDateTime getRecordedAt() { return recordedAt; }
}
