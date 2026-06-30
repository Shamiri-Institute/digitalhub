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

- **Framework**: [Next.js](https://nextjs.org/) 16.x (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: NextAuth.js with Google OAuth
- **UI Components**: Radix UI + TailwindCSS
- **Data Visualization**: Recharts
- **File Storage**: AWS S3
- **Hosting**: Vercel

---

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

- [Node.js](https://nodejs.org/) v22.x or later
- [Docker Compose](https://docs.docker.com/compose/install/) (for local PostgreSQL)
- npm (comes with Node.js)

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/Shamiri-Institute/digitalhub.git
cd digitalhub

# Install dependencies
npm install

# Copy environment file (see Environment Setup section for details)
cp .env.example .env.development

# Start database and run migrations
npm run db:dev:up &
sleep 5  # Wait for database to start
npm run db:dev:migrate
npm run db:seed

# Start development server
npm run dev
```

### Verify Installation

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Log in with test credentials:
   - **Email**: `martin.odegaard@test.com`
   - **Password**: `TestPassword123!`

---

## Detailed Installation

### System Requirements

| Requirement | Version | Notes |
|------------|---------|-------|
| Node.js | >=22.x | Required for Next.js 16 |
| npm | >=10.x | Comes with Node.js |
| Docker | >=20.x | For local PostgreSQL |
| PostgreSQL | >=14.x | If not using Docker |

### Environment Setup

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

# Comma-separated emails granted super-admin access
SUPERADMINS="admin@example.com"

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
AWS_REGION="your-aws-region"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
S3_UPLOAD_KEY="your-s3-upload-key"
S3_UPLOAD_SECRET="your-s3-upload-secret"
S3_UPLOAD_BUCKET="your-s3-bucket-name"
S3_UPLOAD_REGION="your-aws-region"

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
DEBUG="0"        # Set to 1 to enable verbose Prisma query logging

# Feature flags
NEXT_PUBLIC_ENABLE_TICKETS="0"        # Set to 1 to enable the ticketing UI
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

> **Note:** File uploads and email sending require AWS credentials. If you need these features, add the AWS S3 variables from the full configuration above.

#### Error Monitoring (Sentry) — Optional

Sentry is **disabled by default**. The app builds and runs without any Sentry
configuration. To send errors to your own Sentry project, set
`NEXT_PUBLIC_SENTRY_DSN` (the app automatically whitelists your DSN's ingest
host in the Content-Security-Policy). To also upload source maps for readable
stack traces, additionally set `SENTRY_ORG`, `SENTRY_PROJECT`, and
`SENTRY_AUTH_TOKEN` in your build/CI environment. None of these values are
hardcoded, so forks plug in their own account with zero code changes.

### Database Setup

#### Using Docker (Recommended)

```bash
# Start PostgreSQL container
npm run db:dev:up

# In a separate terminal, run migrations
npm run db:dev:migrate

# Seed with test data
npm run db:seed
```

#### Using Existing PostgreSQL

1. Create a database named `shamiri_db_dev`
2. Update `DATABASE_URL` in `.env.development`
3. Run migrations and seed:

```bash
npm run db:dev:migrate
npm run db:seed
```

### Authentication Options

**Option 1: Email/Password (Recommended for Development)**

When `NEXT_PUBLIC_ENV=development`, use test credentials from seed data:
- Email: `martin.odegaard@test.com`
- Password: `TestPassword123!`

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
│   (Prisma ORM)  │  │  (File Storage) │  │   (Documents)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Role-Based Access Control (RBAC)

The platform implements role-specific dashboards and data access:

| Role | Route | Description |
|------|-------|-------------|
| **Hub Coordinator** | `/hc/*` | Oversees operations across multiple schools in a hub |
| **Supervisor** | `/sc/*` | Manages fellows and student groups within assigned schools |
| **Fellow** | `/fel/*` | Conducts intervention sessions with student groups |
| **Clinical Lead** | `/cl/*` | Handles clinical cases and high-risk screenings |
| **Clinical Team** | `/ct/*` | Supports clinical operations and case management |
| **Operations** | `/ops/*` | Administrative oversight and system management |
| **Admin** | `/admin/*` | System administration and configuration |

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

### Object IDs

The platform uses prefixed Object IDs rather than sequential integers or plain UUIDs. This approach improves security by preventing enumeration attacks and enhances debugging by making entity types identifiable in logs.

---

## Development Guide

### Available Scripts

#### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |

#### Database

| Command | Description |
|---------|-------------|
| `npm run db:dev:up` | Start local PostgreSQL (Docker) |
| `npm run db:dev:migrate` | Run Prisma migrations |
| `npm run db:dev:migrate:reset` | Reset and reapply all migrations |
| `npm run db:seed` | Seed with faker-generated test data |
| `npm run db:dev:generate` | Generate Prisma client types |

#### Code Quality

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run format` | Format code with Biome |
| `npm run stylecheck` | Check code formatting |

#### Testing

| Command | Description |
|---------|-------------|
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:dev` | Run Playwright E2E tests |
| `npm run test:dev:ui` | Run Playwright with UI |
| `npm run test:ci` | Run tests in CI mode |

### Code Quality Gates

**All code changes must pass these checks before merging:**

```bash
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint code quality
npm run stylecheck  # Biome formatting
npm run test:unit   # Unit tests
```

### Git Workflow

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add Google OAuth integration
fix(database): resolve migration rollback issue
chore(deps): update Next.js to v16.0.10
refactor(components): extract reusable form validation
docs(readme): update installation instructions
test(e2e): add hub coordinator flow tests
```

### Release Process

```bash
# On dev branch
git checkout dev
npm run release
git push --follow-tags

# Fast-forward merge to main
git checkout main
git merge --ff-only v<version>
git push
```

---

## Deployment Guide

### Vercel Deployment (Recommended)

This project is optimized for [Vercel](https://vercel.com/) deployment.

#### Environment Variables

Configure these in your Vercel project settings:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Production URL |
| `NEXTAUTH_SECRET` | Yes | Authentication secret |
| `GOOGLE_ID` | Yes | Google OAuth Client ID |
| `GOOGLE_SECRET` | Yes | Google OAuth Client Secret |
| `AWS_REGION` | Yes | AWS region |
| `AWS_ACCESS_KEY_ID` | Yes | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS credentials for S3 |
| `S3_UPLOAD_KEY` | Yes | Access key for the uploads bucket |
| `S3_UPLOAD_SECRET` | Yes | Secret key for the uploads bucket |
| `S3_UPLOAD_BUCKET` | Yes | S3 bucket for uploads |
| `S3_UPLOAD_REGION` | Yes | Region of the uploads bucket |
| `S3_RECORDINGS_BUCKET` | Yes | S3 bucket for session recordings |
| `S3_RECORDINGS_REGION` | No | Recordings bucket region (defaults to `af-south-1`) |
| `S3_STUDENT_ATTENDANCE_BUCKET` | No | Bucket for attendance documents |
| `RECORDINGS_API_KEY` | For fidelity | Shared secret for the recordings/fidelity worker |
| `METABASE_SECRET_KEY` | For analytics | Metabase JWT signing key |
| `METABASE_MONITORING_DASHBOARD_ID` | For analytics | Metabase Monitoring and Evaluation dashboard ID (numeric) |

#### Deployment Environments

| Environment | Branch | Database |
|-------------|--------|----------|
| Production | `main` | Production DB |
| Preview / Staging | `dev` / PRs | Dedicated DB rebuilt from faker seed data (no production data) |
| Development | local | Local DB |

#### Build Configuration

The build process automatically runs migrations:

```bash
prisma generate && prisma migrate deploy && next build
```

### Database per Environment

Migrations are applied automatically during Vercel builds:

- **Production** (`vercel:build`): `prisma migrate deploy` — applies pending migrations, never touches data.
- **Preview / Staging / Training** (`vercel:preview:build`, `vercel:testing:build`, `vercel:training:build` — all aliases of `vercel:seeded:build`): `prisma migrate reset` + `prisma migrate deploy` + `npm run db:seed` — rebuilds the database from faker-generated data on each deploy.

The preview/staging database is **seeded with synthetic data and never cloned from production**, so it contains no real student, clinical, or financial information.

---

## Recordings API

The platform includes API endpoints for processing session recordings with external AI fidelity services.

### Authentication

All API requests require the `x-api-key` header matching the `RECORDINGS_API_KEY` environment variable.

### Endpoints

#### GET /api/recordings/pending

Returns recordings awaiting processing.

```bash
curl -H "x-api-key: your-api-key" \
  "https://your-domain/api/recordings/pending?limit=50"
```

**Response:**
```json
{
  "recordings": [
    {
      "id": "<recording-id>",
      "s3Key": "recordings/2025/01/school/fellow/group/session.mp3",
      "fileName": "session.mp3",
      "fellowName": "John Doe",
      "schoolName": "Example School",
      "sessionDate": "2025-01-08T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### PATCH /api/recordings/[id]/status

Update recording status after processing.

```bash
curl -X PATCH \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED", "overallScore": "85"}' \
  "https://your-domain/api/recordings/<recording-id>/status"
```

**Status Values:** `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

### S3 Recordings Setup

See [S3 Recordings Bucket Setup](#s3-recordings-bucket-setup) for detailed AWS configuration.

---

## For Organizations & Adopters

### Customization Guide

This platform can be adapted for similar intervention programs:

1. **Branding**: Update `tailwind.config.ts` for your color scheme
2. **Roles**: Modify role definitions in `prisma/schema.prisma`
3. **Workflows**: Adapt server actions in `lib/actions/`
4. **Data Models**: Extend Prisma schema for your data requirements

### Configuration Options

| Feature | Configuration | Description |
|---------|--------------|-------------|
| Debug Mode | `DEBUG=1` | Enable verbose Prisma query logging |
| Tickets UI | `NEXT_PUBLIC_ENABLE_TICKETS=1` | Enable the ticketing interface |
| Perf Profiler | `NEXT_PUBLIC_ENABLE_PERF_PROFILER=1` | Enable the performance profiler |
| OAuth | `GOOGLE_ID/SECRET` | Google authentication |
| File Storage | `S3_*` variables | AWS S3 configuration |
| Analytics | `METABASE_SECRET_KEY`, `METABASE_MONITORING_DASHBOARD_ID` | Embedded Metabase dashboards |

### Scaling Considerations

- **Database**: Use connection pooling (PgBouncer) for high traffic
- **File Storage**: Configure S3 lifecycle rules for cost optimization
- **Caching**: Implement Redis for session/query caching at scale
- **CDN**: Use Vercel's Edge Network for global distribution

---

## Contributing

We welcome contributions from the community!

### How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes following our code style
4. Run quality gates: `npm run typecheck && npm run lint && npm run stylecheck`
5. Commit using conventional commits
6. Open a Pull Request

### Development Standards

- Use TypeScript strict mode
- Follow TailwindCSS-only styling
- Reuse existing components from `components/ui/`
- Write tests for new functionality
- Document API changes

---

## Support & Community

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/Shamiri-Institute/digitalhub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Shamiri-Institute/digitalhub/discussions)

### Contact

- **Website**: [shamiri.institute](https://www.shamiri.institute/)
- **Email**: Contact through the website

---

## Technical Notes

### S3 Recordings Bucket Setup

#### Creating the S3 Bucket

1. **Create bucket** in AWS Console:
   - **Bucket name**: Choose a descriptive name for your environment (e.g., `myorg-recordings-dev`)
   - **Region**: Choose based on your target users' location
   - **Block Public Access**: Enable ALL
   - **Default encryption**: SSE-S3 (AES-256)

2. **Create IAM Policy** named `ShamiriRecordingsBucketPolicy`:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "RecordingsBucketAccess",
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
         "Resource": [
           "arn:aws:s3:::your-recordings-bucket-dev",
           "arn:aws:s3:::your-recordings-bucket-dev/*",
           "arn:aws:s3:::your-recordings-bucket-prod",
           "arn:aws:s3:::your-recordings-bucket-prod/*"
         ]
       }
     ]
   }
   ```

3. **Configure CORS** (Permissions > CORS):
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "POST", "GET"],
       "AllowedOrigins": ["http://localhost:3000", "https://your-production-domain.com", "https://*.vercel.app"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. **Set Lifecycle Rules** (optional):
   - Archive recordings to S3 Glacier after 90 days
   - Abort incomplete multipart uploads after 7 days

#### S3 Key Structure

```
recordings/{year}/{month}/{school_name}/{fellow_name}/{group_name}/{session_type}_{recording_id}.{ext}
```

Example: `recordings/2025/01/example_school/facilitator_name/group_a/session_1.mp3`

---

## License

MIT License - Copyright (c) 2026 Shamiri Institute

See [LICENSE](LICENSE) for the full license text.
