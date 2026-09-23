[![E2E Tests](https://github.com/Shamiri-Institute/digitalhub/actions/workflows/e2e.yml/badge.svg)](https://github.com/Shamiri-Institute/digitalhub/actions/workflows/e2e.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/package-json/v/Shamiri-Institute/digitalhub?color=blue)](https://github.com/Shamiri-Institute/digitalhub/releases)

# Shamiri Digital Hub

The Shamiri Digital Hub is a comprehensive digital platform designed to manage youth mental health intervention programs at scale. Built by the [Shamiri Institute](https://www.shamiri.institute/), this platform streamlines the delivery of evidence-based mental health interventions across schools and communities in Kenya, with the goal of reaching 100,000+ students.

## Key Features

- **Session Management** - Schedule, track, and manage intervention sessions across multiple schools and student groups
- **Attendance Tracking** - Monitor student participation with detailed attendance records
- **Clinical Case Management** - Handle clinical screenings, referrals, and case tracking with proper escalation workflows
- **Fellow Supervision** - Support supervisors in managing and guiding intervention facilitators (fellows)
- **Fidelity Monitoring** - AI-powered session recording analysis to ensure intervention quality
- **Document Management** - Centralized storage for progress notes, treatment plans, and case reports
- **Payouts & Expenses** - Track fellow compensation and program expenses
- **Multi-Hub Operations** - Coordinate operations across multiple geographic hubs and schools
- **Role-Based Access Control** - Secure, role-appropriate access for supervisors, hub coordinators, fellows, clinical teams, and operations staff

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with Google OAuth
- **UI Components**: Radix UI + TailwindCSS

## Open Science & Licensing

This project is developed in alignment with [Open Science Framework (OSF)](https://osf.io/) principles, promoting transparency, reproducibility, and accessibility in youth mental health research and intervention delivery.

### Open Science Commitment

- **Transparency**: Open source codebase enabling full inspection of intervention delivery mechanisms and data collection processes
- **Reproducibility**: Documented setup, deployment processes, and data schemas for replication studies across different contexts
- **Accessibility**: MIT License enabling adaptation by researchers, NGOs, educational institutions, and governments globally
- **Collaboration**: Open to contributions from the research and development community
- **Data Integrity**: Structured data collection with audit trails supporting research validity

### For Researchers

This platform can support your research by providing:

- Standardized intervention delivery tracking
- Structured data collection for outcome studies
- Scalable infrastructure for large-cohort studies
- Built-in fidelity monitoring for intervention quality assurance

**Citation**: If you use this software in your research, please cite:

```
Shamiri Institute. (2026). Shamiri Digital Hub [Computer software].
https://github.com/Shamiri-Institute/digitalhub
```

### License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

The MIT License allows you to:

- Use the software for commercial purposes
- Modify the source code
- Distribute the software
- Use the software privately

---

## Quick Start

Get the platform running locally in under 5 minutes:

### Prerequisites

- Node.js v22.x or later
- PostgreSQL v18
- npm

### One-Command Setup

```bash
# Install dependencies
npm install

# Copy environment file (see Environment Setup section for details)
cp .env.example .env.development

# Build the schema
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### Verify Installation

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Log in with test credentials:
   - **Email**: `martin.odegaard@test.com`
   - **Password**: the value of `TEST_USER_PASSWORD` in your `.env.local`

---

## Detailed Installation

Create a `.env.development` file in the root directory:

```bash
# ====================================
# DATABASE
# ====================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shamiri_db_dev"

# ====================================
# AUTHENTICATION
# ====================================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"  # Generate with: openssl rand -base64 32

# Google OAuth (OPTIONAL for local development)
# Not required when NEXT_PUBLIC_ENV=development (uses email/password instead)
GOOGLE_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"

# ====================================
# GOOGLE DRIVE API (Document Storage)
# ====================================
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_EMAIL="your-google-service-account-email"
GOOGLE_PROJECT_ID="your-google-project-id"
GOOGLE_PRIVATE_KEY="your-google-private-key"
PROGRESSNOTE_FILEID="google-drive-folder-id-for-progress-notes"
TREATMENTPLAN_FILEID="google-drive-folder-id-for-treatment-plans"
CASEREPORTS_FILEID="google-drive-folder-id-for-case-reports"

# ====================================
# AWS S3 (File Uploads)
# ====================================
# S3_UPLOAD_KEY/SECRET are the IAM credentials used for all S3 buckets
S3_UPLOAD_KEY="your-s3-upload-key"
S3_UPLOAD_SECRET="your-s3-upload-secret"

# S3 Recordings Bucket (Session Recordings)
S3_RECORDINGS_BUCKET="your-recordings-bucket"
S3_RECORDINGS_REGION="your-aws-region"  # defaults to af-south-1

# S3 Student Attendance Bucket (attendance documents)
S3_STUDENT_ATTENDANCE_BUCKET="your-student-attendance-bucket"
S3_STUDENT_ATTENDANCE_REGION="your-aws-region"  # defaults to af-south-1

# ====================================
# METABASE (Analytics)
# ====================================
METABASE_SECRET_KEY="your-metabase-secret-key"
METABASE_MONITORING_DASHBOARD_ID="your-metabase-dashboard-id"  # Dashboard ID for Monitoring and Evaluation embed

# ====================================
# APPLICATION SETTINGS
# ====================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_ENV="development"
APP_ENV="development"
DEBUG="0"        # Set to 1 to log every SQL statement Drizzle runs

# Feature flags
NEXT_PUBLIC_ENABLE_PERF_PROFILER="0"  # Set to 1 to enable the performance profiler

# ====================================
# RECORDINGS / FIDELITY SERVICE
# ====================================
FIDELITY_API_URL="https://fidelity-service.example.com"  # External fidelity-analysis API
FIDELITY_API_KEY="your-fidelity-api-key"
RECORDINGS_API_KEY="your-recordings-api-key"  # Shared secret for the recordings worker

# ====================================
# SENTRY (Error Monitoring) — OPTIONAL
# ====================================
# Leave blank to run with Sentry disabled (the app builds and runs fine).
# To enable it, create a project at https://sentry.io and fill these in.
NEXT_PUBLIC_SENTRY_DSN=""  # Client DSN (public). When set, errors report to your project.
SENTRY_ORG=""              # Your Sentry org slug — only needed for source-map upload
SENTRY_PROJECT=""          # Your Sentry project slug — only needed for source-map upload
SENTRY_AUTH_TOKEN=""       # Build-time token for source-map upload (keep secret, set in CI/host)
```

#### Minimal Setup (Development Only)

For quick local development without file upload or email features:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shamiri_db_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="any-random-string-for-dev"
NEXT_PUBLIC_ENV="development"
```

### Authentication Options

**Option 1: Email/Password (Recommended for Development)**

When `NEXT_PUBLIC_ENV=development` and `TEST_USER_PASSWORD` is set, sign in as a seeded user:

- Email: `your-email@test.com`
- Password: the value of `TEST_USER_PASSWORD`

**Option 2: Google OAuth**

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Configure authorized origins: `http://localhost:3000`
3. Configure redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Add credentials to `.env.development`

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  (Web Browser - Hub Coordinators, Supervisors, Fellows, etc.)   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APPLICATION                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   App       │  │   Server    │  │      API Routes         │  │
│  │   Router    │  │   Actions   │  │  /api/auth, /api/rec... │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │    AWS S3       │  │  Google Drive   │
│  (Drizzle ORM)  │  │  (File Storage) │  │   (Documents)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Role-Based Access Control (RBAC)

The platform implements role-specific dashboards and data access:

| Role                | Route      | Description                                                |
| ------------------- | ---------- | ---------------------------------------------------------- |
| **Hub Coordinator** | `/hc/*`    | Oversees operations across multiple schools in a hub       |
| **Supervisor**      | `/sc/*`    | Manages fellows and student groups within assigned schools |
| **Fellow**          | `/fel/*`   | Conducts intervention sessions with student groups         |
| **Clinical Lead**   | `/cl/*`    | Handles clinical cases and high-risk screenings            |
| **Clinical Team**   | `/ct/*`    | Supports clinical operations and case management           |
| **Operations**      | `/ops/*`   | Administrative oversight and system management             |
| **Admin**           | `/admin/*` | System administration and configuration                    |

### Key Entities

```
Hub
 └── Schools (many)
      └── Student Groups (many)
           └── Students (many)
           └── Sessions (many)
                └── Attendances (many)
                └── Recordings (many)

Supervisor
 └── Fellows (many)
      └── Student Groups (many)

Clinical Case
 └── Student
 └── Progress Notes (many)
 └── Treatment Plans (many)
```

## License

MIT License - Copyright (c) 2026 Shamiri Institute

See [LICENSE](LICENSE) for the full license text.
