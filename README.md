# PhoneFlow ERP

PhoneFlow ERP is a PostgreSQL-backed ERP starter for a wholesale phone business selling to other retail companies. It includes working sample data and screens for:

- retail-customer CRM
- phone and accessory catalog
- stock movements and low-stock monitoring
- sales orders and status transitions
- invoice generation with preview and print button
- invoice preview with item, tax, discount, delivery-fee, paid, and balance breakdown plus download option
- payment capture and balance tracking
- delivery assignment, dispatch, and proof of delivery
- department-based access control
- dedicated finance hub
- payroll with PAYE, SHIF, NSSF, and Housing Levy sample deductions
- communication flow from order through invoice, delivery, and payment

## Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS

## PostgreSQL setup used here

This project is configured to use:

```env
DATABASE_URL="postgresql://postgres:your-password@localhost:5432/phones_erp?schema=public"
DIRECT_URL="postgresql://postgres:your-password@localhost:5432/phones_erp?schema=public"
SESSION_SECRET="replace-with-a-long-random-secret"
```

On this machine, the local PostgreSQL user that worked was:

- username: `postgres`
- database: `phones_erp`
- host: `localhost`
- port: `5432`

## Initial access

- For a fresh production database, open `/setup/admin` and create the first real admin account.
- The bootstrap page only works while there are no user accounts in the system.
- Sample credentials only exist if you intentionally run the seed script in a non-production environment.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Generate Prisma client:

```bash
npm run db:generate
```

3. Push schema to PostgreSQL:

```bash
npm run db:push
```

4. Seed the sample phone business:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Main app areas

- `/` dashboard
- `/customers` retail company customers
- `/products` phone catalog
- `/finance` finance hub
- `/inventory` warehouse stock ledger
- `/orders` sales order flow
- `/invoices` invoice list
- `/invoices/:id` invoice preview and print
- `/deliveries` dispatch planning
- `/delivery-mobile` driver workflow
- `/communications` order-to-cash communication feed
- `/payroll` payroll with statutory deductions
- `/staff` HR and appraisal view
- `/reports` management and finance reports
- `/settings` admin-only controls
- `/setup/admin` one-time production bootstrap for the first admin account

## API endpoints included

- `GET /api/dashboard`
- `GET, POST /api/customers`
- `GET, POST /api/products`
- `GET, POST /api/inventory`
- `GET, POST /api/orders`
- `POST /api/orders/:id/confirm`
- `POST /api/orders/:id/invoice`
- `GET /api/invoices`
- `POST /api/invoices/:id/payments`
- `GET, POST /api/deliveries`
- `POST /api/deliveries/:id/assign`
- `POST /api/deliveries/:id/start`
- `POST /api/deliveries/:id/complete`
- `GET /api/reports`

## Notes

- Passwords are stored as secure hashes and legacy plaintext records auto-upgrade on successful login.
- Authentication now uses server-managed sessions instead of an email-only cookie.
- New department accounts are created with forced password change on first login.
- Admin can reset passwords, deactivate/reactivate users, retire sample accounts, and record periodic privileged-access reviews.
- Admin can load non-destructive starter operational examples from `Settings` without replacing existing accounts.
- Products now support in-app category setup if the category dropdown is empty on a fresh database.
- Department access is restricted in both UI navigation and route access.
- Stock is deducted at dispatch in the current workflow.
- Payroll deductions are implemented as a functional sample using current Kenya payroll concepts and seeded rates.
- HR or Admin can submit the latest payroll run to Finance for salary disbursement from `/payroll`, and the handoff is logged internally.
- For Vercel + Supabase rollout, use [DEPLOYMENT_GUIDE.md](C:/Users/samwel/OneDrive/Desktop/ERP/DEPLOYMENT_GUIDE.md).
- For a fuller company-facing explanation of safety and rollout controls, use [SECURITY_AND_IMPLEMENTATION_OVERVIEW.md](C:/Users/samwel/OneDrive/Desktop/ERP/SECURITY_AND_IMPLEMENTATION_OVERVIEW.md) and [REPORTING_AND_INTEGRATION_GUIDE.md](C:/Users/samwel/OneDrive/Desktop/ERP/REPORTING_AND_INTEGRATION_GUIDE.md).

## Verified locally

- PostgreSQL schema push completed successfully.
- Seed completed successfully against `phones_erp`.
- Migration deployment also succeeded against a fresh PostgreSQL test database.
- Production build completed successfully with `npm run build`.
