import { MedicationLog } from '@/domain/entities';
import { MedicationRepository } from '@/domain/repositories/MedicationRepository';

export interface ConfirmMedicationLogUseCase {
  confirm(logId: string): Promise<MedicationLog>;
  miss(logId: string): Promise<MedicationLog>;
}

export class ConfirmMedicationLogUseCaseImpl implements ConfirmMedicationLogUseCase {
  constructor(private readonly repo: MedicationRepository) {}
  confirm(logId: string) { return this.repo.confirmLog(logId); }
  miss(logId: string)    { return this.repo.missLog(logId); }
}
