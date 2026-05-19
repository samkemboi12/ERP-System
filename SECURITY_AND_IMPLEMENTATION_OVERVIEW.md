# PhoneFlow ERP: Implementation and Security Overview

Last updated: 2026-05-18

## 1. Executive summary

PhoneFlow ERP is a web-based ERP platform for a phone distribution business selling to other retail companies. It is deployed as a Next.js application on Vercel and uses PostgreSQL on Supabase for data storage.

The system currently supports:

- customer management
- phone and accessory catalog management
- inventory control
- sales order workflow
- invoice generation and preview
- invoice download-ready preview with full financial breakdown
- payment capture
- delivery planning and proof of delivery
- payroll with statutory deductions
- internal communication logging
- role-based access control by department
- admin-controlled account creation
- finance hub and non-destructive starter-data population tools

From a security point of view, the system is meaningfully safer now than the first deployed version because:

- demo passwords are no longer shown on the login page
- passwords are no longer stored in plaintext for new accounts
- legacy plaintext passwords are automatically upgraded to hashed storage after successful login
- only Admin can create new department accounts
- departments do not share unrestricted visibility across the system

That said, this is not yet a finished enterprise security program. The platform is operational, but a few important hardening steps still remain before it should be treated as a fully mature production system.

## 2. What has been implemented so far

### Business and operations

The project was adapted from a router-focused starter into a phone-distribution ERP. It now models a business that sells phones and accessories to other retail companies rather than to walk-in end users.

Implemented modules include:

- dashboard and KPI visibility
- customer records for retail-company buyers
- product catalog for phones and accessories
- inventory movement ledger
- stock reservation and dispatch workflow
- sales orders from creation to confirmation
- invoice generation from orders
- invoice preview with tax, discount, delivery fee, total, paid amount, and outstanding balance
- printable invoice view
- payment posting and balance updates
- delivery planning and assignment
- driver workflow and proof of delivery
- payroll processing with PAYE, SHIF, NSSF, and Housing Levy
- communication history across order, invoice, delivery, and payment events
- reporting screens for management and finance

### Department-based operating model

The system uses one shared ERP and one shared database, but not every employee sees the same information.

Role-based access is already enforced for:

- Admin
- Sales
- Warehouse
- Delivery
- HR
- Finance
- Manager

This means the company does not need separate systems for each department. Instead, each department signs into the same ERP and is limited to the workflows it actually needs.

### Deployment architecture

The production architecture currently in use is:

- frontend and server application: Vercel
- database: Supabase PostgreSQL
- ORM and schema management: Prisma
- application framework: Next.js App Router

## 3. Current access control model

The system uses role-based access control in two layers:

### Navigation control

Users only see navigation links for areas their role is allowed to access.

Examples:

- Delivery only sees the driver workflow
- Finance sees invoices, reports, payroll, and communications
- HR sees staff and payroll
- Warehouse sees inventory and delivery operations
- Sales sees customers, orders, invoices, and related communication flow
- Admin sees all areas

### Route protection

Even if someone guesses a URL manually, the system checks the user role again before allowing access. If the role is not allowed, the user is redirected to the proper home area for that role.

This is important because hiding menu items alone is not enough. The route-level protection closes that gap.

## 4. Authentication and password safety

### What was wrong before

Earlier in the project:

- the login page exposed demo email and password combinations
- user passwords were compared in plaintext
- seeded accounts used weak sample passwords

That was acceptable only for early development, not for real company use.

### What has been fixed

The authentication flow now behaves differently:

- the login page no longer exposes demo credentials
- new passwords are hashed before being stored
- legacy plaintext passwords are upgraded automatically after a successful login
- admin can create accounts without touching the database directly
- users can now change their own passwords after login
- admins can reset department passwords from the ERP
- admins can deactivate or reactivate user accounts
- sample accounts can be retired from the admin controls

### Hashing approach

