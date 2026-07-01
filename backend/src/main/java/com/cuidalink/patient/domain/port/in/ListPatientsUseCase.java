package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.Patient;

import java.util.List;

public interface ListPatientsUseCase {
    List<Patient> listPatients(UserId requesterId);
}
