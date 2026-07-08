-- CuidaLink - DDL Completo
-- PostgreSQL 15 | Spring Boot 3.2 | SpringPhysicalNamingStrategy (camelCase → snake_case)
-- Generado desde las JPA entities del backend

-- ─────────────────────────────────────────────────────────
-- TABLAS
-- ─────────────────────────────────────────────────────────

-- Auth: usuarios registrados con email/password + JWT
CREATE TABLE users (
    id              VARCHAR(36)  PRIMARY KEY,                    -- UUID generado por la app
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,                       -- BCrypt hash de la contraseña
    fcm_token       VARCHAR(512),                                -- Token FCM push (nullable)
    role            VARCHAR(50)  NOT NULL DEFAULT 'CAREGIVER',   -- enum: CAREGIVER

    CONSTRAINT uq_users_email UNIQUE (email)
);

-- Pacientes gestionados por un cuidador principal
CREATE TABLE patients (
    id                       VARCHAR(36)  PRIMARY KEY,
    full_name                VARCHAR(255) NOT NULL,
    birth_date               DATE,
    gender                   VARCHAR(20),
    identification_number    VARCHAR(50),
    health_condition         TEXT,                               -- SENSIBLE: nunca exponer en logs
    allergies                TEXT,                               -- SENSIBLE: nunca exponer en logs
    emergency_contact_name   VARCHAR(255),
    emergency_contact_phone  VARCHAR(50),
    primary_caregiver_id     VARCHAR(36)  NOT NULL,             -- FK → users.id (owner)
    active                   BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_patients_caregiver FOREIGN KEY (primary_caregiver_id) REFERENCES users (id)
);

-- Colaboradores de un paciente (ElementCollection de Patient)
CREATE TABLE patient_collaborators (
    patient_id  VARCHAR(36)  NOT NULL,
    user_id     VARCHAR(36)  NOT NULL,
    joined_at   TIMESTAMP    NOT NULL,

    CONSTRAINT fk_collaborators_patient FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
);

-- Códigos de invitación de un paciente (ElementCollection de Patient)
-- 8 chars alfanuméricos mayúsculas, expiran 24h, single-use
CREATE TABLE patient_invitation_codes (
    patient_id  VARCHAR(36)   NOT NULL,
    code        VARCHAR(8)    NOT NULL,
    expires_at  TIMESTAMP     NOT NULL,
    used        BOOLEAN       NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_invitation_codes_patient FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
);

-- Medicamentos activos de un paciente
CREATE TABLE medications (
    id                      VARCHAR(36)  PRIMARY KEY,
    patient_id              VARCHAR(36)  NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    dosage                  VARCHAR(255),
    instructions            TEXT,
    active                  BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Schedule (embebido en la misma tabla)
    frequency               VARCHAR(30)  NOT NULL,              -- enum: DAILY, EVERY_X_DAYS, WEEKLY
    schedule_times          VARCHAR(255) NOT NULL,              -- "08:00,14:00" (HH:mm separados por coma)
    schedule_days_of_week   VARCHAR(255),                       -- "MONDAY,FRIDAY" (solo WEEKLY)
    schedule_start_date     DATE         NOT NULL,
    schedule_end_date       DATE,                               -- nullable = sin fecha fin
    schedule_interval_days  INTEGER,                            -- solo EVERY_X_DAYS

    CONSTRAINT fk_medications_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
);

-- Logs diarios de medicamentos (generados por cron a las 00:01)
CREATE TABLE medication_logs (
    id                  VARCHAR(36)  PRIMARY KEY,
    medication_id       VARCHAR(36)  NOT NULL,
    patient_id          VARCHAR(36)  NOT NULL,                  -- desnormalizado para queries eficientes
    scheduled_at        TIMESTAMP    NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING', -- enum: PENDING, CONFIRMED, MISSED, SKIPPED, ESCALATED
    administered_by_id  VARCHAR(36),                            -- nullable: quién confirmó
    confirmed_at        TIMESTAMP,                              -- nullable: cuándo se confirmó

    CONSTRAINT fk_med_logs_medication FOREIGN KEY (medication_id) REFERENCES medications (id),
    CONSTRAINT fk_med_logs_patient    FOREIGN KEY (patient_id)    REFERENCES patients (id),
    -- Idempotencia del scheduler: un solo log por medicamento+hora
    CONSTRAINT uq_med_logs_med_scheduled UNIQUE (medication_id, scheduled_at)
);

-- Definiciones de signos vitales por paciente (configuradas por el owner)
CREATE TABLE vital_definitions (
    id               VARCHAR(36)  PRIMARY KEY,
    patient_id       VARCHAR(36)  NOT NULL,
    name             VARCHAR(255) NOT NULL,
    unit             VARCHAR(50),
    normal_range_min DOUBLE PRECISION,                          -- nullable
    normal_range_max DOUBLE PRECISION,                          -- nullable

    CONSTRAINT fk_vital_def_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
);

