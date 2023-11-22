# Shamiri Digital Hub

## Quickstart

- Install [docker compose](https://docs.docker.com/compose/install/)

## Database

### Creating and running migrations

- After making changes to the [`prisma/schema.prisma`](prisma/schema.prisma) file, run `npm run db:migrate:dev` to generate a migration file.

## Notes

- ## Installing `aws-crt` to get around Next app dir import error referred to in following issue:
  - https://github.com/aws-amplify/amplify-js/issues/11030

# Next.js

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, set up your `.env.development` environment: Copy `.env.example` over and check with the team
on what to supply for the various Digital Hub-related credentials.

- for [NextAuth.js login via Google](https://next-auth.js.org/providers/google), you may wish to create your own Client ID for local dev. (If you used another dev's creds, and they regenerated the client later, you'd get an `Error 401: deleted_client`.) Do so in your GCloud project's [credentials page](https://console.developers.google.com/apis/credentials), configuring:
  - authorized origins: http://localhost:3000
  - authorized redirect URI: http://localhost:3000/api/auth/callback/google
    Then copy the `Client ID` & `Client secret` to the GOOGLE\* env vars.

Then setup the db (needs docker compose installed):

```
npm run db:dev:up
# OR run it in detached mode:
# docker-compose up -d db

npm run db:dev:migrate
npm run db:dev:seed     # populate with some test data
```

Test data comes from csv's pulled from Airtable, stored in [prisma/scripts/airtable](prisma/scripts/airtable). See [seed.ts](prisma/scripts/seed.ts) for the loading code.

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
