# Barangay Health Information System (BHIS)
## System Requirements Document

---

## 👥 USER ROLES

| Role | Description |
|------|-------------|
| **Admin** | System administrator — manages users, monitors all activity, configures system |
| **Midwife** | Licensed Barangay Midwife — tracks health programs, generates reports |
| **BHW** | Barangay Health Worker — manages resident profiles and household data in the field |

---

## ✅ FUNCTIONAL REQUIREMENTS

---

### 🔐 FR-1: Authentication (All Roles)

| ID | Feature | Description |
|----|---------|-------------|
| FR-1.1 | **Login** | User enters username and password to access the system |
| FR-1.2 | **Role-Based Redirect** | After login, user is redirected to their role-specific dashboard |
| FR-1.3 | **Logout** | User can log out from any page; session is cleared |
| FR-1.4 | **Session Management** | Session persists on page refresh; expires after inactivity |
| FR-1.5 | **Invalid Login Handling** | System shows error message for wrong credentials |
| FR-1.6 | **Password Change** | User can change their own password from profile settings |

---

### 👤 FR-2: Admin — User Management

| ID | Feature | Description |
|----|---------|-------------|
| FR-2.1 | **Create User** | Admin can add new user accounts (name, username, password, role, contact) |
| FR-2.2 | **Read/View Users** | Admin can view a full list of all system users with their roles and status |
| FR-2.3 | **Update User** | Admin can edit user details (name, contact, role assignment) |
| FR-2.4 | **Delete User** | Admin can deactivate or permanently delete a user account |
| FR-2.5 | **Search Users** | Admin can search users by name, username, or role |
| FR-2.6 | **Filter Users by Role** | Admin can filter the user list by Admin / Midwife / BHW |
| FR-2.7 | **Assign/Change Role** | Admin can promote or change a user's role (e.g., BHW → Midwife) |
| FR-2.8 | **Reset Password** | Admin can reset any user's password |
| FR-2.9 | **User Status Toggle** | Admin can activate or deactivate a user account without deleting it |

---

### 📋 FR-3: Admin — Data Privacy & Audit Logging

| ID | Feature | Description |
|----|---------|-------------|
| FR-3.1 | **Auto-Log Actions** | System automatically records every login, logout, view, create, edit, delete, and export action |
| FR-3.2 | **View Audit Log** | Admin can view a full chronological audit trail with: timestamp, user, role, action type, and record affected |
| FR-3.3 | **Search Audit Log** | Admin can search logs by username, action type, or date range |
| FR-3.4 | **Filter Audit Log** | Admin can filter logs by action type (login, edit, delete, export, view) |
| FR-3.5 | **Export Audit Log** | Admin can export the audit log to PDF or CSV |
| FR-3.6 | **Clear Old Logs** | Admin can archive or clear logs older than a selected date |

---

### ⚙️ FR-4: Admin — System Settings

| ID | Feature | Description |
|----|---------|-------------|
| FR-4.1 | **Edit Barangay Info** | Admin can update barangay name, municipality, health center name |
| FR-4.2 | **Edit Contact Details** | Admin can update health center contact number and address |
| FR-4.3 | **Dashboard Summary** | Admin sees cards: total users, total residents, recent audit entries, active sessions |

---

### 🤰 FR-5: Midwife — Prenatal Care Tracking

| ID | Feature | Description |
|----|---------|-------------|
| FR-5.1 | **Register Prenatal Patient** | Midwife adds a new prenatal patient (name, age, LMP, EDD, gravida, para, address) |
| FR-5.2 | **View Prenatal Records** | Midwife views all prenatal patients in a searchable table |
| FR-5.3 | **Update Prenatal Record** | Midwife edits patient info or adds new visit notes |
| FR-5.4 | **Delete Prenatal Record** | Midwife can remove a prenatal record |
| FR-5.5 | **Log Prenatal Visit** | Midwife logs each check-up visit: date, AOG (weeks), BP, weight, fundal height, fetal heart rate, remarks |
| FR-5.6 | **Track Delivery** | Midwife records delivery outcome (date, type, outcome, birth weight) |
| FR-5.7 | **Search Prenatal Patients** | Search by name, status (active, delivered, high-risk) |
| FR-5.8 | **Overdue Visit Alerts** | System flags patients overdue for a prenatal check-up |
| FR-5.9 | **High-Risk Tagging** | Midwife can mark a patient as high-risk with a note |

