import { AppShell } from "@/components/shell";
import { Section, Table } from "@/components/ui";
import { getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, formatDate, slugLabel } from "@/lib/utils";

export default async function StaffPage() {
  const user = await requireRouteAccess("/staff");
  const { staff, commissionRules, appraisals } = await getCollections();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6">
        <Section eyebrow="People" title="Department staff directory">
          <Table>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Salary</th>
                  <th>Start Date</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td>{member.employeeCode}</td>
                    <td>{member.department}</td>
                    <td>{member.title}</td>
                    <td>{formatCurrency(Number(member.monthlySalary))}</td>
                    <td>{formatDate(member.employmentStartDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        </Section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Section eyebrow="Sales incentives" title="Commission rules">
            <div className="space-y-3">
              {commissionRules.map((rule) => (
                <div key={rule.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-slate-500">
                    {rule.roleLabel} - {rule.type} at {Number(rule.value)}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section eyebrow="Performance" title="Recent appraisals">
            <div className="space-y-3">
              {appraisals.map((appraisal) => (
                <div key={appraisal.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-medium">{appraisal.staff.title}</p>
                  <p className="text-sm text-slate-500">{appraisal.reviewPeriod}</p>
                  <p className="mt-2 text-sm text-slate-500">Score: {appraisal.score}%</p>
                </div>
              ))}
            </div>
          </Section>
        </section>
      </div>
    </AppShell>
  );
}
