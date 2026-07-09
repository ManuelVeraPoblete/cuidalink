package com.cuidalink.bitacora.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.bitacora.adapter.in.rest.dto.BitacoraEntryResponse;
import com.cuidalink.bitacora.adapter.in.rest.dto.CreateBitacoraEntryRequest;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.bitacora.domain.model.BitacoraEntryType;
import com.cuidalink.bitacora.domain.port.in.CreateBitacoraEntryUseCase;
import com.cuidalink.bitacora.domain.port.in.ListBitacoraEntriesUseCase;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{patientId}/bitacora-entries")
public class BitacoraEntryController {

    private final CreateBitacoraEntryUseCase createUseCase;
    private final ListBitacoraEntriesUseCase listUseCase;

    public BitacoraEntryController(CreateBitacoraEntryUseCase createUseCase,
                                    ListBitacoraEntriesUseCase listUseCase) {
        this.createUseCase = createUseCase;
        this.listUseCase = listUseCase;
    }

    @PostMapping
    public ResponseEntity<BitacoraEntryResponse> create(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @Validated @RequestBody CreateBitacoraEntryRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var entry = createUseCase.create(new CreateBitacoraEntryUseCase.CreateBitacoraEntryCommand(
            patId, user.getId(), req.note()));
        return ResponseEntity.status(201).body(toResponse(entry));
    }

    @GetMapping
    public ResponseEntity<List<BitacoraEntryResponse>> list(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String type) {
        var patId = new PatientId(UUID.fromString(patientId));
        var entryType = type == null ? null : BitacoraEntryType.valueOf(type.toUpperCase());
        return ResponseEntity.ok(listUseCase.list(patId, from, to, entryType, user.getId())
            .stream().map(this::toResponse).toList());
    }

    private BitacoraEntryResponse toResponse(BitacoraEntry e) {
        return new BitacoraEntryResponse(
            e.getId().value().toString(),
            e.getPatientId().value().toString(),
            e.getAuthorId().value().toString(),
            e.getType().name(),
            e.getNote(),
            e.getRecordedAt().toString()
        );
    }
}
