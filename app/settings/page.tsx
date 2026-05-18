import { AppShell } from "@/components/shell";
import { FormGrid, Input, Section, Select, SubmitButton, Table } from "@/components/ui";
import { createManagedUserAccountAction } from "@/lib/actions";
import { getCollections, getUserDirectory } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatDateTime, slugLabel } from "@/lib/utils";

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ userCreated?: string; userError?: string }>;
}) {
  const user = await requireRouteAccess("/settings");
  const [{ settings, templates, auditLogs }, users, params] = await Promise.all([
    getCollections(),
    getUserDirectory(),
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
      </div>
    </AppShell>
  );
}
