[![Preview DB](https://github.com/Shamiri-Institute/digitalhub-frontend/actions/workflows/preview.yaml/badge.svg)](https://github.com/Shamiri-Institute/digitalhub-frontend/actions/workflows/preview.yaml)

# Shamiri Digital Hub

Shamiri Institute is aiming for a digital solution that will help expand its reach and impact. This solution will allow Shamiri to streamline its processes, such as engaging teachers and parents, collecting and reporting data, addressing clinical concerns and monitoring & evaluation of its program.

## Quickstart

- Install [docker compose](https://docs.docker.com/compose/install/)

## Environment Setup

Create a `.env.development` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shamiri_db_dev"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret" # Generate a secure random string

# Google OAuth (for NextAuth) - OPTIONAL for local development
# Not required if using email/password login (NEXT_PUBLIC_ENV=development)
GOOGLE_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"

# Google Drive API (for document storage)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_EMAIL="your-google-service-account-email"
GOOGLE_PROJECT_ID="your-google-project-id"
GOOGLE_PRIVATE_KEY="your-google-private-key"
PROGRESSNOTE_FILEID="your-google-drive-folder-id-for-progress-notes"
TREATMENTPLAN_FILEID="your-google-drive-folder-id-for-treatment-plans"
CASEREPORTS_FILEID="your-google-drive-folder-id-for-case-reports"

# AWS S3 Configuration (for file uploads)
AWS_REGION="your-aws-region"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
S3_UPLOAD_KEY="your-s3-upload-key"
S3_UPLOAD_SECRET="your-s3-upload-secret"
S3_UPLOAD_BUCKET="your-s3-bucket-name"
S3_UPLOAD_REGION="your-s3-region"

# S3 Recordings Bucket (dedicated bucket for session recordings)
S3_RECORDINGS_BUCKET="shamiri-recordings-dev"
S3_RECORDINGS_REGION="af-south-1"

# Metabase Configuration
METABASE_SECRET_KEY="your-metabase-secret-key" # Secret key for signing Metabase JWT tokens

# Application Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_ENV="development"
APP_ENV="development"

# Email Sending
SEND_EMAILS="0" # Set to 1 to enable email sending

# Debug Mode
DEBUG="0" # Set to 1 to enable debug mode

# Recordings API (for fidelity-inference service)
RECORDINGS_API_KEY="your-recordings-api-key" # API key for authenticating recording processing requests
```

## Database

### Creating and running migrations

- After making changes to the [`prisma/schema.prisma`](prisma/schema.prisma) file, run `npm run db:migrate:dev` to generate a migration file.
- When you push your branch to GitHub, Vercel will automatically run the migrations on the preview database (`shamiri_db_preview`).
  - As this is a shared staging database that will be capturing schema changes by multiple developers, it will be recreated from production every night. But developers can manually recreate it by running `npm run db:preview:reset`.

#### Object IDs

Note the use of [Object IDs] for public facing resources used throughout SDH are prefixed ids (more readable version of UUIDs, similiar to [format of Stripe ids]), which allow us to encode the type of the entity in the id itself (e.g. `sup_XXXXX` for Supervisors). This allows us to implement polymorphic relationships in the database. This also improves readability of logs and stacktraces as well as prevents enumeration attacks.

[format of Stripe ids]: https://gist.github.com/fnky/76f533366f75cf75802c8052b577e2a5
[Object IDs]: https://dev.to/stripe/designing-apis-for-humans-object-ids-3o5a
[polymorphic relationships in the database]: https://clerk.com/blog/generating-sortable-stripe-like-ids-with-segment-ksuids?utm_source=www.google.com&utm_medium=referral&utm_campaign=none

## Recordings API

The platform includes API endpoints for processing session recordings with the fidelity-inference AI service.

### Endpoints

#### GET /api/recordings/pending

Returns recordings with PENDING status for processing.

**Headers:**
- `x-api-key`: API key (must match `RECORDINGS_API_KEY` env var)

**Query Parameters:**
- `limit` (optional): Maximum recordings to return (default: 50, max: 100)

**Response:**
```json
{
  "recordings": [
    {
      "id": "rec_xxxxx",
      "s3Key": "recordings/2025/01/school/fellow/group/session_rec_xxxxx.mp3",
      "fileName": "session_rec_xxxxx.mp3",
      "originalFileName": "recording.mp3",
      "fellowName": "John Doe",
      "schoolName": "Example School",
      "groupName": "Group A",
      "sessionName": "Session 1",
      "sessionDate": "2025-01-08T00:00:00.000Z",
      "createdAt": "2025-01-08T10:00:00.000Z",
      "retryCount": 0
    }
  ],
  "count": 1
}
```

#### PATCH /api/recordings/[id]/status

Updates the status and feedback for a recording after AI processing.

**Headers:**
- `x-api-key`: API key (must match `RECORDINGS_API_KEY` env var)
- `Content-Type`: application/json

**Body:**
```json
{
  "status": "COMPLETED",
  "overallScore": "85",
  "fidelityFeedback": {
    "categories": [
      { "name": "Engagement", "score": 90, "feedback": "Excellent engagement" }
    ]
  },
  "errorMessage": null
}
```

**Status Values:**
- `PENDING` - Awaiting processing
- `PROCESSING` - Currently being processed
- `COMPLETED` - Successfully processed
- `FAILED` - Processing failed (can be retried)

### S3 Recordings Bucket Setup

Session recordings are stored in a dedicated S3 bucket separate from general uploads. This provides better organization, security isolation, and cost tracking.

#### Creating the S3 Bucket

1. **Create bucket** in AWS Console with these settings:
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

3. **Configure CORS** (Permissions → CORS):
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

4. **Set Lifecycle Rules** (optional, for cost optimization):
   - Archive recordings to S3 Glacier after 90 days
   - Abort incomplete multipart uploads after 7 days

#### S3 Key Structure

Recordings are stored with the following path structure:
```
recordings/{year}/{month}/{school_name}/{fellow_name}/{group_name}/{session_type}_{recording_id}.{ext}
```

Example: `recordings/2025/01/nairobi_academy/john_doe/group_a/session_1_rec_abc123.mp3`

## Notes

- Installing `aws-crt` to get around Next app dir [import issue](https://github.com/aws-amplify/amplify-js/issues/11030)

# Next.js

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, set up your `.env.development` environment: Copy `.env.example` over and check with the team
on what to supply for the various Digital Hub-related credentials.

- **Authentication Options:**
  - **Option 1 (Recommended for local dev):** Use email/password login with test credentials. No OAuth setup needed.
    - Use any email from the seed data (e.g., `martin.odegaard@test.com`) with password `TestPassword123!`
    - This works when `NEXT_PUBLIC_ENV=development` (default for local dev)
  - **Option 2:** For [NextAuth.js login via Google](https://next-auth.js.org/providers/google), create your own Client ID. (If you used another dev's creds, and they regenerated the client later, you'd get an `Error 401: deleted_client`.) Do so in your GCloud project's [credentials page](https://console.developers.google.com/apis/credentials), configuring:
    - authorized origins: http://localhost:3000
    - authorized redirect URI: http://localhost:3000/api/auth/callback/google
    - Then copy the `Client ID` & `Client secret` to the GOOGLE\* env vars.

Then setup the db (needs docker compose installed):

```
npm run db:dev:up
# OR run it in detached mode:
# docker-compose up -d db

npm run db:dev:migrate
npm run db:dev:seed     # populate with some test data
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Releasing

To make a release to production follow the steps below:

1. Ensure the latest changes on the `main` branch and the `dev` branch.
2. Ensure that the `dev` branch has been been rebased with `main`, or at least confirm that the branches are in sync.
3. Ensure that the tests (automated, manual) have passed on the `dev` branch and that the branch is in good condition.
4. Checkout the `dev` branch. `git checkout dev` or `git switch dev`.
5. **IMPORTANT**: Run `npm run release` on the `dev` branch then run `git push --follow-tags`. Please note the new git tag that has been created in this step.
6. Checkout the `main` branch. `git checkout main` or `git switch main`.
7. Run the following `git merge --ff-only v<x.x.x>` while on the main branch, where the `v<x.x.x>` is the tag output from step 5.

## Deployment

This project is hosted on vercel.

_TODO_: ADD MORE DETAILS ABOUT THE DIFFERENT ENVIRONMENTS THAT WE HAVE IN OUR VERCEL INSTANCE.

## Open Science & Licensing

This project is developed in alignment with [Open Science Framework (OSF)](https://osf.io/) principles, promoting transparency, reproducibility, and accessibility in youth mental health research and intervention delivery.

### Open Science Commitment

- **Transparency**: Open source codebase enabling full inspection of intervention delivery mechanisms
- **Reproducibility**: Documented setup and deployment processes for replication studies
- **Accessibility**: MIT License enabling adaptation by researchers, NGOs, and institutions globally
- **Collaboration**: Open to contributions from the research and development community

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
