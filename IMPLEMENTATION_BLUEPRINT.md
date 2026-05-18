# Integrated Business Management System (ERP) Blueprint

## 1. Purpose

This document converts the requirements in `System Description.docx` into a practical blueprint for building a working ERP solution.

The target system is a centralized web-based ERP that handles:

- Sales and order management
- Invoicing
- Delivery and proof of delivery
- Order tracking
- Inventory management
- CRM
- Communication and notifications
- Staff management
- Commission management
- Payroll
- Staff appraisal
- Analytics and reporting
- Access control and security

## 2. Recommended Product Shape

Build a **modular monolith** first, not microservices.

Why:

- Faster to deliver
- Easier to maintain for an early-stage ERP
- Keeps all modules on one codebase and one database
- Still allows future separation into services if growth requires it

Recommended delivery model:

- Web application for admins, sales, warehouse, HR, finance
- Mobile-responsive web app for delivery staff
- Single backend API
- Central relational database
- Background job worker for notifications, reports, and scheduled processing

## 3. Recommended Technology Stack

### Frontend

- `Next.js` with `TypeScript`
- `Tailwind CSS` for UI styling
- `shadcn/ui` or a similar component system for admin dashboards
- `React Hook Form` + `Zod` for forms and validation
- `TanStack Query` for data fetching and caching

Why:

- Excellent for admin dashboards and business workflows
- Easy role-based routing and form-heavy interfaces
- Good support for desktop and mobile-responsive delivery screens

### Backend

- `NestJS` with `TypeScript`
- REST API initially
- Background jobs with `BullMQ`

Why:

- Clear module structure
- Good fit for enterprise-style domain separation
- Strong validation, guards, authentication, and maintainability

### Database

- `PostgreSQL`
- `Prisma ORM`

Why:

- Reliable relational data model
- Strong transactional support for orders, invoices, stock, payroll
- Easy auditability and reporting

### Authentication and Security

- `JWT` access tokens with refresh tokens
- Password hashing with `argon2`
- Role-based access control
- Audit logging on sensitive actions

### File and Document Storage

- Local storage for development
- `AWS S3`, `Cloudflare R2`, or equivalent in production

Use this for:

- Invoice PDFs
- Payslips
- Digital signatures
- Delivery attachments

### Notifications

- Email: `Resend`, `SendGrid`, or SMTP provider
- SMS: `Twilio`, `Africa's Talking`, or similar regional provider

### PDF Generation

- `pdf-lib`, `Puppeteer`, or server-rendered HTML-to-PDF

Use for:

- Invoices
- Delivery notes
- Payslips
- Reports

### Deployment

- Frontend: `Vercel` or containerized hosting
- Backend: `Railway`, `Render`, `DigitalOcean`, or Docker on VPS
- Database: managed PostgreSQL
- Cache/queue: `Redis`

## 4. High-Level Architecture

### Core layers

1. Presentation layer
   - Admin dashboard
   - Sales screens
   - Warehouse screens
   - Delivery mobile screens
   - HR and payroll screens

2. Application layer
   - Business rules
   - Use cases
   - Approval and workflow logic

3. Domain layer
   - Orders
   - Invoices
   - Deliveries
   - Inventory
   - CRM
   - HR
   - Payroll
   - Analytics

4. Infrastructure layer
   - Database
   - Storage
   - Notification providers
   - PDF generation
   - Background jobs

### Recommended backend modules

- `auth`
- `users`
- `roles-permissions`
- `customers`
- `products`
- `inventory`
- `orders`
- `invoices`
- `deliveries`
- `pod`
- `communications`
- `staff`
- `commissions`
- `payroll`
- `appraisals`
- `reports`
- `dashboard`
- `audit-logs`
- `settings`
- `integrations`

## 5. Main User Roles

The requirements explicitly mention:

- Admin
- Sales
- Warehouse
- Delivery
- HR

Add two more practical roles:

- Finance
- Manager

### Suggested permissions

- `Admin`: full access
- `Sales`: customers, orders, invoices, communication, own performance
- `Warehouse`: products, stock movements, stock alerts, delivery prep
- `Delivery`: assigned deliveries, delivery updates, signature capture
- `HR`: staff records, appraisal, payroll support
- `Finance`: invoices, payments, payroll, commission summaries, exports
- `Manager`: dashboards, approvals, performance reports

