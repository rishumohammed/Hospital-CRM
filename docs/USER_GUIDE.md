# Hospital CRM - Phase 1 Telecalling Module User Guide

Welcome to the **Hospital CRM Telecalling Module**. This guide provides comprehensive, step-by-step instructions for all staff roles across our multi-branch hospital network, covering lead management, calling workflows, admission coordination, aftercare follow-ups, reports, security, and mobile usage.

---

## 1. System Overview & Architecture

The Hospital CRM is designed specifically for healthcare environments, featuring:
- **Strict Multi-Branch & Role-Based Access Scoping**: Telecallers only see their assigned leads. Center heads and managers oversee branch queues, while owners maintain global oversight.
- **Privacy & PII Protection**: Strict phone number masking for front-line telecallers, automated PII redaction in logs, forensic audit logging for all sensitive accesses, and watermarked data exports.
- **Bilingual Interface**: Full, seamless support for **English** and **Malayalam (മലയാളം)** with native Malayalam search indexing.
- **Responsive PWA Support**: Optimized touch targets ($\ge 44\text{px}$) designed for desktop monitors, iPads/tablets, and mobile telecaller devices.

---

## 2. Standard User Roles & Demo Accounts

For internal training, staging, and daily operations, the following roles and default credentials are configured:

| Role | Username / Email | Default Password | Primary Workspace |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@hospital.test` | `HospitalCRM@2026` | Global overview, temporary admin permission grants |
| **Admin** | `admin@hospital.test` | `HospitalCRM@2026` | Branch settings, picklists, integrations |
| **Center Head** | `centerhead@hospital.test` | `HospitalCRM@2026` | Branch performance, overdue escalation review |
| **Telecaller Manager** | `manager@hospital.test` | `HospitalCRM@2026` | Queue balancing, supervisor call overrides, low CSAT alerts |
| **Support Telecaller 1** | `telecaller1@hospital.test` | `HospitalCRM@2026` | Lead intake, daily call cadence, appointment booking |
| **Support Telecaller 2** | `telecaller2@hospital.test` | `HospitalCRM@2026` | Lead intake, daily call cadence, appointment booking |
| **Admission Specialist** | `admission1@hospital.test` | `HospitalCRM@2026` | IP admission pipeline, financial clearance, deposit gating |
| **Aftercare Executive** | `aftercare1@hospital.test` | `HospitalCRM@2026` | Post-discharge check-ins, satisfaction surveys |
| **Doctor / Duty Nurse** | `doctor1@hospital.test` | `HospitalCRM@2026` | Clinical consultation outcomes, emergency escalations |
| **Auditor** | `auditor@hospital.test` | `HospitalCRM@2026` | Forensic audit log viewer, export traceability |

---

## 3. Support Desk: Lead Intake & Calling Operations

### 3.1 Lead Intake & Duplicate Prevention
- **Automated Round-Robin Assignment**: Incoming leads from Meta Ads, Website Forms, and Walk-ins are assigned to available telecallers in sequence.
- **Response SLAs**:
  - **Meta Ads Leads**: **5-minute** response SLA.
  - **Website & Portal Leads**: **15-minute** response SLA.
- **Duplicate Detection**: The system checks normalized mobile numbers (`+91...`). If a lead with the same number exists within 30 days, creation is blocked with a duplicate prompt. To override (e.g., family member sharing a phone), tick **"Override Duplicate"** and provide an explicit audit reason.
- **Malayalam Language Support**: Notes, concerns, and patient names can be entered in Malayalam (e.g., `"മുട്ടുവേദന"`). The search bar supports full Unicode text matching.

### 3.2 Daily Calling Cadence & Atomic Logging
- **Contact Soft Limit**: To respect patient privacy, the CRM enforces a limit of **3 call attempts per patient per calendar day**.
  - A 4th call attempt requires a **Supervisor Override Reason** entered by a Telecaller Manager.
- **Atomic Interaction Logging**: After dialing, telecallers log the call outcome:
  - `connected_interested`: Schedules an appointment or next follow-up.
  - `connected_not_interested`: Prompts for a lost reason and closes the lead.
  - `busy` / `not_reachable` / `switched_off`: Automatically schedules the next cadence attempt according to the standard schedule (1h, 4h, 24h).
- **Appointment Scheduling**: Selecting "Book Appointment" allows selecting the department, doctor, and date/time. The patient is sent an automated appointment reminder via WhatsApp or SMS.
- **Emergency Escalation**: If a caller indicates acute trauma, chest pain, or emergency symptoms, clicking **"Mark Emergency"** immediately alerts the on-duty hospital nurse and routes the patient to the Casualty triage desk.

---

## 4. Consultation & Conversion to Patient Cases

### 4.1 "Mark Visited" Flow
When a patient arrives at the hospital for their scheduled appointment:
1. The telecaller or front-desk staff clicks **"Mark Visited"** on the lead.
2. The lead converts into a permanent **Patient Record** and creates an initial **Case File**.
3. All prior telecalling history, notes, and campaign attribution are linked directly to the new patient case.

### 4.2 Doctor Desk & Consultation Outcomes
When the treating physician conducts the OPD consultation:
1. The doctor accesses `/doctor` to view patients waiting in their department.
2. The doctor records the **Consultation Outcome**:
   - **Admission Advised**: Inpatient admission recommended. Sets estimated admission date, deposit amount required, and triggers the **Admission Desk Cadence Engine** (24h first follow-up).
   - **OPD Follow-up Advised**: Outpatient medication / therapy prescribed. Triggers outpatient review follow-up.
   - **No Follow-up Required**: Patient received complete care. Case closed.

---

## 5. Admission Desk: Financial Gating & Inpatient Pipeline

### 5.1 Admission Stages
Admission specialists manage patients through the following workflow:
1. `admission_advised`
2. `cost_estimated`
3. `deposit_paid`
4. `admitted`

### 5.2 Acceptance Test 8: Deposit Gate
- **Standard Policy**: A case cannot advance to the `admitted` stage unless the required admission deposit is recorded as collected.
- **Emergency Clinical Override**: In life-threatening emergencies where admission cannot be delayed for billing clearance, an Admission Specialist or Center Head can advance the stage by selecting **"Emergency Clinical Override"** and documenting the authorizing physician's name. Every override generates an immutable forensic audit log.

---

## 6. Aftercare Desk: Post-Discharge Recovery & Patient Safety

### 6.1 Recovery Follow-up Cadences (AT 9)
Once a patient completes treatment and the doctor marks **Treatment Completed**:
- **Inpatient Discharges**: Requires entering the official discharge date. Automatically schedules check-ins at:
  - **Day 2**: Post-discharge medication check and vitals.
  - **Day 7**: Suture removal / initial recovery assessment.
  - **Day 30**: 1-month recovery review.
  - **Day 90**: 3-month long-term outcome check.
- **Outpatient (OPD) Treatments**: Schedules follow-ups at **Day 7, 30, and 90**.

### 6.2 Clinical Red Flags & 1-Hour Escalation SLA (AT 10)
If during an aftercare call the patient reports any warning sign (e.g., persistent high fever, unexpected wound discharge, sudden chest pain):
1. The executive flags **"Clinical Red Flag Escalation"**.
2. A high-priority clinical escalation is routed to the **Duty Doctor** with a strict **1-hour SLA**.
3. If unanswered within 1 hour, the system automatically escalates to the **Telecaller Manager**; if unanswered within 2 hours, it alerts the **Center Head**.
4. Once the doctor reviews and records a clinical decision, a **Hot Callback Task** is automatically created for the aftercare executive to phone the patient with clinical instructions.

### 6.3 Low CSAT Alert & Manager Callback (AT 11)
When collecting patient feedback:
- If the satisfaction score is **$\le 6$ out of 10**, the CRM automatically schedules a **24-hour Manager Escalation Task** for the Telecaller Manager to phone the patient, investigate grievances, and ensure service recovery.

---

## 7. Reports & Analytics Center

Staff with report viewing permissions (`owner`, `center_head`, `telecaller_manager`, `auditor`) can access `/reports`:
- **Support Desk Report**: Lead volume, response SLA compliance rates, lead distribution by department/source, and individual telecaller conversion metrics.
- **Admission Desk Report**: Admission conversion rates, average stay length, bed occupancy, and deposit collection totals.
- **Aftercare Desk Report**: Recovery follow-up completion percentages, clinical red-flag resolution times, and average patient satisfaction (CSAT) scores.
- **Lost Reasons Analysis**: Categorical breakdown of why patients declined services (e.g., price, distance, alternate treatment).
- **Source Quality Analysis**: Conversion rates and return-on-investment across Meta Ads, Website, Referrals, and Walk-ins.

---

## 8. Watermarked CSV Exports & Data Governance

To prevent unauthorized data leakage while facilitating legitimate audits:
1. **Export Request**: Staff submit an export request specifying the resource (`leads`, `cases`, `interactions`, or `audit_logs`) and date filters.
2. **Dual-Approval Flow**: Telecallers' export requests enter `pending` status and must be reviewed and approved by a Telecaller Manager, Center Head, or Owner.
3. **Traceable Watermark Banner**: Every downloaded CSV contains an immutable cryptographic header:
   ```csv
   # ==============================================================================
   # HOSPITAL CRM - SECURE CONFIDENTIAL DATA EXPORT
   # Export ID: EXP-00042 | Resource: LEADS
   # Exported By: Deepa Nair (telecaller1@hospital.test) | Role: support_telecaller
   # Branch Scope: Main Hospital Kochi
   # Timestamp: 2026-11-01T20:30:00.000Z (Asia/Kolkata: 01-Nov-2026 2:00:00 am)
   # Security Notice: Internal hospital use only. Recipient traceable via watermark tag.
   # Watermark Signature: 4_telecaller1@hospital.test_1762029000000
   # ==============================================================================
   ```
4. **Per-Row Watermark**: Each data row includes a `Watermark Audit Tag` column linking the record to the exporting user's identity.

---

## 9. Privacy, Security & Data Subject Rights (DSR)

- **Temporary Admin Permission Grants (AT 12)**: IT Administrators cannot read clinical or lead contents by default. If troubleshooting is required, an **Owner** issues a time-bounded **Permission Grant** (e.g., 2 hours). Every access during this window is logged in the forensic audit log.
- **Server Log Redaction (AT 13)**: The Pino logging subsystem strictly masks phone numbers, patient names, medical concerns, and passwords (`[REDACTED]`).
- **Data Subject Rights (GDPR / DPDP)**: The Privacy Service (`findDataSubjectRecords`) allows compliance officers to enter a patient's mobile number and retrieve a consolidated export of all associated leads, cases, interactions, and appointments.

---

## 10. Progressive Web App (PWA) & Mobile Usage

- **Installation**: On Chrome/Edge (Desktop or Android), click **"Install App"** in the address bar. On iOS Safari, tap **Share** $\to$ **"Add to Home Screen"**.
- **Touch-Optimized**: Designed for rapid 1-thumb telecalling with button heights $\ge 44\text{px}$.
- **Click-to-Call**: Tapping a patient's mobile number initiates a native dialer call (`tel:...`) while opening the atomic call logging modal.
- **WhatsApp Integration**: Generates click-to-chat links (`wa.me/...`) pre-populated with appointment reminder templates.