-- Registros de signos vitales (INMUTABLES: no se actualizan, se crean nuevos)
CREATE TABLE vital_records (
    id             VARCHAR(36)  PRIMARY KEY,
    patient_id     VARCHAR(36)  NOT NULL,
    recorded_by_id VARCHAR(36)  NOT NULL,
    recorded_at    TIMESTAMP    NOT NULL,
    measurements   TEXT         NOT NULL,                       -- "defId1:val1|defId2:val2"

    CONSTRAINT fk_vital_rec_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
);

-- Tareas de cuidado diario programadas por el owner
CREATE TABLE care_tasks (
    id                      VARCHAR(36)  PRIMARY KEY,
    patient_id              VARCHAR(36)  NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    instructions            TEXT,
    priority                VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',  -- enum: LOW, MEDIUM, HIGH
    reminder_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    active                  BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Schedule (embebido, mismo patrón que medications)
    schedule_time            VARCHAR(5)   NOT NULL,              -- "HH:mm"
    schedule_type            VARCHAR(20)  NOT NULL,              -- enum: DAYS_OF_WEEK, DATE_RANGE
    schedule_days_of_week    VARCHAR(255),                       -- "MONDAY,FRIDAY" (solo DAYS_OF_WEEK)
    schedule_start_date      DATE         NOT NULL,
    schedule_end_date        DATE,                               -- nullable = sin fecha fin (solo DATE_RANGE)

    CONSTRAINT fk_care_tasks_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
);

-- Logs diarios de tareas (generados por cron a las 00:01)
CREATE TABLE care_task_logs (
    id                  VARCHAR(36)  PRIMARY KEY,
    care_task_id        VARCHAR(36)  NOT NULL,
    patient_id          VARCHAR(36)  NOT NULL,                  -- desnormalizado para queries eficientes
    scheduled_at        TIMESTAMP    NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING', -- enum: PENDING, DONE
    completed_by_id     VARCHAR(36),                            -- nullable: quién completó
    completed_at        TIMESTAMP,                              -- nullable: cuándo se completó
    reminder_sent_at    TIMESTAMP,                              -- nullable: cuándo se envió el recordatorio (evita reenvíos duplicados)

    CONSTRAINT fk_task_logs_task    FOREIGN KEY (care_task_id) REFERENCES care_tasks (id),
    CONSTRAINT fk_task_logs_patient FOREIGN KEY (patient_id)   REFERENCES patients (id),
    -- Idempotencia del scheduler: un solo log por tarea+hora
    CONSTRAINT uq_task_logs_task_scheduled UNIQUE (care_task_id, scheduled_at)
);

-- ─────────────────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────────────────

-- users: login por email (lookup frecuente en AuthService y JwtAuthFilter)
CREATE INDEX idx_users_email ON users (email);

-- patients: pacientes de un cuidador (findAllForUser)
CREATE INDEX idx_patients_caregiver ON patients (primary_caregiver_id);
CREATE INDEX idx_patients_active     ON patients (active);

-- patient_collaborators: JOIN en findAllForUser + lookup por userId
CREATE INDEX idx_collab_patient ON patient_collaborators (patient_id);
CREATE INDEX idx_collab_user    ON patient_collaborators (user_id);

-- patient_invitation_codes: lookup de código durante join (findByInvitationCodesCode)
CREATE INDEX idx_invite_code    ON patient_invitation_codes (code);
CREATE INDEX idx_invite_patient ON patient_invitation_codes (patient_id);

-- medications: findByPatientId + findByActiveTrue (DailyMedicationLogScheduler)
CREATE INDEX idx_med_patient ON medications (patient_id);
CREATE INDEX idx_med_active  ON medications (active);

-- medication_logs:
--   findByPatientIdAndDate (logs del día)
--   findPendingOlderThan   (EscalationScheduler cada 5 min)
--   findByPatientIdAndDateRange (reportes hasta 90 días)
CREATE INDEX idx_med_log_patient_scheduled ON medication_logs (patient_id, scheduled_at);
CREATE INDEX idx_med_log_status_scheduled  ON medication_logs (status, scheduled_at);
CREATE INDEX idx_med_log_medication        ON medication_logs (medication_id);

-- vital_definitions: findByPatientId
CREATE INDEX idx_vital_def_patient ON vital_definitions (patient_id);

-- vital_records: findByPatientIdAndRecordedAtBetween (reportes)
CREATE INDEX idx_vital_rec_patient_recorded ON vital_records (patient_id, recorded_at);

-- care_tasks: findByPatientId + findByActiveTrue (DailyCareTaskLogScheduler)
CREATE INDEX idx_care_tasks_patient ON care_tasks (patient_id);
CREATE INDEX idx_care_tasks_active  ON care_tasks (active);

-- care_task_logs:
--   findByPatientIdAndDate (logs del día)
--   findPendingAt          (CareTaskReminderScheduler cada minuto)
CREATE INDEX idx_task_log_patient_scheduled ON care_task_logs (patient_id, scheduled_at);
CREATE INDEX idx_task_log_status_scheduled  ON care_task_logs (status, scheduled_at);
CREATE INDEX idx_task_log_task              ON care_task_logs (care_task_id);