Passwords are now hashed using Node.js `scrypt`, which is a modern password-based key derivation function designed to resist brute-force attacks better than plain hashing.

The implementation lives in:

- `lib/passwords.ts`

### Important limitation

Although password storage is now improved, the system does not yet force users to rotate temporary passwords after first login. That is still recommended as a next step.

## 5. Session and login safety

The system now uses server-managed sessions to keep a user signed in.

Current protections:

- session cookies are `httpOnly`
- session cookies are `sameSite=lax`
- session cookies are marked `secure` in production
- the cookie is signed using a server secret
- the real session record is stored in the database
- sessions can be invalidated centrally
- sessions are cleared when an account is deactivated
- other sessions are signed out after a user changes their password

These are better protections than the original email-based cookie because the browser no longer carries the account identity directly.

### Current login protection additions

- failed login attempts are counted
- too many repeated failures trigger a temporary lock
- locked accounts enter a cooldown window before new attempts are accepted
- new department accounts are flagged for first-password-change

### Important limitation

The system still does not yet use multi-factor authentication, IP-based rate limiting, or a dedicated identity provider. It is significantly improved, but not yet at the final hardening state of a larger enterprise IAM program.

## 6. Admin bootstrap and account lifecycle

Because the live production database initially had no users, a safe bootstrap path was added.

### First admin creation

The system now exposes a one-time setup page:

- `/setup/admin`

This page:

- is only available while the system has zero user accounts
- creates the first real admin securely
- disappears once the first account exists
- avoids loading demo/sample business data into production

### Department account creation

After the first admin signs in, the admin can create department accounts from:

- `Settings`

That process creates:

- a login account
- a linked staff profile

This linkage matters because payroll, delivery assignment, reporting, and role control all depend on staff and user records staying aligned.

### Account lifecycle controls now available

Admin can now:

- create new department accounts
- issue temporary passwords
- force first-password-change
- reset user passwords
- deactivate users
- reactivate users
- retire sample accounts
- record privileged-access reviews

## 7. Payroll and employee data handling

The payroll module is now functional as an internal operational workflow.

It currently supports:

- payroll runs
- employee line items
- gross pay
- PAYE
- SHIF
- NSSF
- Housing Levy
- other deductions
- net pay

### HR to Finance handoff

Yes, month-end salary information can now be handed off from HR to Finance through the system.

The payroll page now supports:

- HR or Admin reviewing the latest payroll run
- submitting the approved payroll to Finance
- recording the handoff in the internal communication trail
- marking the payroll run as approved for disbursement

This gives the company an audit trail showing that salary figures moved from HR review to Finance action in a controlled way.

### Employee privacy position

The employee data is not publicly exposed, and department access restrictions reduce unnecessary visibility. However, payroll confidentiality still depends on correct role assignment and strong admin practices.

Examples:

- Delivery staff do not need payroll visibility
- Warehouse staff do not need finance visibility
- Finance and HR have access only where required by operations

## 8. Customer and commercial data safety

The system stores:

- company customer names
- contacts
- phone numbers
- emails
- credit limits
- invoices
- payments
- order history

Current protections:

- authenticated access is required
- routes are role-restricted
- finance-sensitive areas are not shown to unrelated departments
- customer-facing workflow events are tracked through communications and audit data

### Important limitation

The project does not yet include field-level encryption for especially sensitive data such as bank information or personally sensitive employee identifiers. If the business wants stronger protection for payroll banking details or tax identifiers, that should be added next.

## 9. Auditability and traceability

The system keeps internal records for important workflow events.

Examples:

- order created
- order confirmed
- invoice issued
- payment recorded
- delivery created
- delivery started
- delivery completed
- payroll submitted to Finance
- user account created

This supports accountability and helps the business answer:

- who performed an action
- when it happened
- what record it affected

This is valuable for internal controls, troubleshooting, and management oversight.

## 10. Data separation by department

