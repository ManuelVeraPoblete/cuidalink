export type ReportDownloadFailure = 'REJECTED' | 'SERVER' | 'NETWORK';

/** REJECTED: el backend rechazó la solicitud (sin permiso o rango inválido). */
export class ReportDownloadError extends Error {
  constructor(readonly reason: ReportDownloadFailure) {
    super(`No se pudo descargar el informe (${reason})`);
    this.name = 'ReportDownloadError';
  }
}

export interface ReportRepository {
  downloadPdf(patientId: string, from: string, to: string): Promise<string>;
}
