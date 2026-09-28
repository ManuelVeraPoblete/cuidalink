import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { ReportDownloadError, ReportRepository } from '@/domain/repositories/ReportRepository';

// expo-file-system solo expone el código HTTP dentro del mensaje: "response has status[:] 403".
function toReportError(err: unknown): ReportDownloadError {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/response has status:? (\d{3})/);
  if (!match) return new ReportDownloadError('NETWORK');
  return new ReportDownloadError(Number(match[1]) < 500 ? 'REJECTED' : 'SERVER');
}

export class ApiReportRepository implements ReportRepository {
  async downloadPdf(patientId: string, from: string, to: string): Promise<string> {
    const token = await SecureStore.getItemAsync('jwt_token');
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    const url = `${baseUrl}/patients/${patientId}/reports/pdf?from=${from}&to=${to}`;
    const destFile = new File(Paths.document, `informe-cuidalink-${from}-${to}.pdf`);

    let uri: string;
    try {
      const file = await File.downloadFileAsync(url, destFile, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
        idempotent: true,
      });
      uri = file.uri;
    } catch (err) {
      throw toReportError(err);
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    }
    return uri;
  }
}