The company asked specifically whether each department should have the same system or separate systems.

The current answer is:

- one shared ERP
- one shared database
- separate role-limited access by department

This is the recommended operating model because it gives:

- one source of truth
- less duplication
- less reconciliation work
- cleaner order-to-invoice-to-delivery flow
- better audit trail

It also reduces the risk of information spreading informally through spreadsheets or off-system workarounds.

## 11. Safety assessment: current state

### What is already reasonably safe

- passwords for new accounts are hashed
- live login page no longer publishes demo credentials
- Admin-only account creation is in place
- signed server-managed sessions are in place
- self-service password change is in place
- admin password reset is in place
- admin deactivate/reactivate control is in place
- first-password-change flag is in place
- temporary login lockout is in place
- sample-account retirement is in place
- privileged-access review recording is in place
- route-based access restrictions are enforced
- payroll handoff is logged
- first-admin bootstrap avoids risky production seeding
- build and deployment path are stable on Vercel and Supabase

### What is improved but still transitional

- legacy demo accounts can still exist if they were created before the hashing upgrade
- those accounts are upgraded to hashed storage only after successful login
- supplier integrations and outbound messaging providers are not yet connected
- Power BI and external reporting should use a separate read-only reporting path, not the app user

### What is not yet fully hardened

- no multi-factor authentication yet
- no IP-based or gateway-based rate limiting yet
- no dedicated field-level encryption for highly sensitive employee finance data yet
- no object-storage archive yet for future POD attachments or dispatch files

## 12. Recommended next security steps

To improve the company’s confidence in data and employee safety, these are the best next actions:

### Highest priority

- replace all temporary passwords with strong unique ones
- retire any remaining demo/sample accounts in each environment
- set a strong private `SESSION_SECRET` in Vercel production

### Strongly recommended after that

- add IP-based rate limiting at the edge or application gateway
- add multi-factor authentication for Admin and Finance
- add periodic access review discipline around who can see Finance and HR areas
- add field-level protection for sensitive payroll banking data if the company will store it

### Operational and governance recommendations

- define who is allowed to create users
- define who approves payroll
- define who can reopen or correct payroll runs
- enable database backups in Supabase
- define user offboarding process for departing employees
- document incident response steps for lost credentials

## 13. Safety of company data and employees: plain-language answer

If the company asks, "Is our data safe right now?", the honest answer is:

The system is now reasonably protected for an early production internal rollout, especially compared to its initial development state. Department access control is working, passwords for new accounts are hashed, and sensitive workflows such as payroll and finance are restricted by role.

If the company asks, "Is it fully enterprise-secure yet?", the honest answer is:

Not yet. It still needs the next round of hardening around password lifecycle, stronger session management, account recovery/reset controls, and stricter login defenses.

If the company asks, "Can employees see what they are not supposed to see?", the answer is:

Not by default. The system is designed so that each department is limited to what it needs, and Admin is the only role with full visibility. The remaining risk is mostly administrative: if wrong roles are assigned, access can become too broad.

## 14. Files most relevant to this work

The core implementation and security changes are mainly in:

- `app/login/page.tsx`
- `app/account/security/page.tsx`
- `app/payroll/page.tsx`
- `app/settings/page.tsx`
- `app/setup/admin/page.tsx`
- `lib/actions.ts`
- `lib/passwords.ts`
- `lib/permissions.ts`
- `lib/services.ts`
- `lib/session.ts`
- `prisma/seed.ts`
- `README.md`
- `DEPLOYMENT_GUIDE.md`

## 15. Conclusion

The platform has moved from a demo-oriented ERP starter into a functioning operational system with meaningful access control and improved password safety. It is ready for controlled departmental rollout, but it should still go through one more hardening phase before the company treats it as fully mature for long-term production security.

The next practical milestone should be:

- user password change flow
- admin user reset/deactivation tools
- stronger session management
- removal or retirement of sample/demo users
