export type BitacoraEntryType = 'ENTRY' | 'OBSERVATION';

export interface BitacoraEntry {
  id: string;
  patientId: string;
  authorId: string;
  type: BitacoraEntryType;
  note: string;
  recordedAt: string;
}
