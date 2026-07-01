package com.cuidalink.report.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.report.domain.model.DateRange;
import com.cuidalink.report.domain.port.in.GeneratePatientReportUseCase;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{id}/reports")
public class ReportController {

    private final GeneratePatientReportUseCase generateUseCase;

    public ReportController(GeneratePatientReportUseCase generateUseCase) {
        this.generateUseCase = generateUseCase;
    }

    @GetMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generatePdf(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        var pdf = generateUseCase.generate(
            new PatientId(UUID.fromString(id)),
            user.getId(),
            new DateRange(from, to));

        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=informe-cuidalink.pdf")
            .body(pdf);
    }
}
