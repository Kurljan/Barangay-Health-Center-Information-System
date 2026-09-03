# Barangay Health Information System (BHIS)

## Overview

The Barangay Health Information System (BHIS) is a comprehensive web-based application designed to streamline and digitize health records and processes at the barangay level. It serves three main roles: Administrators, Midwives, and Barangay Health Workers (BHWs). The system focuses on prenatal and child immunization tracking, while also facilitating household management and automated report generation. It features offline capabilities for field data entry by BHWs.

## Features by Role

### Administrator
- **User Management**: Create, view, update, and delete user accounts. Assign roles and reset passwords.
- **Audit Logging**: Track all system activities (logins, data changes, exports).
- **System Settings**: Manage barangay information and health center details.

### Midwife
- **Prenatal Care Tracking**: Register patients, log check-ups, track delivery, and receive alerts for overdue visits.
- **Child Immunization**: Track vaccine administration, schedules, and completion rates.
- **Reporting Engine**: Automatically generate and export FHSIS & MHO reports (PDF/Excel).

### Barangay Health Worker (BHW)
- **Pamilya (Household) Folders**: Group residents into households and manage household heads.
- **Offline Mode**: Enter data without an internet connection using IndexedDB, with automatic background synchronization when the connection is restored.

## Tech Stack & Setup

The system includes a Node.js backend to handle logic, routing, and data serving.

### Prerequisites
- Node.js installed

### Installation & Execution
1. Install dependencies (if any are defined in package.json):
   ```bash
   npm install
   ```
2. Seed initial data (optional but recommended for a fresh setup):
   ```bash
   npm run seed
   ```
3. Start the application:
   ```bash
   npm start
   ```
   For development mode with hot-reloading (using nodemon):
   ```bash
   npm run dev
   ```

## Demo Accounts

The system includes pre-loaded demo accounts for testing purposes:

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `admin123` |
| **Midwife** | `midwife` | `midwife123` |
| **BHW** | `bhw` | `bhw123` |

## Documentation
For full system details and requirements, refer to the [System Requirements Document](requirements.md).