## 6. Core Functional Blueprint

### 6.1 Sales, Orders, and Invoicing

What to build:

- Customer order creation
- Draft and confirmed orders
- Order line items with quantity, price, discounts, tax
- Automatic invoice generation from orders
- Sequential invoice number generator
- Invoice statuses: `draft`, `issued`, `paid`, `overdue`, `cancelled`
- PDF invoice generation and printing
- Payment tracking

Operational flow:

1. Sales creates customer order
2. System validates product availability
3. Order is saved as draft or confirmed
4. Invoice is generated from confirmed order
5. Delivery note can be created from the order/invoice
6. Payment status updates invoice status

Important rules:

- Invoice numbers must be unique and sequential
- Orders should not be deleted once used downstream; use status-based lifecycle
- Monetary values should be stored as decimal values with currency support

### 6.2 Delivery Note and Proof of Delivery

What to build:

- Delivery note generation from orders or invoices
- Assignment of delivery staff/driver
- Delivery status tracking
- Mobile view for drivers
- Signature capture
- Optional GPS location and timestamp capture
- Auto-completion of delivery when POD is submitted

Statuses:

- `pending`
- `assigned`
- `in_transit`
- `delivered`
- `failed`
- `cancelled`

Operational flow:

1. Warehouse or sales creates delivery from approved order/invoice
2. Delivery is assigned to a driver
3. Driver views assigned deliveries on mobile
4. Driver updates status during transit
5. Customer signs on device
6. System stores signature and timestamps delivery as completed
7. Inventory is deducted at the correct stage

Recommendation:

- Deduct stock when delivery is confirmed or when goods are dispatched, depending on business policy
- Support configurable policy in settings

### 6.3 Order Tracking

What to build:

- Lifecycle view of every order
- Timeline of status changes
- Cross-link to invoice and delivery
- Staff/admin tracking dashboard

Suggested statuses:

- `draft`
- `confirmed`
- `invoiced`
- `packed`
- `dispatched`
- `delivered`
- `closed`
- `cancelled`

### 6.4 Inventory Management

What to build:

- Product catalog
- SKU management
- Product categories
- Stock balance per item
- Stock-in and stock-out transactions
- Reorder threshold / low stock alerts
- Inventory audit trail

Operational rules:

- Every stock change must create an inventory movement record
- No direct editing of stock quantity without an adjustment record
- Link stock-out to order or delivery where relevant

Suggested movement types:

- `purchase_in`
- `manual_adjustment_in`
- `manual_adjustment_out`
- `sales_reservation`
- `delivery_dispatch`
- `delivery_confirmed`
- `return_in`
- `damaged_out`

### 6.5 CRM

What to build:

- Customer profiles
- Contacts and addresses
- Purchase history
- Communication history
- Segmentation
- Notes and interactions

Useful segments:

- Frequent buyers
- High-value customers
- Inactive customers
- Customers with overdue balances

### 6.6 Communication and Notifications

What to build:

- Bulk email
- Personalized campaigns
- SMS/email templates
- Event-triggered notifications

Automations required by the requirements:

- Order confirmation
- Delivery updates
- Payment reminders

Operational design:

- Trigger events publish notification jobs
- Worker consumes jobs and sends through email/SMS provider
- Delivery status and communication history are stored in database

### 6.7 Staff Management

What to build:

- Staff profiles
- Department and role mapping
- Employment status
- Activity logs
- Staff performance visibility

Recommended additions:

- Branch/team assignment
- Supervisor relationship
- Employment start date
- Identity and payroll fields

### 6.8 Commission Management

What to build:

- Commission rules by role or person
- Commission calculation engine
- Period summaries
- Earnings breakdown per staff

Suggested rule types:

- Percent of sales
- Fixed amount per completed sale
- Tiered commission by revenue band
- Commission only on paid invoices

Strong recommendation:

- Calculate commission from paid invoices, not just issued invoices, unless the business decides otherwise

### 6.9 Payroll

What to build:

- Salary structure
- Allowances
- Deductions
- Monthly payroll run
- Payslip generation
- Payroll history

Operational flow:

1. HR/Finance maintains staff salary structure
2. Commission totals feed payroll when applicable
3. Monthly payroll run calculates gross, deductions, net pay
4. Payslip PDF is generated
5. Payroll run is locked after approval

