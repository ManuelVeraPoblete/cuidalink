import { useMemo } from 'react';
import { ApiAuthRepository } from '@/data/repositories/ApiAuthRepository';
import { ApiPatientRepository } from '@/data/repositories/ApiPatientRepository';
import { ApiMedicationRepository } from '@/data/repositories/ApiMedicationRepository';
import { ApiVitalRepository } from '@/data/repositories/ApiVitalRepository';
import { ApiReportRepository } from '@/data/repositories/ApiReportRepository';
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

    return {
      authRepo,
      patientRepo,
      medicationRepo,
      vitalRepo,
      reportRepo,
      loginUseCase: new LoginUseCaseImpl(authRepo),
      registerUseCase: new RegisterUseCaseImpl(authRepo),
      confirmMedLogUseCase: new ConfirmMedicationLogUseCaseImpl(medicationRepo),
      downloadReportUseCase: new DownloadReportUseCaseImpl(reportRepo),
    };
  }, []);
}
