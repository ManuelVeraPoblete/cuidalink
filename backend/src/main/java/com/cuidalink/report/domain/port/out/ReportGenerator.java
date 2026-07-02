package com.cuidalink.report.domain.port.out;

import com.cuidalink.report.domain.model.Report;

public interface ReportGenerator {
    byte[] generatePdf(Report report);
}
