import { AppShell } from "@/components/shell";
import { Section, Table } from "@/components/ui";
import { getReportsData } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, formatDate, slugLabel } from "@/lib/utils";

export default async function ReportsPage() {
  const user = await requireRouteAccess("/reports");
  const data = await getReportsData();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6">
        <Section eyebrow="Analytics" title="Commercial and finance reports">
          <div className="grid gap-6 xl:grid-cols-2">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customerRanking.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>

            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Customer</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.reference}</td>
                      <td>{payment.invoice.customer.name}</td>
                      <td>{formatCurrency(Number(payment.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          </div>
        </Section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Section eyebrow="Payroll" title="Payroll runs">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Status</th>
                    <th>Gross</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payrollRuns.map((run) => (
                    <tr key={run.id}>
                      <td>{run.label}</td>
                      <td>{slugLabel(run.status)}</td>
                      <td>{formatCurrency(Number(run.totalGross))}</td>
                      <td>{formatCurrency(Number(run.totalNet))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          </Section>

          <Section eyebrow="Performance" title="Recent appraisals">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Period</th>
                    <th>Score</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.appraisals.map((appraisal) => (
                    <tr key={appraisal.id}>
                      <td>{appraisal.staff.title}</td>
                      <td>{appraisal.reviewPeriod}</td>
                      <td>{appraisal.score}%</td>
                      <td>{formatDate(appraisal.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          </Section>
        </section>
      </div>
    </AppShell>
  );
}