### 6.10 Staff Appraisal

What to build:

- Review periods
- Rating criteria
- Manager feedback
- Historical appraisals

Suggested metrics:

- Sales performance
- Delivery completion rate
- Timeliness
- Attendance
- Customer feedback
- Manager score

### 6.11 Analytics and Reporting

What to build:

- Dashboard KPIs
- Sales reports by period
- Revenue analysis
- Customer insights
- Staff performance reports
- Inventory movement reports
- Commission and payroll summaries

Dashboard KPIs:

- Revenue today / month
- Orders pending
- Deliveries in transit
- Overdue invoices
- Low stock items
- Top customers
- Top-performing staff

### 6.12 User Access and Security

What to build:

- Secure login
- Role-based permissions
- Session handling
- Audit logs
- Sensitive module restrictions

Sensitive actions that must be logged:

- Login and logout
- Invoice creation and cancellation
- Payment recording
- Stock adjustments
- Delivery confirmation
- Payroll runs
- Commission rule changes
- User/role changes

## 7. Shared System Workflows

### End-to-end order-to-cash flow

1. Create customer
2. Create order
3. Validate stock
4. Generate invoice
5. Assign delivery
6. Dispatch goods
7. Capture POD
8. Update order and delivery status
9. Record payment
10. Reflect in analytics and commission

### Hire-to-pay flow

1. Create staff profile
2. Assign role and salary structure
3. Track activity/performance
4. Apply commissions where relevant
5. Run payroll
6. Generate payslip
7. Store payroll history

## 8. Data Model Blueprint

### Core entities

- `users`
- `roles`
- `permissions`
- `staff`
- `customers`
- `customer_contacts`
- `customer_addresses`
- `products`
- `product_categories`
- `inventory_balances`
- `inventory_movements`
- `orders`
- `order_items`
- `invoices`
- `invoice_items`
- `payments`
- `deliveries`
- `delivery_items`
- `proof_of_delivery`
- `communication_templates`
- `communication_logs`
- `commissions`
- `commission_rules`
- `payroll_runs`
- `payroll_items`
- `appraisals`
- `audit_logs`
- `attachments`
- `settings`

### Key relationships

- One customer has many orders
- One order has many order items
- One order can produce one or more invoices if partial billing is needed later
- One order/invoice can have one or more deliveries
- One delivery can have one POD record
- One product has many inventory movements
- One staff member can have many deliveries, appraisals, commissions, payroll items

### Important design rules

- Use immutable transaction records for audit-heavy modules
- Prefer status transitions over deletes
- Store `created_by`, `updated_by`, and timestamps on all business records
- Use soft deletes only where safe; avoid them for financial transaction records

## 9. State Machines

### Order state

- `draft -> confirmed -> invoiced -> packed -> dispatched -> delivered -> closed`
- Exceptional paths: `cancelled`, `failed`

### Invoice state

- `draft -> issued -> paid`
- Exceptional paths: `overdue`, `void`

### Delivery state

- `pending -> assigned -> in_transit -> delivered`
- Exceptional paths: `failed`, `cancelled`

### Payroll run state

- `draft -> calculated -> approved -> finalized`

These state machines should be enforced in backend services, not only in the UI.

## 10. API Blueprint

Expose REST endpoints grouped by module.

Examples:

- `POST /auth/login`
- `GET /dashboard/summary`
- `POST /customers`
- `GET /customers/:id`
- `POST /orders`
- `POST /orders/:id/confirm`
- `POST /orders/:id/generate-invoice`
- `POST /invoices/:id/payments`
- `POST /deliveries`
- `POST /deliveries/:id/assign`
- `POST /deliveries/:id/start`
- `POST /deliveries/:id/complete`
- `POST /deliveries/:id/pod`
- `POST /inventory/movements`
- `POST /communications/send`
- `POST /payroll/runs`
- `POST /payroll/runs/:id/finalize`
- `POST /appraisals`
- `GET /reports/sales`

## 11. UI Blueprint

### Main application areas

- Login
- Dashboard
- Customers
- Orders
- Invoices
- Deliveries
- Inventory
- Communications
- Staff
- Commission
- Payroll
- Appraisals
- Reports
- Settings

### Delivery mobile screens

- Login
- My deliveries
- Delivery detail
- Start delivery
- Capture signature
- Mark delivered/failed
- Location/timestamp confirmation

