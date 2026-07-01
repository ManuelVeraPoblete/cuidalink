import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { ReportRepository } from '@/domain/repositories/ReportRepository';

export class ApiReportRepository implements ReportRepository {
  async downloadPdf(patientId: string, from: string, to: string): Promise<string> {
    const token = await SecureStore.getItemAsync('jwt_token');
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    const url = `${baseUrl}/patients/${patientId}/reports/pdf?from=${from}&to=${to}`;
    const destFile = new File(Paths.document, `informe-cuidalink-${from}-${to}.pdf`);

    const file = await File.downloadFileAsync(url, destFile, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf' });
    }
    return file.uri;
  }
}
