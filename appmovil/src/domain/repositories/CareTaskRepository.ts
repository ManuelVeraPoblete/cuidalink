import { CareTask, CareTaskLog, CareTaskPriority, CareTaskScheduleType } from '@/domain/entities';

export interface CreateCareTaskData {
  name: string;
  instructions: string;
  priority: CareTaskPriority;
  reminderActive: boolean;
  time: string;
  scheduleType: CareTaskScheduleType;
  daysOfWeek: string[];
  startDate: string | null;
  endDate: string | null;
}

export interface CareTaskRepository {
  listTasks(patientId: string): Promise<CareTask[]>;
  createTask(patientId: string, data: CreateCareTaskData): Promise<CareTask>;
  getDailyLogs(patientId: string, date: string): Promise<CareTaskLog[]>;
  completeLog(logId: string): Promise<CareTaskLog>;
}
