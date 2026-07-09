package com.cuidalink.bitacora.adapter.out.persistence;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.bitacora.domain.model.BitacoraEntryId;
import com.cuidalink.bitacora.domain.model.BitacoraEntryType;
import com.cuidalink.bitacora.domain.port.out.BitacoraEntryRepository;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
public class JpaBitacoraEntryRepositoryAdapter implements BitacoraEntryRepository {

    private final SpringBitacoraEntryRepository jpa;

    public JpaBitacoraEntryRepositoryAdapter(SpringBitacoraEntryRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public BitacoraEntry save(BitacoraEntry entry) {
        jpa.save(toJpa(entry));
        return entry;
    }

    @Override
    public List<BitacoraEntry> findByPatientIdAndRecordedAtBetween(PatientId patientId, LocalDateTime from, LocalDateTime to) {
        return jpa.findByPatientIdAndRecordedAtBetween(patientId.value().toString(), from, to)
            .stream().map(this::toDomain).toList();
    }

    private BitacoraEntryJpaEntity toJpa(BitacoraEntry e) {
        var jpa = new BitacoraEntryJpaEntity();
        jpa.setId(e.getId().value().toString());
        jpa.setPatientId(e.getPatientId().value().toString());
        jpa.setAuthorId(e.getAuthorId().value().toString());
        jpa.setEntryType(e.getType().name());
        jpa.setNote(e.getNote());
        jpa.setRecordedAt(e.getRecordedAt());
        return jpa;
    }

    private BitacoraEntry toDomain(BitacoraEntryJpaEntity jpa) {
        return new BitacoraEntry(
            new BitacoraEntryId(UUID.fromString(jpa.getId())),
            new PatientId(UUID.fromString(jpa.getPatientId())),
            new UserId(UUID.fromString(jpa.getAuthorId())),
            BitacoraEntryType.valueOf(jpa.getEntryType()),
            jpa.getNote(),
            jpa.getRecordedAt()
        );
    }
}
