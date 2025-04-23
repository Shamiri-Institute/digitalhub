[![Preview DB](https://github.com/Shamiri-Institute/digitalhub-frontend/actions/workflows/preview.yaml/badge.svg)](https://github.com/Shamiri-Institute/digitalhub-frontend/actions/workflows/preview.yaml)

# Shamiri Digital Hub

Shamiri Institute is aiming for a digital solution that will help expand its reach and impact. This solution will allow Shamiri to streamline its processes, such as engaging teachers and parents, collecting and reporting data, addressing clinical concerns and monitoring & evaluation of its program.

## Quickstart

- Install [docker compose](https://docs.docker.com/compose/install/)

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

## Notes

- Installing `aws-crt` to get around Next app dir [import issue](https://github.com/aws-amplify/amplify-js/issues/11030)

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
