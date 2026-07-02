package com.cuidalink.report.adapter.out.pdf;

import com.cuidalink.report.domain.model.Report;
import com.cuidalink.report.domain.port.out.ReportGenerator;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import org.springframework.stereotype.Component;

@Component
public class ITextReportGeneratorAdapter implements ReportGenerator {

    @Override
    public byte[] generatePdf(Report report) {
        try (var baos = new java.io.ByteArrayOutputStream()) {
            var writer = new PdfWriter(baos);
            var pdfDoc = new PdfDocument(writer);
            var document = new Document(pdfDoc);

            // Título
            document.add(new Paragraph("Informe Médico — " + report.getPatientName())
                .setFontSize(18).setBold());
            document.add(new Paragraph("Período: " + report.getPeriod().from()
                + " al " + report.getPeriod().to()).setFontSize(11));
            document.add(new Paragraph("Generado por: " + report.getGeneratedByName()
                + " el " + report.getGeneratedAt().toLocalDate()).setFontSize(11));
            document.add(new Paragraph("\n"));

            // Tabla de medicamentos
            document.add(new Paragraph("Medicamentos").setFontSize(14).setBold());
            var medTable = new Table(4).useAllAvailableWidth();
            medTable.addHeaderCell("Medicamento");
            medTable.addHeaderCell("Programado");
            medTable.addHeaderCell("Estado");
            medTable.addHeaderCell("Administrado por");
            for (var entry : report.getMedicationSummary()) {
                medTable.addCell(entry.medicationName());
                medTable.addCell(entry.scheduledAt().toString());
                medTable.addCell(entry.status());
                medTable.addCell(entry.administeredBy());
            }
            document.add(medTable);
            document.add(new Paragraph("\n"));

            // Tabla de signos vitales
            document.add(new Paragraph("Signos Vitales").setFontSize(14).setBold());
            var vitalTable = new Table(4).useAllAvailableWidth();
            vitalTable.addHeaderCell("Fecha/Hora");
            vitalTable.addHeaderCell("Registrado por");
            vitalTable.addHeaderCell("Signo vital");
            vitalTable.addHeaderCell("Valor");
            for (var rec : report.getVitalSummary()) {
                for (var m : rec.measurements()) {
                    vitalTable.addCell(rec.recordedAt().toString());
                    vitalTable.addCell(rec.recordedBy());
                    vitalTable.addCell(m.vitalName() + " (" + m.unit() + ")");
                    var valueCell = new Cell().add(new Paragraph(m.value()));
                    if (m.outOfRange()) valueCell.setBackgroundColor(new DeviceRgb(255, 200, 200));
                    vitalTable.addCell(valueCell);
                }
            }
            document.add(vitalTable);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF", e);
        }
    }
}
