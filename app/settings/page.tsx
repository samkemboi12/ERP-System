import { AppShell } from "@/components/shell";
import { FormGrid, Input, Section, Select, SubmitButton, Table } from "@/components/ui";
import {
  adminResetUserPasswordAction,
  createManagedUserAccountAction,
  populateStarterOperationalDataAction,
  recordPrivilegedAccessReviewAction,
  retireSampleAccountsAction,
  toggleUserActiveStateAction
} from "@/lib/actions";
import { getCollections, getSecurityReviewData, getUserDirectory } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatDateTime, slugLabel } from "@/lib/utils";

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Promise<{
    retired?: string;
    reviewed?: string;
    starterLoaded?: string;
    userCreated?: string;
    userDeactivated?: string;
    userError?: string;
    userReactivated?: string;
    userReset?: string;
  }>;
}) {
  const user = await requireRouteAccess("/settings");
  const [{ settings, templates, auditLogs }, users, securityData, params] = await Promise.all([
    getCollections(),
    getUserDirectory(),
    getSecurityReviewData(),
    searchParams
  ]);

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6">
        {params?.userCreated ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Department account created successfully. Share the temporary password securely, then ask the staff member to change it immediately.
          </div>
        ) : null}

        {params?.userReset ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Password reset completed. The user must change that temporary password after the next login.
          </div>
        ) : null}

        {params?.userDeactivated ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            User account deactivated and active sessions cleared.
          </div>
        ) : null}

        {params?.userReactivated ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            User account reactivated successfully.
          </div>
        ) : null}

        {params?.reviewed ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Privileged Finance and HR access review has been recorded.
          </div>
        ) : null}

        {typeof params?.retired !== "undefined" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Retired {params.retired} sample account(s). Any matching sample sessions were signed out.
          </div>
        ) : null}

        {params?.starterLoaded ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Starter operational examples loaded successfully. Categories, products, customers, invoice flow, delivery proof, and payroll examples are now available without altering your existing accounts.
          </div>
        ) : null}

        {params?.userError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.userError}</div>
        ) : null}

        <Section eyebrow="Configuration" title="Operational settings and communication templates">
          <div className="grid gap-6 xl:grid-cols-2">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map((setting) => (
                    <tr key={setting.id}>
                      <td>{setting.key}</td>
                      <td>{setting.value}</td>
                      <td>{formatDateTime(setting.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>

            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-600">{template.channel}</p>
                  <p className="mt-2 font-medium">{template.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{template.triggerEvent}</p>
                  <p className="mt-2 text-sm text-slate-500">{template.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section eyebrow="Governance" title="Audit trail">
          <Table>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>{log.user?.fullName ?? "System"}</td>
                    <td>{log.action}</td>
                    <td>{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        </Section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Section
            eyebrow="Access control"
            title="Department user directory"
            description="Admin controls who gets into the ERP. Every department uses the same system, but each account is restricted by role."
          >
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Must change</th>
                    <th>Last login</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((account) => (
                    <tr key={account.id}>
                      <td>{account.fullName}</td>
                      <td>{account.email}</td>
                      <td>{slugLabel(account.role)}</td>
                      <td>{account.staff?.department ?? "Unassigned"}</td>
                      <td>{account.mustChangePassword ? "Yes" : "No"}</td>
                      <td>{account.lastLoginAt ? formatDateTime(account.lastLoginAt) : "Never"}</td>
                      <td>{account.isActive ? "Active" : "Inactive"}</td>
                      <td>{formatDateTime(account.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          </Section>

          <Section
            eyebrow="Admin tools"
            title="Create department account"
            description="This creates both the login account and the linked staff profile so payroll, delivery assignment, and reporting stay connected."
          >
            <form action={createManagedUserAccountAction} className="space-y-4">
              <FormGrid>
                <div>
                  <label htmlFor="fullName">Full name</label>
                  <Input id="fullName" name="fullName" placeholder="Janet Wanjiru" required />
                </div>
                <div>
                  <label htmlFor="email">Work email</label>
                  <Input id="email" name="email" placeholder="janet@yourcompany.com" required type="email" />
                </div>
                <div>
                  <label htmlFor="role">Role</label>
                  <Select id="role" name="role" required>
                    <option value="SALES">Sales</option>
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="DELIVERY">Delivery</option>
                    <option value="HR">HR</option>
                    <option value="FINANCE">Finance</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </Select>
                </div>
                <div>
                  <label htmlFor="password">Temporary password</label>
                  <Input id="password" name="password" placeholder="Choose a strong starter password" required type="password" />
                </div>
                <div>
                  <label htmlFor="employeeCode">Employee code</label>
                  <Input id="employeeCode" name="employeeCode" placeholder="Leave blank to auto-generate" />
                </div>
                <div>
                  <label htmlFor="department">Department</label>
                  <Input id="department" name="department" placeholder="Sales" required />
                </div>
                <div>
                  <label htmlFor="title">Job title</label>
                  <Input id="title" name="title" placeholder="Account Executive" required />
                </div>
                <div>
                  <label htmlFor="branch">Branch</label>
                  <Input id="branch" name="branch" placeholder="Nairobi HQ" required />
                </div>
                <div>
                  <label htmlFor="phone">Phone</label>
                  <Input id="phone" name="phone" placeholder="+2547..." required />
                </div>
                <div>
                  <label htmlFor="monthlySalary">Monthly salary</label>
                  <Input id="monthlySalary" min="0" name="monthlySalary" placeholder="85000" required type="number" />
                </div>
                <div>
                  <label htmlFor="employmentStartDate">Start date</label>
                  <Input id="employmentStartDate" name="employmentStartDate" required type="date" />
                </div>
                <div>
                  <label htmlFor="employmentStatus">Status</label>
                  <Select defaultValue="Active" id="employmentStatus" name="employmentStatus">
                    <option value="Active">Active</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Probation">Probation</option>
                    <option value="Suspended">Suspended</option>
                  </Select>
                </div>
              </FormGrid>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Temporary passwords are hashed before storage. Share them privately and require the employee to replace them with a unique password after first login.
              </div>

              <SubmitButton>Create account</SubmitButton>
            </form>
          </Section>
        </section>

        <Section
          eyebrow="Access review"
          title="Privileged role review"
          description="These are the accounts with access to Admin, Finance, or HR functions. Record a periodic review so the company can confirm only the right people still hold privileged access."
        >
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {securityData.privilegedUsers.map((account) => (
                    <tr key={account.id}>
                      <td>{account.fullName}</td>
                      <td>{account.email}</td>
                      <td>{slugLabel(account.role)}</td>
                      <td>{account.staff?.department ?? "Unassigned"}</td>
                      <td>{account.isActive ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-ink">Last recorded review</p>
                <p className="mt-2">
                  {securityData.lastReviewedAt
                    ? `${formatDateTime(securityData.lastReviewedAt)} by ${securityData.lastReviewedBy ?? "Unknown reviewer"}`
                    : "No privileged access review has been recorded yet."}
                </p>
              </div>

              <form action={recordPrivilegedAccessReviewAction}>
                <SubmitButton>Record access review</SubmitButton>
              </form>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Recommended practice: review Admin, Finance, and HR access at least once every month and whenever an employee changes department or leaves the company.
              </div>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Lifecycle control"
          title="Account resets, activation, and sample-account retirement"
          description="Use these controls to replace temporary passwords, suspend access safely, and retire any old sample accounts left from early setup."
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <form action={populateStarterOperationalDataAction}>
              <SubmitButton>Load starter examples</SubmitButton>
            </form>
            <form action={retireSampleAccountsAction}>
              <SubmitButton>Retire sample accounts</SubmitButton>
            </form>
            <div className="text-sm text-slate-500">
              Detected sample accounts: {securityData.sampleUsers.length}
            </div>
          </div>

          <div className="grid gap-4">
            {users.map((account) => (
              <div key={account.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="font-medium text-ink">{account.fullName}</p>
                    <p className="text-sm text-slate-500">
                      {account.email} · {slugLabel(account.role)} · {account.isActive ? "Active" : "Inactive"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Last login: {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : "Never"} · Password change required:{" "}
                      {account.mustChangePassword ? "Yes" : "No"}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <form action={adminResetUserPasswordAction} className="flex flex-wrap items-end gap-3">
                      <Input name="userId" type="hidden" value={account.id} />
                      <div>
                        <label htmlFor={`reset-${account.id}`}>Temporary password</label>
                        <Input id={`reset-${account.id}`} name="newPassword" placeholder="Strong temporary password" required type="password" />
                      </div>
                      <SubmitButton>Reset password</SubmitButton>
                    </form>

                    {account.id !== user.id ? (
                      <form action={toggleUserActiveStateAction}>
                        <Input name="nextState" type="hidden" value={account.isActive ? "inactive" : "active"} />
                        <Input name="userId" type="hidden" value={account.id} />
                        <SubmitButton>{account.isActive ? "Deactivate" : "Reactivate"}</SubmitButton>
                      </form>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        Current admin session cannot deactivate itself here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
