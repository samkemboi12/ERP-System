# Vercel + Supabase Deployment Guide

This guide is for making PhoneFlow ERP operational on:

- Vercel for the app
- Supabase for PostgreSQL

## 1. Create Supabase project

1. Log in to Supabase.
2. Create a new project.
3. Choose your region close to your users.
4. Save the database password somewhere secure.

## 2. Create a Prisma database user

Supabase recommends using a dedicated Prisma user instead of the default `postgres` role.

In the Supabase SQL Editor, run:

```sql
create user "prisma" with password 'CHANGE_THIS_PASSWORD' bypassrls createdb;
grant "prisma" to "postgres";
grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

## 3. Copy the two connection strings

From Supabase `Connect`, collect:

- pooled connection for the app
- direct connection for migrations

Use:

- `DATABASE_URL`
  Use a Supavisor pooled string for the app.
  For Vercel/serverless use the pooled connection and add `?pgbouncer=true` if needed.
- `DIRECT_URL`
  Use the direct non-pooled connection for migrations.

Example shape:

```env
DATABASE_URL="postgres://prisma.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
```

## 4. Push code to GitHub

1. Create a GitHub repository.
2. Push this project to GitHub.

## 5. Create Vercel project

1. Log in to Vercel.
2. Import the GitHub repository.
3. Keep the framework as Next.js.

## 6. Add Vercel environment variables

In Vercel project settings, add:

- `DATABASE_URL`
- `DIRECT_URL`
- `NODE_ENV=production`
- `SESSION_SECRET`

Later you should also add:

- `APP_URL`
- email provider secrets
- SMS provider secrets

Apply them to `Production`.

For `SESSION_SECRET`, use a long random value and keep it private. This is used to sign ERP session cookies.

## 7. Configure build and migration flow

Before the first production deployment:

1. In Vercel, set the Build Command to:

```bash
npm run db:migrate:deploy && npm run build
```

2. Keep the Install Command as:

```bash
npm install
```

This project already includes:

- Prisma migration history in `prisma/migrations`
- `prisma.config.ts`
- `postinstall` Prisma client generation

## 8. Deploy

Trigger the first deployment from Vercel.

If the deployment succeeds:

1. Open the live URL.
2. If this is a fresh production database, visit `/setup/admin` and create the first admin account.
3. Log in with that admin account.
4. Confirm:
   customers load
   invoices preview
   payroll page works
   communications page works

## 9. Optional production seed

If you want the live system to start with demo data, seed the production database once.

Use:

```bash
npx prisma db seed
```

For a real go-live, replace demo data with your own imports.

Important:

- The current seed script clears existing tables before loading sample data.
- Do not run the seed script against a live production database unless you explicitly want to replace its contents.

## 10. Before real operations

Do these next:

- create the first real admin from `/setup/admin`
- set strong unique passwords for all real users
- set `SESSION_SECRET` in Vercel
- add real email provider
- add real SMS provider
- load real staff
- load real stock
- load real customers
- set your real invoice numbering policy
- enable backups in Supabase
- test each department role
- review Admin, Finance, and HR access monthly from `Settings`

## 11. Go-live rollout

Recommended order:

1. Admin setup
2. Sales team
3. Warehouse team
4. Finance team
5. Delivery team
6. HR and management reporting

## References

- Vercel environment variables: https://vercel.com/docs/environment-variables
- Next.js on Vercel: https://vercel.com/docs/concepts/next.js/overview
- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma
- Supabase connection strings: https://supabase.com/docs/reference/postgres/connection-strings
- Prisma production migrations: https://docs.prisma.io/docs/cli/migrate/deploy
