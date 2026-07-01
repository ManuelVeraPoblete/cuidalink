export interface ReportRepository {
  downloadPdf(patientId: string, from: string, to: string): Promise<string>;
}
