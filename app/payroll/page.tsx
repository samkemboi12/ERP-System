import { AppShell } from "@/components/shell";
import { Section, Table } from "@/components/ui";
import { getPayrollData } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, formatDate, slugLabel } from "@/lib/utils";

export default async function PayrollPage() {
  const user = await requireRouteAccess("/payroll");
  const { latestRun, runs } = await getPayrollData();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6">
        <Section
          eyebrow="Payroll"
          title="Functional payroll with statutory deductions"
          description="This sample payroll includes PAYE, SHIF, NSSF, and Housing Levy breakdowns for every employee in the run."
        >
          {latestRun ? (
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Gross</th>
                    <th>PAYE</th>
                    <th>SHIF</th>
                    <th>NSSF</th>
                    <th>Housing</th>
                    <th>Total Deductions</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {latestRun.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.staff.title}</td>
                      <td>{formatCurrency(Number(item.grossPay))}</td>
                      <td>{formatCurrency(Number(item.paye))}</td>
                      <td>{formatCurrency(Number(item.shif))}</td>
                      <td>{formatCurrency(Number(item.nssfEmployee))}</td>
                      <td>{formatCurrency(Number(item.housingLevy))}</td>
                      <td>{formatCurrency(Number(item.totalDeductions))}</td>
                      <td>{formatCurrency(Number(item.netPay))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          ) : null}
        </Section>

        <Section eyebrow="Run history" title="Payroll runs">
          <Table>
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Gross</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.label}</td>
                    <td>
                      {formatDate(run.periodStart)} - {formatDate(run.periodEnd)}
                    </td>
                    <td>{slugLabel(run.status)}</td>
                    <td>{formatCurrency(Number(run.totalGross))}</td>
                    <td>{formatCurrency(Number(run.totalNet))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        </Section>
      </div>
    </AppShell>
  );
}
