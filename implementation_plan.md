# Barangay Health Information System (BHIS)

A full-featured, role-based health information web application for Barangay Health Workers, Midwives, and Administrators.

---

## System Overview

This system serves three user roles with distinct dashboards and feature sets:

| Role | Key Responsibilities |
|------|---------------------|
| **Admin** | User account management, role assignment, audit logs, system settings |
| **Midwife** | Health program tracking (prenatal, immunization, senior/chronic), FHSIS/MHO report generation |
| **BHW** | Resident profiles, household/family folders (Pamilya Folder), offline data entry |

---

## Proposed Changes

### Technology Stack
- **Single-file HTML + Vanilla JS + CSS** — no build tools needed, runs offline-first
- **LocalStorage** — simulates a database for all records (residents, users, logs, health data)
- **IndexedDB** — used for offline-sync simulation for BHW role
- **jsPDF + SheetJS (CDN)** — for PDF/Excel report exports (Midwife feature)

---

### Pages & Features Per Role

#### 🔐 Login / Logout (All Roles)
- Login page with role-aware redirect
- Session stored in localStorage
- Logout clears session

---

#### 👤 Admin Panel
- **User Management**: Create/Edit/Delete users (Admin, Midwife, BHW), assign roles
- **Audit Log Viewer**: Real-time log table of all actions (view, edit, export, login, logout) with timestamps, user, and action type
- **System Settings**: Barangay name, health center name, contact info
- **Dashboard**: Summary cards (total users by role, recent audit entries)

---

#### 🏥 Midwife Dashboard
- **Targeted Health Program Tracking**
  - Prenatal Care: Register patient, track visits (1st–4th trimester), expected delivery date, status
  - Child Immunization: Child records, vaccine schedule (BCG, DPT, OPV, Measles, etc.), due dates, completion status
  - Senior/Chronic Disease: Patient registration, condition tracking, medication monitoring, follow-up scheduling
- **Automated FHSIS & MHO Reporting Engine**
  - Monthly report generation per program
  - Export to PDF (jsPDF) or Excel (SheetJS)
  - Report history viewer
- **Dashboard**: Cards with patient counts by program, upcoming schedules, overdue alerts

---

#### 🏘️ BHW Dashboard
- **Digital Resident Profiles**
  - Add/Edit/Search residents (name, age, sex, address, contact, health status)
  - Household/Pamilya Folder grouping (assign residents to a family unit)
  - View full household records
- **Offline Data Entry with Auto-Sync**
  - "Offline Mode" toggle — data saved to IndexedDB when offline
  - Auto-sync banner when reconnected (simulated)
  - Pending sync queue indicator
- **Dashboard**: Total residents, total households, pending syncs, recently added

---

## File Structure

```
c:\Combined\
├── index.html          ← Login page + full app (SPA)
├── app.js              ← All JS logic (auth, routing, CRUD, reports)
└── style.css           ← Full design system
```

> [!NOTE]
> The entire app will be built as a **single-page application** (SPA) using vanilla JS routing — no frameworks, no backend. All data persists in localStorage/IndexedDB so it works offline and requires no server setup.

---

## Design System
- **Color palette**: Deep teal primary (`#0d7377`), warm accent (`#32e0c4`), dark backgrounds
- **Typography**: Google Fonts — *Outfit* (headings) + *Inter* (body)
- **Components**: Glassmorphism cards, sidebar navigation, animated modals, data tables with search/filter
- **Responsive**: Mobile-friendly sidebar collapse for BHW field use

---

## Verification Plan

### Manual Verification
1. Login as each of the 3 roles and confirm correct dashboard and feature access
2. Admin: Create a Midwife user → login as that Midwife → confirm audit log records the actions
3. Midwife: Add a prenatal patient → generate a PDF report → verify download
4. BHW: Add a resident → create a household → assign resident → search resident
5. Toggle offline mode → add a record → toggle back → confirm sync banner appears

