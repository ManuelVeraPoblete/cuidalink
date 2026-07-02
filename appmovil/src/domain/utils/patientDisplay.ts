import { MedicationLog } from '@/domain/entities';

export function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  return today.getFullYear() - birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
}

export function nextPendingLog(logs: MedicationLog[] | undefined): MedicationLog | undefined {
  if (!logs) return undefined;
  return logs
    .filter((l) => l.status === 'PENDING')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
}

export function needsAttention(logs: MedicationLog[] | undefined): boolean {
  return !!logs?.some((l) => l.status === 'ESCALATED' || l.status === 'MISSED');
}
