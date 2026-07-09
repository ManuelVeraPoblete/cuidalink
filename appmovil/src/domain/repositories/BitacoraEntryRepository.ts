import { BitacoraEntry, BitacoraEntryType } from '@/domain/entities';

export interface BitacoraEntryRepository {
  listEntries(patientId: string, from: string, to: string, type?: BitacoraEntryType): Promise<BitacoraEntry[]>;
  createEntry(patientId: string, note: string): Promise<BitacoraEntry>;
}
