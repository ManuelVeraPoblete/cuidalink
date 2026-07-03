# CuidaLink Backend — Ledger de Progreso

Plan: docs/superpowers/plans/2026-06-25-cuidalink-backend-plan.md
Rama: feature/backend
Inicio: 2026-06-29
Commit base: 3dfb8ce

## Tasks
- [x] Task 1: Bootstrap Spring Boot project
- [x] Task 2: Auth — Capa de Dominio
- [x] Task 3: Auth — Adaptadores (JWT, BCrypt, JPA, REST, Security)
- [ ] Task 4: Patient — Capa de Dominio
- [ ] Task 5: Patient — Adaptadores (JPA + REST)
- [ ] Task 6: Medication — Dominio y Adaptadores
- [ ] Task 7: Vital Signs — Dominio y Adaptadores
- [ ] Task 8: Notification Module — FCM + Cron Jobs
- [ ] Task 9: Report Module — PDF con iText 7
- [ ] Task 10: Security Hardening + Rate Limiting + Global Exception Handler
- [ ] Task 11: Integration Tests con Testcontainers
Task 1: complete (commits 3dfb8ce..766b612, review clean)
Task 2: complete (commits 766b612..c044833, review clean after fix 67f0d19)
Task 3: complete (same commit set, review clean — HS256, jwt package, google permit fixed)

---

# CuidaLink Mobile — Rediseño PatientDetailScreen — Ledger de Progreso

Plan: docs/superpowers/plans/2026-07-02-patient-detail-screen-plan.md
Rama: worktree-patient-detail-screen (worktree: .claude/worktrees/patient-detail-screen)
Inicio: 2026-07-02
Commit base: a34c58d

## Tasks
- [x] Task 1: Extraer utilidades compartidas de visualización de paciente
- [x] Task 2: Crear ComingSoonScreen y registrar la ruta ComingSoon
- [x] Task 3: Crear ContactsScreen y registrar la ruta Contacts
- [x] Task 4: Rediseñar PatientDetailScreen según el mockup

Task 1: complete (commits a34c58d..05eb795, review clean — Minor plan-mandated finding: unused `MedicationLog` import in PatientsListScreen.tsx:7, carry to final review)
Task 2: complete (commits 05eb795..85aab2d, review clean)
Task 3: complete (commits 85aab2d..0184d87, review clean — Minor: callEmergencyContact uses a `patient!` non-null assertion instead of inlining like PatientDetailScreen does; not a defect, carry to final review for consistency check)
Task 4: complete (commits 0184d87..5466b94, review clean — Minor: duplicated handleEmergencyCall logic with ContactsScreen, and today-date recomputed each render; carry both to final review)

Revisión final de rama: APROBADA (Ready to merge: Yes). 43/43 tests, tsc limpio. Fix aplicado post-revisión: import no usado MedicationLog en PatientsListScreen.tsx (commit 678c044). Resto de hallazgos Minor (duplicación de handleEmergencyCall/callEmergencyContact, today recalculado por render, aserción no-nula patient!) evaluados como diferibles, no bloqueantes.

---

# CuidaLink — Rediseño DailyMedsScreen (backend + mobile) — Ledger de Progreso

Plan: docs/superpowers/plans/2026-07-02-daily-meds-screen-plan.md
Rama: worktree-daily-meds-screen (worktree: .claude/worktrees/daily-meds-screen)
Inicio: 2026-07-02
Commit base: b1676f9

Nota de entorno: Docker no está disponible en este entorno, por lo que los tests de integración
backend (@Testcontainers, ej. MedicationIntegrationTest) no se pueden ejecutar aquí. Se verifican
por compilación + revisión de código; el usuario deberá correrlos localmente donde haya Docker antes
de mergear, o confiar en CI.

Nota de bug pre-existente encontrado y corregido en main (commit b1676f9, ya traído a este worktree):
el .gitignore raíz tenía una línea `out` genérica (boilerplate de Next.js, no aplica a este repo) que
excluía silenciosamente 37 archivos del backend (todos los adapters/ports "out" del layer hexagonal)
de git en TODO el repo. Ya arreglado antes de empezar esta feature.

