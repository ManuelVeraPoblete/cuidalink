export type CareTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type CareTaskScheduleType = 'DAYS_OF_WEEK' | 'DATE_RANGE';

export interface CareTaskSchedule {
  time: string;
  scheduleType: CareTaskScheduleType;
  daysOfWeek: string[];
  startDate: string;
  endDate: string | null;
}

export interface CareTask {
  id: string;
  patientId: string;
  name: string;
  instructions: string;
  priority: CareTaskPriority;
  reminderActive: boolean;
  schedule: CareTaskSchedule;
  active: boolean;
}