---

### 💉 FR-6: Midwife — Child Immunization Tracking

| ID | Feature | Description |
|----|---------|-------------|
| FR-6.1 | **Register Child** | Midwife adds child record (name, DOB, sex, mother's name, address) |
| FR-6.2 | **View Immunization Records** | View all children with their vaccine completion status |
| FR-6.3 | **Update Child Record** | Edit child info or correct vaccine dates |
| FR-6.4 | **Delete Child Record** | Remove a child immunization record |
| FR-6.5 | **Log Vaccine Administered** | Record vaccine given: BCG, Hepatitis B, DPT, OPV, Measles, Rotavirus, PCV — with date and dose number |
| FR-6.6 | **View Vaccine Schedule** | See full vaccine schedule per child with due dates and completion status |
| FR-6.7 | **Search Children** | Search by child name, mother name, or barangay |
| FR-6.8 | **Due/Overdue Vaccine Alerts** | System highlights children with upcoming or overdue vaccinations |
| FR-6.9 | **Completion Status** | System auto-calculates % of completed vaccines per child |

---

### 🏥 FR-7: Midwife — Senior Citizen / Chronic Disease Management

| ID | Feature | Description |
|----|---------|-------------|
| FR-7.1 | **Register Patient** | Add senior/chronic disease patient (name, age, sex, condition, medications) |
| FR-7.2 | **View Patient List** | View all senior/chronic disease patients |
| FR-7.3 | **Update Patient Record** | Edit patient info, condition, or medication list |
| FR-7.4 | **Delete Patient Record** | Remove a patient from the chronic disease list |
| FR-7.5 | **Log Consultation Visit** | Record visit date, BP, blood sugar, weight, medications given, remarks |
| FR-7.6 | **Follow-Up Scheduling** | Set and view next follow-up appointment date per patient |
| FR-7.7 | **Search Patients** | Search by name, condition (hypertension, diabetes, asthma, etc.) |
| FR-7.8 | **Overdue Follow-Up Alerts** | System flags patients who missed their follow-up date |
| FR-7.9 | **Medication Tracking** | View and update current medications per patient |

---

### 📊 FR-8: Midwife — FHSIS & MHO Reporting Engine

| ID | Feature | Description |
|----|---------|-------------|
| FR-8.1 | **Generate Monthly Report** | Midwife selects month/year and program type to auto-generate a report |
| FR-8.2 | **Preview Report** | View report on-screen before exporting |
| FR-8.3 | **Export to PDF** | Download the generated report as a formatted PDF |
| FR-8.4 | **Export to Excel** | Download the generated report as an Excel (.xlsx) file |
| FR-8.5 | **Report History** | View list of previously generated reports with date and type |
| FR-8.6 | **Reprint/Re-export Report** | Re-download a previously generated report |
| FR-8.7 | **Midwife Dashboard Summary** | Cards: total prenatal patients, total children, total senior/chronic patients, overdue alerts count |

---

### 🏘️ FR-9: BHW — Digital Resident Profiles

| ID | Feature | Description |
|----|---------|-------------|
| FR-9.1 | **Add Resident** | BHW creates a resident profile (first name, last name, DOB, age, sex, civil status, address, contact, occupation, religion, philhealth status) |
| FR-9.2 | **View Resident List** | BHW views all residents in a searchable, filterable table |
| FR-9.3 | **View Resident Profile** | BHW opens full detailed profile of a single resident |
| FR-9.4 | **Update Resident** | BHW edits any resident's information |
| FR-9.5 | **Delete Resident** | BHW removes a resident record (with confirmation prompt) |
| FR-9.6 | **Search Residents** | Search by full name, address, or PhilHealth number |
| FR-9.7 | **Filter Residents** | Filter by sex, age group, civil status, or household |
| FR-9.8 | **Health Tags** | Tag residents with health conditions (pregnant, PWD, senior, 4Ps member, etc.) |

---

### 🏠 FR-10: BHW — Pamilya (Household) Folder

| ID | Feature | Description |
|----|---------|-------------|
| FR-10.1 | **Create Household** | BHW creates a Pamilya Folder (household name/number, address, household head) |
| FR-10.2 | **View All Households** | BHW views list of all registered households |
| FR-10.3 | **View Household Details** | BHW opens a folder showing all members of a household |
| FR-10.4 | **Update Household** | BHW edits household address or head of family |
| FR-10.5 | **Delete Household** | BHW removes a household record |
| FR-10.6 | **Add Member to Household** | BHW links an existing resident profile to a household |
| FR-10.7 | **Remove Member from Household** | BHW unlinks a resident from a household |
| FR-10.8 | **Search Households** | Search by household name, address, or household head name |
| FR-10.9 | **Household Health Summary** | View count of members, tags (pregnant members, seniors, PWD, etc.) per household |

---

### 📶 FR-11: BHW — Offline Data Entry with Auto-Sync

| ID | Feature | Description |
|----|---------|-------------|
| FR-11.1 | **Offline Mode Detection** | System detects internet status and switches to offline mode automatically |
| FR-11.2 | **Offline Data Entry** | BHW can add and edit resident/household records while offline (stored in IndexedDB) |
| FR-11.3 | **Pending Sync Indicator** | A badge/counter shows how many records are pending sync |
| FR-11.4 | **Auto-Sync on Reconnect** | When internet is restored, pending records sync automatically |
| FR-11.5 | **Manual Sync Button** | BHW can manually trigger sync at any time |
| FR-11.6 | **Sync Status Log** | BHW can view which records were synced and when |
| FR-11.7 | **BHW Dashboard Summary** | Cards: total residents, total households, pending syncs, recently added records |

---

## 🔧 NON-FUNCTIONAL REQUIREMENTS

---

### ⚡ NFR-1: Performance

| ID | Requirement |
|----|-------------|
| NFR-1.1 | Pages and dashboards load within **2 seconds** |
| NFR-1.2 | Search results appear within **500ms** of input |
| NFR-1.3 | Report generation (PDF/Excel) completes within **5 seconds** |
| NFR-1.4 | System handles up to **5,000 resident records** without performance degradation |

---

### 🔒 NFR-2: Security

| ID | Requirement |
|----|-------------|
| NFR-2.1 | Passwords are **never stored in plain text** (hashed in localStorage) |
| NFR-2.2 | Each role can **only access their own dashboard and features** |
| NFR-2.3 | Unauthorized URL access redirects user back to login |
| NFR-2.4 | All sensitive actions are **logged automatically** in the audit trail |
| NFR-2.5 | Session is cleared on logout and cannot be reused |

---

### 🖥️ NFR-3: Usability

| ID | Requirement |
|----|-------------|
| NFR-3.1 | All forms have **input validation** with clear error messages |
| NFR-3.2 | All destructive actions (delete) require a **confirmation dialog** |
| NFR-3.3 | System provides **success/error toast notifications** for all actions |
| NFR-3.4 | Tables support **pagination** (10–20 rows per page) |
| NFR-3.5 | Date inputs use a proper **date picker** |
| NFR-3.6 | All tables have a **search bar** and at least one **filter dropdown** |
| NFR-3.7 | UI is **responsive** — works on desktop, tablet, and mobile |
| NFR-3.8 | Active sidebar navigation clearly **highlights the current page** |

---

### 📱 NFR-4: Offline Capability (BHW)

| ID | Requirement |
|----|-------------|
| NFR-4.1 | BHW dashboard fully functions **without internet connection** |
| NFR-4.2 | Offline data is stored using **IndexedDB** and never lost on page refresh |
| NFR-4.3 | An **offline/online status banner** is always visible to BHW |

---

### 📄 NFR-5: Reporting

| ID | Requirement |
|----|-------------|
| NFR-5.1 | Exported PDF reports include **barangay name, report date, program type, and page numbers** |
| NFR-5.2 | Excel exports include **proper headers and formatted columns** |
| NFR-5.3 | Reports reflect **only data from the selected month/year** |

---

### 🗄️ NFR-6: Data Management

| ID | Requirement |
|----|-------------|
| NFR-6.1 | All data persists using **localStorage / IndexedDB** (no backend needed) |
| NFR-6.2 | System comes with **pre-loaded demo data** for all three roles for testing |
| NFR-6.3 | System supports **data export** (CSV) for residents and health records |

---

## 📌 DEFAULT DEMO ACCOUNTS

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Midwife | `midwife` | `midwife123` |
| BHW | `bhw` | `bhw123` |

