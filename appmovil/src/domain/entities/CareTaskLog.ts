import { CareTaskPriority } from './CareTask';

export type CareTaskLogStatus = 'PENDING' | 'DONE';

export interface CareTaskLog {
  id: string;
  careTaskId: string;
  taskName: string;
  instructions: string;
  priority: CareTaskPriority;
  scheduledAt: string;
  status: CareTaskLogStatus;
}