### Admin dashboard widgets

- Revenue summary
- Pending orders
- Overdue invoices
- Delivery performance
- Low stock alerts
- Staff performance snapshot

## 12. Non-Functional Requirements

### Performance

- Fast list filtering and pagination
- Indexed search on orders, customers, invoices, products
- Background processing for notifications and PDF generation

### Reliability

- Database backups
- Error monitoring
- Retry logic for SMS/email jobs
- Transaction handling for stock and financial changes

### Security

- Password hashing
- Permission checks on every sensitive endpoint
- Audit trails
- Input validation
- Rate limiting on authentication

### Scalability

- Modular codebase
- Queue-based async work
- External storage for files
- Read-optimized reporting queries or reporting views

## 13. Integration Blueprint

The requirements mention future integrations. Design adapters for:

- Email provider
- SMS provider
- Accounting software
- Export to CSV/Excel

Recommended approach:

- Create an `integrations` module
- Use provider interfaces
- Keep business logic separate from vendor-specific SDKs

## 14. Build Order

### Phase 1: Foundation

- Authentication
- Roles and permissions
- Users and staff base records
- Customers
- Products and inventory basics
- Audit logging
- App settings

### Phase 2: Core commercial flow

- Orders
- Invoices
- Payments
- Delivery notes
- Order tracking

### Phase 3: Operational mobility

- Delivery mobile screens
- POD signature capture
- Delivery timestamps and optional location
- Notification triggers

### Phase 4: Business support modules

- CRM notes/history
- Bulk communication
- Commission rules and calculations
- Payroll
- Appraisals

### Phase 5: Reporting and hardening

- Dashboards
- Exports
- Analytics
- Performance optimization
- Security review
- Backup and recovery procedures

## 15. MVP Recommendation

If the goal is to get a working solution quickly, the MVP should include only the modules that create the core business loop:

- Authentication and RBAC
- Customers
- Products and inventory
- Orders
- Invoices
- Deliveries
- POD
- Basic notifications
- Dashboard and reports

This gives a usable system for sales-to-delivery operations before adding deeper HR and payroll features.

## 16. Key Decisions To Make Early

These are the biggest product decisions that affect implementation:

- Is stock deducted on dispatch or on confirmed delivery?
- Are commissions based on issued invoices or paid invoices?
- Can one order create multiple invoices or only one?
- Can one invoice be delivered in partial batches?
- Are payroll and finance approvals required before finalization?
- Is GPS capture mandatory or optional for POD?
- Which SMS/email provider will be used?
- Will the first release be single-branch or multi-branch?

## 17. Suggested Folder Structure

```text
erp/
  apps/
    web/
    api/
    worker/
  packages/
    ui/
    config/
    types/
  docs/
  prisma/
  docker/
```

If using a single repository:

- `apps/web`: Next.js frontend
- `apps/api`: NestJS backend
- `apps/worker`: queue worker for async jobs

## 18. Testing Strategy

### Backend

- Unit tests for business rules
- Integration tests for workflows
- Permission tests for role enforcement
- Transaction tests for inventory, invoicing, payroll

### Frontend

- Form validation tests
- Critical user flows with Playwright

Critical end-to-end tests:

- Create order -> generate invoice -> create delivery -> capture POD
- Record payment -> invoice marked paid
- Stock movement recorded after delivery/dispatch
- Payroll run generates payslip

## 19. Risks and Controls

### Major risks

- Inventory inconsistency
- Broken order-invoice-delivery linkage
- Weak permission controls
- Payroll miscalculation
- Notification failures
- Poor mobile usability for delivery staff

### Controls

- Transaction-safe backend logic
- Strict status transitions
- Comprehensive audit logs
- Background job retries
- Mobile-first delivery UI
- Reporting reconciliation screens

## 20. Final Recommendation

The best path is to build this ERP as a modular monolith using:

- `Next.js` for the frontend
- `NestJS` for the backend
- `PostgreSQL` + `Prisma` for the database
- `Redis` + `BullMQ` for background jobs

Start with the commercial operations backbone:

- customers
- products
- inventory
- orders
- invoices
- deliveries
- POD

Then expand into:

- CRM
- communication
- commissions
- payroll
- appraisals
- advanced analytics

This approach gives a realistic path to a working, scalable business system instead of trying to deliver every ERP feature at once.
