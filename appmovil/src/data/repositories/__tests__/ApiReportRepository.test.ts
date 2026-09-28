import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ApiReportRepository } from '../ApiReportRepository';
import { ReportDownloadError } from '@/domain/repositories/ReportRepository';

jest.mock('expo-file-system', () => ({
  Paths: { document: 'doc-dir' },
  File: Object.assign(jest.fn().mockImplementation((dir: string, name: string) => ({ uri: `${dir}/${name}` })), {
    downloadFileAsync: jest.fn(),
  }),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

const downloadFileAsync = (File as unknown as { downloadFileAsync: jest.Mock }).downloadFileAsync;

describe('ApiReportRepository.downloadPdf', () => {
  beforeEach(() => jest.clearAllMocks());

  it('descarga sobrescribiendo un informe previo del mismo rango y lo comparte', async () => {
    downloadFileAsync.mockResolvedValue({ uri: 'file:///informe.pdf' });

    const uri = await new ApiReportRepository().downloadPdf('p1', '2026-09-01', '2026-09-28');

    expect(uri).toBe('file:///informe.pdf');
    expect(downloadFileAsync).toHaveBeenCalledWith(
      expect.stringContaining('/patients/p1/reports/pdf?from=2026-09-01&to=2026-09-28'),
      expect.anything(),
      expect.objectContaining({ idempotent: true }),
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///informe.pdf', { mimeType: 'application/pdf' });
  });

  it.each([
    ['response has status: 400', 'REJECTED'],
    ['response has status 403', 'REJECTED'],
    ['response has status: 500', 'SERVER'],
    ['Unable to resolve host', 'NETWORK'],
  ])('traduce "%s" a ReportDownloadError %s', async (message, reason) => {
    downloadFileAsync.mockRejectedValue(new Error(message));

    const promise = new ApiReportRepository().downloadPdf('p1', '2026-09-01', '2026-09-28');

    await expect(promise).rejects.toBeInstanceOf(ReportDownloadError);
    await expect(promise).rejects.toMatchObject({ reason });
  });
});