## Tasks
- [x] Task 1: MedicationType + campo type en el dominio Medication
- [ ] Task 2: Exponer type en la API y enriquecer los logs diarios
- [x] Task 3: Mobile — entidades type/instructions y corregir confirmar/omitir
- [x] Task 4: MedicationActionModal (nuevo)
- [x] Task 5: Rediseñar MedicationCard
- [x] Task 6: Rediseñar DailyMedsScreen

Task 1: complete (commits b1676f9..eb86e82, review clean — Minor: convenience-constructor Javadoc borderline vs no-comments rule, non-blocking)

Task 2: complete (commits eb86e82..b2b7d64, review clean — MedicationIntegrationTest.getDailyLogs_includesMedicationDetails NOT executed here, Docker unavailable; needs a run locally/CI before merge. Minor: getDailyLogs fetches full medication list rather than a narrower batch, and toResponse assumes medication always present in map — both acceptable, non-blocking)

Task 3: complete (commits b2b7d64..94578d2, review clean — also touched patientDisplay.test.ts, verified mechanical fixture-only ripple from new required MedicationLog fields. Minor/out-of-scope: Medication.ts frequency/scheduledTimes fields don't match backend's nested schedule DTO shape, pre-existing bug unrelated to this feature, flag for future task)

Task 4: complete (commits 94578d2..7f14d94, review clean — Reviewer's cannot-verify item on Intl/es-CL support resolved by controller: same toLocaleTimeString('es-CL',...) pattern already used and working elsewhere in the app. Minor: null-log mid-visible transition skips fade animation, non-blocking, noted for Task 6 wiring)

Task 5: complete (commits 7f14d94..7f90f41, review clean after fix — first pass had scope creep: implementer wired MedicationActionModal into DailyMedsScreen.tsx, which is Task 6's exclusive scope; fix commit 7f90f41 trimmed it to a minimal call-site change, re-review confirmed clean)

Task 6: complete (commits 7f90f41..3302fe7, review clean — 59/59 tests, tsc clean. Minor: MISSED logs only visible under 'Todos' tab (spec-derived, not a deviation), no test exercises 'Omitir' path (brief's test content, not implementer's gap), Expo v56 AGENTS.md doc-fetch instruction reasonably disregarded since no new API surface used)

Revisión final de rama: APROBADA (Ready to merge: Yes). 59/59 tests mobile, tsc limpio, backend compila (main+test), MedicationServiceTest verde. El único test no ejecutable (MedicationIntegrationTest.getDailyLogs_includesMedicationDetails, requiere Docker) fue trazado línea por línea por el revisor y confirmado como correcto — debería pasar si se corre con Docker.
Important #1 (join en la capa de controller en vez de un use case dedicado) y #2 (fetch redundante de Medication en confirm()) son decisiones deliberadas del plan/spec, confirmadas como intencionales, no bloqueantes.
Minor (no bloqueantes, para futuro): sin null-guard defensivo en toResponse (seguro hoy, latente si se agrega hard-delete), logs legacy sin patientId fallarían al confirmar (no aplica, app greenfield), botones del modal no se deshabilitan durante la mutación (doble-tap podría disparar 2 PATCH, el segundo simplemente 400), Javadoc de constructoras de conveniencia bordeline vs regla de no-comentarios (ya en ledger de Task 1).

---

# CuidaLink — Pantalla "Nuevo medicamento" (CreateMedicationScreen) — Ledger de Progreso

Plan: docs/superpowers/plans/2026-07-02-create-medication-screen-plan.md
Rama: worktree-create-medication-screen (worktree: .claude/worktrees/create-medication-screen)
Inicio: 2026-07-02
Commit base: 7b53d34

Nota de entorno: Docker no está disponible en este entorno — los tests *IntegrationTest
(@Testcontainers) se verifican por compilación (mvn test-compile), no por ejecución real. El usuario
deberá correrlos localmente (con Docker) o confiar en CI antes de mergear a producción.

## Tasks
- [x] Task 1: MedicationSchedule.fromDailyInterval (dominio backend)
- [x] Task 2: Exponer startTime/frequencyHours en la API
- [x] Task 3: Mobile — corregir Medication.ts y agregar createMedication
- [x] Task 4: CreateMedicationScreen + navegación

Task 1: complete (commits 7b53d34..3f0917f, review clean — Minor: no test for frequencyHours=24 boundary case, cheap to add later but not plan-mandated)

Task 2: complete (commits 3f0917f..8020f8c, review clean — nuevo test de integración NO ejecutado aquí, Docker no disponible, verificado a mano contra la lógica de fromDailyInterval de Task 1 y confirmado correcto; correr localmente/CI antes de mergear. Minor: startTime se persiste como String vía LocalTime.toString()/parse, consistente con el patrón existente de otros campos de schedule, riesgo bajo)

Task 3: complete (commits 8020f8c..49b1948, review clean, no findings)

Task 4: complete (commits 49b1948..3e298b9, review clean after fix — Important plan-mandated bug found: date pickers used toISOString() causing possible off-by-one-day in UTC+ timezones; fixed with local toLocalDateString() helper (commit 3e298b9), re-review confirmed resolved. Minor unresolved: DateTimePicker's value prop reparses stored 'YYYY-MM-DD' via new Date(...) which parses as UTC midnight, could misdisplay (not miscorrupt) the calendar on reopen in negative-offset timezones — display-only, non-blocking, flag for future cleanup alongside CreatePatientScreen's identical pattern)

Revisión final de rama: APROBADA (Ready to merge: Yes). Ambos test suites limpios: mobile RNTL (nuevo patrón de mock para DateTimePicker establecido), backend compila + tests no-Testcontainers verdes. El test de integración nuevo (Docker no disponible aquí) fue trazado línea por línea por el revisor final y confirmado correcto.
Sin hallazgos Critical/Important. Los 5 hallazgos Minor llevados de las revisiones por tarea quedan todos diferidos (no bloqueantes): sin test de borde frequencyHours=24, startTime persistido como String (consistente con patrón existente), onSubmit sin feedback si falta selectedPatientId (inalcanzable en la práctica), botón Cancelar no se deshabilita durante el guardado, y DateTimePicker relee la fecha guardada vía new Date() que puede desplegar mal el calendario en timezones negativos al reabrir (solo visual, no corrompe el dato ya que el path de escritura fue corregido en Task 4).

---

# CuidaLink — Pantalla "Hoy" (TodayScreen) — Ledger de Progreso

Plan: docs/superpowers/plans/2026-07-03-today-screen-plan.md
Rama: main (sin worktree, decisión explícita del usuario dado el tamaño chico de este plan)
Inicio: 2026-07-03
Commit base: aaf3194

## Tasks
- [x] Task 1: TodayScreen + navegación desde PatientDetailScreen

Task 1: complete (commits aaf3194..4894e60, review clean, no Critical/Important findings). Minor: header block duplicated with DailyMedsScreen.tsx (task explicitly forbade touching that file, so unavoidable here; candidate for a future shared-header extraction), no test for missLog/'Omitir' path or no-selectedPatientId hint (brief's own test file didn't include these, not implementer's gap)

Revisión final de rama: no se despachó por separado — plan de 1 sola tarea trabajado directo en main (sin rama/worktree), la revisión de Task 1 ya cubrió todo el diff. 68/68 tests, tsc limpio.

---

# CuidaLink — Trim HomeScreen — Ledger de Progreso

Plan: docs/superpowers/plans/2026-07-03-home-screen-trim-plan.md
Rama: main (sin worktree, decisión explícita del usuario)
Inicio: 2026-07-03
Commit base: 7b75914

## Tasks
- [x] Task 1: Quitar las 3 tarjetas del grid

Task 1: complete (commits 7b75914..6651f1b, review clean, sin hallazgos)

Revisión final de rama: no se despachó por separado — plan de 1 sola tarea trabajado directo en main (sin rama/worktree), la revisión de Task 1 ya cubrió todo el diff. 68/68 tests, tsc limpio.
