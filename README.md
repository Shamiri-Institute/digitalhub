[![Build Status](https://github.com/Shamiri-Institute/digitalhub-frontend/actions/workflows/preview.yaml/badge.svg)](https://github.com/Shamiri-Institute/digitalhub-frontend/actions/workflows/preview.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.11.2-blue.svg)](https://github.com/Shamiri-Institute/digitalhub-frontend/releases)

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
Shamiri Institute. (2025). Shamiri Digital Hub [Computer software].
https://github.com/Shamiri-Institute/digitalhub-frontend
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
git clone https://github.com/Shamiri-Institute/digitalhub-frontend.git
cd digitalhub-frontend

# Install dependencies
npm install

# Copy environment file (see Environment Setup section for details)
cp .env.example .env.development

# Start database and run migrations
npm run db:dev:up &
sleep 5  # Wait for database to start
npm run db:dev:migrate
npm run db:dev:seed

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
AWS_REGION="af-south-1"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
S3_UPLOAD_KEY="your-s3-upload-key"
S3_UPLOAD_SECRET="your-s3-upload-secret"
S3_UPLOAD_BUCKET="your-s3-bucket-name"
S3_UPLOAD_REGION="af-south-1"

# S3 Recordings Bucket (Session Recordings)
S3_RECORDINGS_BUCKET="shamiri-recordings-dev"
S3_RECORDINGS_REGION="af-south-1"

# ====================================
# METABASE (Analytics)
# ====================================
METABASE_SECRET_KEY="your-metabase-secret-key"

# ====================================
# APPLICATION SETTINGS
# ====================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_ENV="development"
APP_ENV="development"
SEND_EMAILS="0"  # Set to 1 to enable email sending
DEBUG="0"        # Set to 1 to enable debug mode

# ====================================
# RECORDINGS API (Fidelity Service)
# ====================================
RECORDINGS_API_KEY="your-recordings-api-key"
```

#### Minimal Setup (Development Only)

For quick local development, you only need:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shamiri_db_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="any-random-string-for-dev"
NEXT_PUBLIC_ENV="development"
```

### Database Setup

#### Using Docker (Recommended)

```bash
# Start PostgreSQL container
npm run db:dev:up

# In a separate terminal, run migrations
npm run db:dev:migrate

# Seed with test data
npm run db:dev:seed
```

#### Using Existing PostgreSQL

1. Create a database named `shamiri_db_dev`
2. Update `DATABASE_URL` in `.env.development`
3. Run migrations and seed:

```bash
npm run db:dev:migrate
npm run db:dev:seed
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

The platform uses prefixed Object IDs for improved security and readability:

| Entity | Prefix | Example |
|--------|--------|---------|
| Supervisor | `sup_` | `sup_2YFN4K8B7M9P` |
| Hub Coordinator | `hc_` | `hc_3XGM5L9C8N0Q` |
| Fellow | `fel_` | `fel_4ZHN6M0D9O1R` |
| Student | `stu_` | `stu_5AIQ7N1E0P2S` |
| Recording | `rec_` | `rec_6BJR8O2F1Q3T` |

This pattern prevents enumeration attacks and encodes entity types directly in IDs.

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
| `npm run db:dev:seed` | Seed with test data |
| `npm run db:dev:types` | Generate Prisma client types |
| `npm run db:studio` | Open Prisma Studio GUI |

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
| `AWS_ACCESS_KEY_ID` | Yes | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS credentials for S3 |
| `S3_UPLOAD_BUCKET` | Yes | S3 bucket for uploads |
| `METABASE_SECRET_KEY` | For analytics | Metabase JWT signing key |

#### Deployment Environments

| Environment | Branch | Database | URL |
|-------------|--------|----------|-----|
| Production | `main` | Production DB | `digitalhub.shamiri.institute` |
| Preview | `dev` / PRs | Preview DB | `*.vercel.app` |
| Development | local | Local DB | `localhost:3000` |

#### Build Configuration

The build process automatically runs migrations:

```bash
prisma generate && prisma migrate deploy && next build
```

### Database Migrations in Production

Migrations are automatically applied during Vercel builds. For manual operations:

```bash
# Preview database management
npm run db:preview:reset  # Recreate from production
```

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
      "id": "rec_xxxxx",
      "s3Key": "recordings/2025/01/school/fellow/group/session_rec_xxxxx.mp3",
      "fileName": "session_rec_xxxxx.mp3",
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
  "https://your-domain/api/recordings/rec_xxxxx/status"
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
| Email Sending | `SEND_EMAILS=1` | Enable transactional emails |
| Debug Mode | `DEBUG=1` | Enable verbose logging |
| OAuth | `GOOGLE_ID/SECRET` | Google authentication |
| File Storage | `S3_*` variables | AWS S3 configuration |
| Analytics | `METABASE_SECRET_KEY` | Embedded Metabase dashboards |

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

- **Issues**: [GitHub Issues](https://github.com/Shamiri-Institute/digitalhub-frontend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Shamiri-Institute/digitalhub-frontend/discussions)

### Contact

- **Website**: [shamiri.institute](https://www.shamiri.institute/)
- **Email**: Contact through the website

---

## Technical Notes

### Known Issues

- Installing `aws-crt` is required to work around a Next.js App Router [import issue](https://github.com/aws-amplify/amplify-js/issues/11030)

### S3 Recordings Bucket Setup

#### Creating the S3 Bucket

1. **Create bucket** in AWS Console:
   - **Bucket name**: `shamiri-recordings-dev` (dev) / `shamiri-recordings-prod` (production)
   - **Region**: `af-south-1`
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
           "arn:aws:s3:::shamiri-recordings-dev",
           "arn:aws:s3:::shamiri-recordings-dev/*",
           "arn:aws:s3:::shamiri-recordings-prod",
           "arn:aws:s3:::shamiri-recordings-prod/*"
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
       "AllowedOrigins": ["http://localhost:3000", "https://digitalhub.shamiri.institute", "https://*.vercel.app"],
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

Example: `recordings/2025/01/nairobi_academy/john_doe/group_a/session_1_rec_abc123.mp3`

---

## License

MIT License - Copyright (c) 2025 Shamiri Institute

See [LICENSE](LICENSE) for the full license text.
