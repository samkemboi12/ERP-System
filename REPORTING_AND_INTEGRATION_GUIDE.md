# PhoneFlow ERP: Reporting, Messaging, Backup, and External Integration Guide

Last updated: 2026-05-18

## 1. Viewing the database

There are three practical ways to see ERP data directly:

### Supabase dashboard

Use:

- Table Editor for browsing tables
- SQL Editor for running queries
- Database settings for connection details

This is the easiest non-technical way to inspect live data.

### Prisma Studio for local/admin development

From the project folder, you can run:

```bash
npx prisma studio
```

This opens a browser-based data viewer for the connected database.

### Read-only SQL access

For management reporting or IT review, create a read-only PostgreSQL user and connect with:

- DBeaver
- pgAdmin
- Power BI

Recommended rule:

- never use the full-write application account for reporting tools
- use a separate read-only reporting user whenever possible

For day-to-day ERP demonstration, the app itself now includes:

- a Finance hub
- invoice preview with download option
- payroll handoff examples
- delivery proof-of-delivery examples
- starter operational data loader from Admin settings

## 2. Power BI options

Yes, Power BI can be connected to this ERP data.

### Option A: Power BI connects directly to PostgreSQL

This is the simplest reporting path.

Typical flow:

1. Create a reporting user in PostgreSQL with read-only access.
2. Connect Power BI Desktop to PostgreSQL.
3. Select the ERP tables or views you need.
4. Publish the report to Power BI Service if you want scheduled refresh and sharing.

Best use cases:

- finance dashboards
- sales trend reports
- inventory aging and stock analysis
- payroll summaries for management

### Option B: Power BI reads curated SQL views

This is the best operational setup.

Instead of connecting reports directly to raw tables, create database views such as:

- `vw_sales_summary`
- `vw_invoice_balances`
- `vw_inventory_status`
- `vw_payroll_summary`
- `vw_delivery_performance`

Benefits:

- safer for reporting
- easier for non-technical analysts
- less chance of breaking reports when app tables evolve
- better performance and governance

### Option C: Embed Power BI inside the ERP

Yes, this is possible.

Two common approaches:

- simple embed using a secure Power BI report link for authorized users
- full embedded analytics using Power BI Embedded capacity and application-driven embedding

Best use case:

- executive dashboards inside the ERP home page
- management scorecards without leaving the ERP

Recommendation:

- start with Power BI connected to PostgreSQL
- move to embedded dashboards later if leadership wants in-app reporting

## 3. What "bulk email notification" means

Bulk email notification means sending one ERP-driven message to many recipients at once, usually from a controlled list or customer segment.

Examples:

- all retailers with overdue invoices
- all customers receiving deliveries today
- all customers affected by a price update
- all staff needing payroll-related communication

How it helps:

- saves manual sending time
- keeps communication consistent
- reduces missed recipients
- creates auditability if logged in the ERP

## 4. What "personalized bulk messages" means

Personalized bulk messaging is not the same as one generic mass message.

It means sending one campaign to many recipients, but each message includes recipient-specific data such as:

- customer company name
- invoice number
- outstanding balance
- order number
- delivery date
- account manager name

Example:

- instead of one generic reminder, each customer receives a message with their own invoice balance and due date

How it helps:

- higher response rate
- more professional communication
- better collections performance
- less confusion for customers

## 5. What the CEO likely means by a broadcast message

A broadcast message is a controlled one-to-many communication from the ERP to a selected audience.

Possible audiences:

- all customers
- selected customer segments
- all delivery drivers
- all branch managers
- all finance users

Examples:

- "New wholesale pricing takes effect tomorrow."
- "Warehouse dispatch closes at 4:30 PM today."
- "Your supplier warranty process has changed."

Recommended ERP implementation:

- audience selection
- channel selection: email, SMS, WhatsApp
- optional personalization
- approval workflow for large broadcasts
- communication log entry for audit

## 6. What "backup of the information after dispatched" should mean

In ERP terms, the CEO is describing two different needs:

### Operational proof after dispatch

After dispatch, the system should preserve:

- delivery note
- items dispatched
- dispatch timestamp
- assigned driver
- proof of delivery
- recipient confirmation
- invoice linkage

This is already partly covered by the delivery workflow and proof-of-delivery data model.

### Data backup and recovery

The company should also protect the data itself through:

- automated Supabase backups
- exportable reports
- archived dispatch documents
- optional object storage for POD files and delivery attachments

Recommended enhancement:

- store dispatch/POD artifacts in durable storage such as Supabase Storage, S3, or Cloudflare R2
- link those artifacts back to delivery records in the ERP

## 7. Supplier-system access: what the CEO is asking for

The CEO appears to want selective visibility into supplier data, not unrestricted access to the supplier’s entire internal system.

That should be solved through integration, not by sharing internal credentials across companies.

### Safe integration options

#### Option A: Supplier portal integration

If the supplier already has a portal:

- connect through their API
- pull approved data into the ERP
- display only the permitted supplier details

Examples:

- stock availability
- serial availability
- shipment status
- warranty lookup
- price list updates

#### Option B: Shared data exchange

If the supplier has no API:

- exchange CSV/Excel files securely
- import them on a schedule
- normalize them into supplier-status tables

This is less elegant, but often realistic in East African operations.

#### Option C: Middleware integration layer

If there are multiple suppliers:

- build a supplier integration layer
- connect each supplier separately
- map supplier data into a single ERP-facing model

This is the best long-term option when supplier formats differ.

### Security principle

Do not ask suppliers to share full internal-system logins with your ERP users.

Better pattern:

- supplier-approved API or data feed
- least-privilege access
- per-supplier contracts defining what data may be pulled
- logging of every synchronization event

## 8. Recommended next implementation phases

### Phase 1: Reporting

- create reporting views in PostgreSQL
- connect Power BI with a read-only user
- publish management dashboards

### Phase 2: Communications

- connect email provider
- connect SMS or WhatsApp provider
- add customer segments
- add broadcast and personalized campaign module

### Phase 3: Backup and dispatch archive

- enable automated backups in Supabase
- store POD and dispatch artifacts in object storage
- add downloadable dispatch archive bundles

### Phase 4: Supplier integration

- identify the first supplier with usable data
- confirm whether they offer API, portal export, or flat-file feed
- design a supplier status synchronization model

## 9. Best-practice recommendation for this ERP

The most practical path for your business is:

1. Use Supabase Table Editor and SQL for direct data visibility.
2. Add read-only reporting views for analytics.
3. Connect Power BI to those views.
4. Keep operational transactions in the ERP, not in Power BI.
5. Add bulk and personalized messaging through real providers.
6. Archive dispatch and proof-of-delivery records in durable storage.
7. Integrate suppliers through APIs or controlled data exchange, not shared credentials.
