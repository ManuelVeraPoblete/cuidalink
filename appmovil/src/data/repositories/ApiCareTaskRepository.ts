import apiClient from '@/data/http/apiClient';
import { CareTaskRepository, CreateCareTaskData } from '@/domain/repositories/CareTaskRepository';
import { CareTask, CareTaskLog } from '@/domain/entities';

export class ApiCareTaskRepository implements CareTaskRepository {
  async listTasks(patientId: string): Promise<CareTask[]> {
    const res = await apiClient.get<CareTask[]>(`/patients/${patientId}/tasks`);
    return res.data;
  }

  async createTask(patientId: string, data: CreateCareTaskData): Promise<CareTask> {
    const res = await apiClient.post<CareTask>(`/patients/${patientId}/tasks`, {
      name: data.name,
      instructions: data.instructions,
      priority: data.priority,
      reminderActive: data.reminderActive,
      schedule: {
        time: data.time,
        scheduleType: data.scheduleType,
        daysOfWeek: data.daysOfWeek,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
    return res.data;
  }

  async getDailyLogs(patientId: string, date: string): Promise<CareTaskLog[]> {
    const res = await apiClient.get<CareTaskLog[]>(`/patients/${patientId}/task-logs?date=${date}`);
    return res.data;
  }

  async completeLog(logId: string): Promise<CareTaskLog> {
    const res = await apiClient.patch<CareTaskLog>(`/task-logs/${logId}/complete`);
    return res.data;
  }
}
