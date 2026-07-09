import apiClient from '@/data/http/apiClient';
import { BitacoraEntryRepository } from '@/domain/repositories/BitacoraEntryRepository';
import { BitacoraEntry, BitacoraEntryType } from '@/domain/entities';

export class ApiBitacoraEntryRepository implements BitacoraEntryRepository {
  async listEntries(patientId: string, from: string, to: string, type?: BitacoraEntryType): Promise<BitacoraEntry[]> {
    const res = await apiClient.get<BitacoraEntry[]>(`/patients/${patientId}/bitacora-entries`, {
      params: { from, to, type },
    });
    return res.data;
  }

  async createEntry(patientId: string, note: string): Promise<BitacoraEntry> {
    const res = await apiClient.post<BitacoraEntry>(`/patients/${patientId}/bitacora-entries`, { note });
    return res.data;
  }
}
