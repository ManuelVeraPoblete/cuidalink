import { useMemo } from 'react';
import { ApiAuthRepository } from '@/data/repositories/ApiAuthRepository';
import { ApiPatientRepository } from '@/data/repositories/ApiPatientRepository';
import { ApiMedicationRepository } from '@/data/repositories/ApiMedicationRepository';
import { ApiVitalRepository } from '@/data/repositories/ApiVitalRepository';
import { ApiReportRepository } from '@/data/repositories/ApiReportRepository';
import { ApiCareTaskRepository } from '@/data/repositories/ApiCareTaskRepository';
import { ApiPatientContactRepository } from '@/data/repositories/ApiPatientContactRepository';
import { ApiBitacoraEntryRepository } from '@/data/repositories/ApiBitacoraEntryRepository';
import { LoginUseCaseImpl } from '@/domain/usecases/auth/LoginUseCase';
import { RegisterUseCaseImpl } from '@/domain/usecases/auth/RegisterUseCase';
import { ConfirmMedicationLogUseCaseImpl } from '@/domain/usecases/medication/ConfirmMedicationLogUseCase';
import { DownloadReportUseCaseImpl } from '@/domain/usecases/report/DownloadReportUseCase';

export function useInjection() {
  return useMemo(() => {
    const authRepo = new ApiAuthRepository();
    const patientRepo = new ApiPatientRepository();
    const medicationRepo = new ApiMedicationRepository();
    const vitalRepo = new ApiVitalRepository();
    const reportRepo = new ApiReportRepository();
    const careTaskRepo = new ApiCareTaskRepository();
    const patientContactRepo = new ApiPatientContactRepository();
    const bitacoraEntryRepo = new ApiBitacoraEntryRepository();

    return {
      authRepo,
      patientRepo,
      medicationRepo,
      vitalRepo,
      reportRepo,
      careTaskRepo,
      patientContactRepo,
      bitacoraEntryRepo,
      loginUseCase: new LoginUseCaseImpl(authRepo),
      registerUseCase: new RegisterUseCaseImpl(authRepo),
      confirmMedLogUseCase: new ConfirmMedicationLogUseCaseImpl(medicationRepo),
      downloadReportUseCase: new DownloadReportUseCaseImpl(reportRepo),
    };
  }, []);
}
