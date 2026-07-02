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
