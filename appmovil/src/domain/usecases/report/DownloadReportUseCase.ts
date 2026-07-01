import { ReportRepository } from '@/domain/repositories/ReportRepository';

export interface DownloadReportUseCase {
  execute(patientId: string, from: string, to: string): Promise<string>;
}

export class DownloadReportUseCaseImpl implements DownloadReportUseCase {
  constructor(private readonly repo: ReportRepository) {}
  execute(patientId: string, from: string, to: string) {
    return this.repo.downloadPdf(patientId, from, to);
  }
}
